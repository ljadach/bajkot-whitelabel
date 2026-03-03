'use node';
import { action, internalAction } from '../_generated/server';
import { api, internal } from '../_generated/api';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { assertAdmin } from '../lib/roles';
import { assertBulkLimit } from '../lib/adminGuards';
import { extractGoogleDriveFileId, processFullVideo, buildChunkConfig } from '../lib/videoProcessing';
import { extractFolderId as gdriveExtractFolderId, listVideosInFolder as gdriveListVideos, compareWithExisting as gdriveCompare, downloadFile as gdriveDownloadFile, type SyncResult } from '../lib/googleDrive';
import * as cloudflareStream from '../lib/cloudflareStream';

// ── Local helpers ─────────────────────────────────────────────

interface VideoRecord {
  googleDriveFileId?: string;
  sourceUrl?: string;
}

function resolveGdriveFileId(video: VideoRecord): string {
  const fileId = video.googleDriveFileId ?? (video.sourceUrl ? extractGoogleDriveFileId(video.sourceUrl) : null);
  if (!fileId) {
    throw new Error('No Google Drive file ID or source URL with extractable file ID');
  }
  return fileId;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} not set in Convex environment`);
  return value;
}

function getCloudflareCredentials(): { accountId: string; apiToken: string } | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

// ── Constants ────────────────────────────────────────────────
// Node.js actions run with 512 MB RAM. Downloading + uploading a file
// requires ~2-3x the file size in peak memory (old buffer + new chunk +
// combined buffer during concatenation). 70 MB keeps us safely within limits.
export const MAX_VIDEO_SIZE_BYTES = 70 * 1024 * 1024; // 70 MB

// ── Actions (Node.js runtime — 512 MB RAM) ────────────────────

/**
 * Process a video with Gemini native video input to extract UI interaction segments.
 * Downloads video from Google Drive, processes in time-window chunks with overlap,
 * merges results, and stores segments in DB.
 */
export const processVideo = action({
  args: { videoId: v.id('pipelineVideos') },
  returns: v.object({ cloudflareOk: v.boolean() }),
  handler: async (ctx, { videoId }) => {
    const { subject: actor } = await assertAdmin(ctx);

    const currentVideo = await ctx.runQuery(internal.admin.videos._getByIdInternal, { videoId });
    if (currentVideo?.status === 'processing') {
      throw new Error('Video is already being processed. Wait for current processing to finish.');
    }

    // Guard: reject files that would OOM the 512 MB Node.js runtime
    if (currentVideo?.fileSizeBytes && currentVideo.fileSizeBytes > MAX_VIDEO_SIZE_BYTES) {
      const sizeMB = (currentVideo.fileSizeBytes / (1024 * 1024)).toFixed(1);
      const limitMB = (MAX_VIDEO_SIZE_BYTES / (1024 * 1024)).toFixed(0);
      throw new Error(`Video too large (${sizeMB} MB). Maximum supported size is ${limitMB} MB. ` + `Split the video into smaller parts before processing.`);
    }

    await ctx.runMutation(internal.admin.videos.updateStatus, {
      videoId,
      status: 'processing',
    });

    try {
      const video = await ctx.runQuery(internal.admin.videos._getByIdInternal, { videoId });
      if (!video) throw new Error('Video not found');

      const fileId = resolveGdriveFileId(video);

      // Load admin config for processing parameters
      const configKeys = ['llm_model', 'min_segment_duration', 'max_segment_duration', 'processing_chunk_minutes', 'processing_overlap_seconds', 'extraction_mode'];
      const adminConfig: Record<string, string | null> = {};
      for (const key of configKeys) {
        adminConfig[key] = await ctx.runQuery(internal.admin.config.getInternal, { key });
      }

      // Process video with Gemini
      const result = await processFullVideo(fileId, video.fileName, video.durationSeconds, buildChunkConfig(adminConfig), {
        ctx,
        clerkUserId: actor,
      });

      // Store segments
      await ctx.runMutation(internal.admin.videos.insertSegments, {
        videoId,
        segments: result.segments.map((seg) => ({
          start: seg.start,
          end: seg.end,
          description: seg.description,
          metadata: JSON.stringify({
            id: seg.id,
            ...(seg.metadata ?? {}),
          }),
        })),
      });

      // Upload to Cloudflare Stream for playback (non-fatal if it fails)
      let streamUid: string | undefined;
      let cfError: string | undefined;
      const cfCreds = getCloudflareCredentials();

      if (cfCreds) {
        try {
          const googleApiKey = requireEnv('GOOGLE_API_KEY');
          const videoBuffer = await gdriveDownloadFile(fileId, googleApiKey);
          const uploaded = await cloudflareStream.uploadVideo(videoBuffer, video.fileName, cfCreds.accountId, cfCreds.apiToken);
          streamUid = uploaded.uid;
          console.log(`[processVideo] Cloudflare Stream upload OK: uid=${streamUid}`);
        } catch (cfErr) {
          cfError = cfErr instanceof Error ? cfErr.message : String(cfErr);
          console.warn(`[processVideo] Cloudflare Stream upload failed (non-fatal):`, cfError);
        }
      } else {
        cfError = 'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN not set in Convex env';
        console.log(`[processVideo] Cloudflare Stream not configured — skipping upload`);
      }

      await ctx.runMutation(internal.admin.videos.updateStatus, {
        videoId,
        status: 'processed',
        toolDetected: result.tool_detected,
        uiVersion: result.ui_version,
        cloudflareStreamUid: streamUid,
        cloudflareError: cfError,
      });
      return { cloudflareOk: !!streamUid };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const errorStack = e instanceof Error ? e.stack : undefined;
      console.error(`[processVideo] FAILED videoId=${videoId}:\n` + `  message: ${errorMsg}\n` + `  stack: ${errorStack ?? 'n/a'}`);
      await ctx.runMutation(internal.admin.videos.updateStatus, {
        videoId,
        status: 'failed',
        error: errorMsg.slice(0, 1000),
      });
    }
    return { cloudflareOk: false };
  },
});

/**
 * Sync videos from Google Drive folder.
 */
export const syncFromGoogleDrive = action({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      fileName: v.string(),
      fileId: v.string(),
      mimeType: v.string(),
      sizeBytes: v.number(),
      durationSeconds: v.optional(v.number()),
      sourceUrl: v.string(),
      fileHash: v.string(),
      isNew: v.boolean(),
    })
  ),
  handler: async (ctx): Promise<SyncResult[]> => {
    await assertAdmin(ctx);

    const folderUrl = await ctx.runQuery(internal.admin.config.getInternal, { key: 'google_drive_url' });
    if (!folderUrl) {
      throw new Error('Google Drive folder URL not configured. Set it in Pipeline Config.');
    }

    const folderId = gdriveExtractFolderId(folderUrl);
    if (!folderId) {
      throw new Error(`Cannot extract folder ID from URL: ${folderUrl}`);
    }

    const googleApiKey = requireEnv('GOOGLE_API_KEY');
    const driveFiles = await gdriveListVideos(folderId, googleApiKey);

    const existingVideos = await ctx.runQuery(api.admin.videos.list, {});
    const existingHashes = new Set(existingVideos.map((vid) => vid.fileHash));

    return gdriveCompare(driveFiles, existingHashes);
  },
});

/**
 * Bulk-add videos from sync results (add all new ones to pipeline).
 */
export const bulkAddFromSync = action({
  args: {
    files: v.array(
      v.object({
        fileName: v.string(),
        fileId: v.string(),
        sourceUrl: v.string(),
        durationSeconds: v.optional(v.number()),
        sizeBytes: v.number(),
      })
    ),
  },
  returns: v.array(v.id('pipelineVideos')),
  handler: async (ctx, { files }) => {
    await assertAdmin(ctx);
    assertBulkLimit(files, 'files');

    const ids: Id<'pipelineVideos'>[] = [];
    for (const file of files) {
      const id = await ctx.runMutation(api.admin.videos.add, {
        fileName: file.fileName,
        sourceUrl: file.sourceUrl,
        googleDriveFileId: file.fileId,
        durationSeconds: file.durationSeconds,
        fileSizeBytes: file.sizeBytes,
      });
      ids.push(id);
    }
    return ids;
  },
});

/**
 * Upload an already-processed video to Cloudflare Stream (backfill for existing videos).
 */
export const uploadToCloudflare = action({
  args: { videoId: v.id('pipelineVideos') },
  returns: v.null(),
  handler: async (ctx, { videoId }) => {
    await assertAdmin(ctx);

    const video = await ctx.runQuery(api.admin.videos.getById, { videoId });
    if (!video) throw new Error('Video not found');

    const cfCreds = getCloudflareCredentials();
    if (!cfCreds) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN must be set in Convex environment');
    }

    const fileId = resolveGdriveFileId(video);
    const googleApiKey = requireEnv('GOOGLE_API_KEY');

    const videoBuffer = await gdriveDownloadFile(fileId, googleApiKey);
    const uploaded = await cloudflareStream.uploadVideo(videoBuffer, video.fileName, cfCreds.accountId, cfCreds.apiToken);

    await ctx.runMutation(internal.admin.videos.updateStatus, {
      videoId,
      status: video.status,
      cloudflareStreamUid: uploaded.uid,
      cloudflareError: undefined,
    });

    console.log(`[uploadToCloudflare] Done: ${video.fileName} → uid=${uploaded.uid}`);
    return null;
  },
});

// Internal version for CLI backfill via `npx convex run`
export const _backfillCloudflare = internalAction({
  args: { videoId: v.id('pipelineVideos') },
  returns: v.null(),
  handler: async (ctx, { videoId }) => {
    const video = await ctx.runQuery(internal.admin.videos._getByIdInternal, { videoId });
    if (!video) throw new Error('Video not found');

    const cfCreds = getCloudflareCredentials();
    if (!cfCreds) throw new Error('CF credentials not set');

    const fileId = resolveGdriveFileId(video);
    const googleApiKey = requireEnv('GOOGLE_API_KEY');

    const videoBuffer = await gdriveDownloadFile(fileId, googleApiKey);
    const uploaded = await cloudflareStream.uploadVideo(videoBuffer, video.fileName, cfCreds.accountId, cfCreds.apiToken);

    await ctx.runMutation(internal.admin.videos.updateStatus, {
      videoId,
      status: video.status,
      cloudflareStreamUid: uploaded.uid,
    });

    console.log(`[_backfillCloudflare] Done: ${video.fileName} → uid=${uploaded.uid}`);
    return null;
  },
});

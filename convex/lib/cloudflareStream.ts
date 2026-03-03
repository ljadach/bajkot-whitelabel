/**
 * Cloudflare Stream API client for video upload, status polling, and playback URL construction.
 *
 * API docs: https://developers.cloudflare.com/stream/
 * Uses direct creator upload (max 200MB) — sufficient for tutorial screencasts.
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

// ── Types ──────────────────────────────────────────────────────

export interface CloudflareStreamVideo {
  uid: string;
  status: { state: 'queued' | 'inprogress' | 'ready' | 'error'; errorReasonCode?: string; errorReasonText?: string };
  playback: { hls: string; dash: string };
  preview: string;
  duration: number;
  size: number;
}

interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
}

// ── Helpers ────────────────────────────────────────────────────

function streamUrl(accountId: string, path = ''): string {
  return `${CF_API_BASE}/accounts/${accountId}/stream${path}`;
}

async function parseResponse<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Cloudflare Stream ${label} failed (${response.status}): ${errorText.slice(0, 500)}`);
  }

  const data = (await response.json()) as CloudflareApiResponse<T>;
  if (!data.success) {
    throw new Error(`Cloudflare Stream ${label} error: ${data.errors.map((e) => e.message).join(', ')}`);
  }

  return data.result;
}

// ── Upload ─────────────────────────────────────────────────────

/**
 * Upload a video buffer to Cloudflare Stream via direct creator upload.
 * Returns the Stream video UID and initial status.
 */
export async function uploadVideo(videoBuffer: Uint8Array, fileName: string, accountId: string, apiToken: string): Promise<CloudflareStreamVideo> {
  const sizeMb = (videoBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`[cloudflareStream] uploading ${fileName} (${sizeMb} MB)`);

  const formData = new FormData();
  formData.append('file', new Blob([videoBuffer as BlobPart], { type: 'video/mp4' }), fileName);

  const response = await fetch(streamUrl(accountId), {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}` },
    body: formData,
  });

  const result = await parseResponse<CloudflareStreamVideo>(response, 'upload');
  console.log(`[cloudflareStream] uploaded → uid=${result.uid} state=${result.status.state}`);
  return result;
}

// ── Status polling ─────────────────────────────────────────────

/**
 * Get current status of a Cloudflare Stream video.
 */
export async function getVideoStatus(videoUid: string, accountId: string, apiToken: string): Promise<CloudflareStreamVideo> {
  const response = await fetch(streamUrl(accountId, `/${videoUid}`), {
    headers: { Authorization: `Bearer ${apiToken}` },
  });

  return parseResponse<CloudflareStreamVideo>(response, 'status check');
}

/**
 * Poll until video is ready for playback. Throws on error or timeout.
 */
export async function waitForReady(
  videoUid: string,
  accountId: string,
  apiToken: string,
  maxWaitMs = 300000 // 5 minutes — Cloudflare encodes fast
): Promise<CloudflareStreamVideo> {
  console.log(`[cloudflareStream] waiting for ${videoUid} to be ready...`);
  const start = Date.now();
  let pollCount = 0;

  while (Date.now() - start < maxWaitMs) {
    pollCount++;
    const video = await getVideoStatus(videoUid, accountId, apiToken);

    if (video.status.state === 'ready') {
      console.log(`[cloudflareStream] ${videoUid} ready after ${pollCount} polls`);
      return video;
    }

    if (video.status.state === 'error') {
      throw new Error(`Cloudflare Stream encoding failed: ${video.status.errorReasonText ?? video.status.errorReasonCode ?? 'unknown'}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(`Timeout waiting for Cloudflare Stream video ${videoUid} to be ready (${pollCount} polls)`);
}

// ── Delete ─────────────────────────────────────────────────────

export async function deleteVideo(videoUid: string, accountId: string, apiToken: string): Promise<void> {
  const response = await fetch(streamUrl(accountId, `/${videoUid}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiToken}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Cloudflare Stream delete failed (${response.status})`);
  }

  console.log(`[cloudflareStream] deleted ${videoUid}`);
}

// ── Playback URLs ──────────────────────────────────────────────

/**
 * Construct Cloudflare Stream iframe embed URL with optional segment boundaries.
 * Supports startTime/endTime for segment-scoped playback.
 */
export function getIframeUrl(customerSubdomain: string, videoUid: string, options?: { startTime?: number; endTime?: number; loop?: boolean; autoplay?: boolean; muted?: boolean }): string {
  const base = `https://customer-${customerSubdomain}.cloudflarestream.com/${videoUid}/iframe`;
  const params = new URLSearchParams();

  if (options?.startTime !== undefined) params.set('startTime', String(options.startTime));
  if (options?.endTime !== undefined) params.set('endTime', String(options.endTime));
  if (options?.loop) params.set('loop', 'true');
  if (options?.autoplay) params.set('autoplay', 'true');
  if (options?.muted) params.set('muted', 'true');

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Construct HLS manifest URL for use with <video> + hls.js.
 */
export function getHlsUrl(customerSubdomain: string, videoUid: string): string {
  return `https://customer-${customerSubdomain}.cloudflarestream.com/${videoUid}/manifest/video.m3u8`;
}

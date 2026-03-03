import { startActiveObservation, Observation } from './langfuse';
import { renderPrompt, PromptTemplate } from './prompts';
import { stripCodeFences, tryExtractJson } from './jsonUtils';
import { uploadFile as geminiUploadFile, waitForFileActive as geminiWaitForActive, generateContent as geminiGenerateContent } from './geminiClient';
import { downloadFile as gdriveDownloadFile } from './googleDrive';

// ── Types ──────────────────────────────────────────────────────

export interface VideoSegmentMetadata {
  action_type?: string;
  ui_element?: string;
  feature_area?: string;
  input_text?: string | null;
  keyboard_shortcut?: string | null;
  result_description?: string;
  teaching_value?: string;
  skill_category?: string;
  difficulty_level?: string;
}

export interface VideoSegment {
  id: string;
  start: number;
  end: number;
  description: string;
  metadata?: VideoSegmentMetadata;
}

export interface VideoSegmentResult {
  tool_detected: string;
  ui_version: string;
  segments: VideoSegment[];
}

export interface ChunkConfig {
  chunkMinutes: number;
  overlapSeconds: number;
  minSegmentSeconds: number;
  maxSegmentSeconds: number;
  model: string; // Gemini model name (e.g., gemini-2.0-flash-001)
  extractionMode: string; // 'interactions' | 'teaching'
}

export interface ProcessingChunk {
  startSeconds: number;
  endSeconds: number;
  index: number;
  total: number;
}

export interface VideoProcessingLogContext {
  ctx: { runMutation: <T>(fn: any, args: any) => Promise<T> };
  clerkUserId: string;
}

// ── Default config ─────────────────────────────────────────────

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_CHUNK_MINUTES = 5;
const DEFAULT_OVERLAP_SECONDS = 30;

// ── Chunk calculation ──────────────────────────────────────────

export function calculateChunks(durationSeconds: number, config: ChunkConfig): ProcessingChunk[] {
  const chunkDuration = config.chunkMinutes * 60;
  const overlap = config.overlapSeconds;

  if (durationSeconds <= chunkDuration) {
    return [{ startSeconds: 0, endSeconds: durationSeconds, index: 0, total: 1 }];
  }

  const chunks: ProcessingChunk[] = [];
  let start = 0;
  while (start < durationSeconds) {
    const end = Math.min(start + chunkDuration, durationSeconds);
    chunks.push({ startSeconds: start, endSeconds: end, index: chunks.length, total: 0 });
    if (end >= durationSeconds) break;
    start = end - overlap;
  }

  for (const chunk of chunks) {
    chunk.total = chunks.length;
  }

  return chunks;
}

// ── Google Drive helpers ───────────────────────────────────────

export function extractGoogleDriveFileId(url: string): string | null {
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/folders\/([a-zA-Z0-9_-]+)/];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ── Single chunk processing ────────────────────────────────────

async function processVideoChunk(fileUri: string, fileMimeType: string, videoFileName: string, chunk: ProcessingChunk, config: ChunkConfig, apiKey: string, logContext: VideoProcessingLogContext, durationSeconds?: number): Promise<VideoSegmentResult> {
  return startActiveObservation<VideoSegmentResult>(
    'videoProcessing.processChunk',
    async (span: Observation) => {
      span.update({
        action: 'processVideoChunk',
        chunk_index: chunk.index,
        chunk_total: chunk.total,
        start_seconds: chunk.startSeconds,
        end_seconds: chunk.endSeconds,
        model: config.model,
      });

      const isTeaching = config.extractionMode === 'teaching';
      const systemTemplate = isTeaching ? PromptTemplate.VideoTeachingSegmentSystem : PromptTemplate.VideoSegmentExtractionSystem;
      const userTemplate = isTeaching ? PromptTemplate.VideoTeachingSegmentUser : PromptTemplate.VideoSegmentExtractionUser;

      const systemPrompt = await renderPrompt(systemTemplate, {
        MIN_SEGMENT_SECONDS: String(config.minSegmentSeconds),
        MAX_SEGMENT_SECONDS: String(config.maxSegmentSeconds),
      });

      const durationHint =
        durationSeconds !== undefined && durationSeconds > 0
          ? `\n\nCRITICAL: The video is ${Math.round(durationSeconds)} seconds (${fmtTime(durationSeconds)}) long. Do NOT generate any segments with timestamps beyond ${fmtTime(durationSeconds)}. Any interaction after ${fmtTime(durationSeconds)} does not exist.`
          : '';

      const timeRange =
        chunk.total > 1 ? `Focus ONLY on the time range ${fmtTime(chunk.startSeconds)} to ${fmtTime(chunk.endSeconds)}. Ignore content outside this range. Use absolute timestamps (from video start, not chunk start).${durationHint}` : `Analyze the entire video.${durationHint}`;

      const userPrompt = await renderPrompt(userTemplate, {
        VIDEO_FILE_NAME: videoFileName,
        TIME_RANGE_INSTRUCTION: timeRange,
      });

      span.update({ system_length: systemPrompt.length, user_length: userPrompt.length });

      const startTime = Date.now();

      const response = await geminiGenerateContent(
        {
          model: config.model,
          fileUri,
          fileMimeType,
          systemPrompt,
          userPrompt,
          apiKey,
          temperature: 0.1,
          action: 'processVideoChunk',
        },
        logContext
      );

      const raw = stripCodeFences(response.text);
      span.update({
        finish_reason: response.finishReason,
        output_raw_length: raw.length,
      });

      let parsed: VideoSegmentResult;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const extracted = tryExtractJson(raw);
        if (extracted) {
          try {
            parsed = JSON.parse(extracted);
          } catch {
            // Extracted JSON is truncated — try repair
            const salvaged = repairTruncatedJson(extracted);
            if (salvaged) {
              parsed = salvaged;
              console.warn(`[processVideoChunk] chunk ${chunk.index + 1}/${chunk.total} — repaired truncated JSON, salvaged ${salvaged.segments.length} segments`);
            } else {
              throw new Error(`JSON parse failed after extraction and repair. extracted[0..300]=${extracted.slice(0, 300)}`);
            }
          }
        } else {
          // No JSON-like structure — try repair on raw
          const salvaged = repairTruncatedJson(raw);
          if (salvaged) {
            parsed = salvaged;
            console.warn(`[processVideoChunk] chunk ${chunk.index + 1}/${chunk.total} — repaired truncated JSON from raw, salvaged ${salvaged.segments.length} segments`);
          } else {
            throw new Error('Unable to parse JSON from video analysis response');
          }
        }
      }

      if (!parsed.segments || !Array.isArray(parsed.segments)) {
        throw new Error('Response missing segments array');
      }

      span.update({
        segment_count: parsed.segments.length,
        tool_detected: parsed.tool_detected,
        duration_ms: Date.now() - startTime,
      });

      return parsed;
    },
    { asType: 'generation' }
  );
}

// ── Merge results from multiple chunks ─────────────────────────

export function mergeChunkResults(results: VideoSegmentResult[]): VideoSegmentResult {
  if (results.length === 0) {
    return { tool_detected: 'Unknown', ui_version: 'Unknown', segments: [] };
  }
  if (results.length === 1) {
    return results[0];
  }

  const toolDetected = results[0].tool_detected;
  const uiVersion = results[0].ui_version;

  const allSegments = results.flatMap((r) => r.segments);
  allSegments.sort((a, b) => a.start - b.start);

  // Deduplicate segments in overlap regions (similar timestamps within 0.5s).
  // Keep the segment with richer metadata when deduplicating.
  const merged: VideoSegment[] = [];
  for (const seg of allSegments) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.start - seg.start) < 0.5 && Math.abs(last.end - seg.end) < 0.5) {
      // Prefer the segment with more metadata fields
      const lastMetaCount = last.metadata ? Object.values(last.metadata).filter(Boolean).length : 0;
      const segMetaCount = seg.metadata ? Object.values(seg.metadata).filter(Boolean).length : 0;
      if (segMetaCount > lastMetaCount) {
        merged[merged.length - 1] = seg;
      }
      continue;
    }
    merged.push(seg);
  }

  const reindexed = merged.map((seg, i) => ({
    ...seg,
    id: `seg_${String(i + 1).padStart(3, '0')}`,
  }));

  return { tool_detected: toolDetected, ui_version: uiVersion, segments: reindexed };
}

// ── Main orchestrator ──────────────────────────────────────────

export async function processFullVideo(googleDriveFileId: string, videoFileName: string, durationSeconds: number | undefined, config: ChunkConfig, logContext: VideoProcessingLogContext): Promise<VideoSegmentResult> {
  return startActiveObservation<VideoSegmentResult>(
    'videoProcessing.processFullVideo',
    async (span: Observation) => {
      span.update({
        action: 'processFullVideo',
        video_file: videoFileName,
        drive_file_id: googleDriveFileId,
        duration_seconds: durationSeconds,
        chunk_minutes: config.chunkMinutes,
        overlap_seconds: config.overlapSeconds,
        model: config.model,
      });

      const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!geminiApiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not set in Convex environment.');
      }

      const googleApiKey = process.env.GOOGLE_API_KEY;
      if (!googleApiKey) {
        throw new Error('GOOGLE_API_KEY not set in Convex environment. Required for Google Drive file access.');
      }

      // 1. Download video from Google Drive
      span.update({ phase: 'downloading' });
      const videoBuffer = await gdriveDownloadFile(googleDriveFileId, googleApiKey);
      span.update({
        phase: 'downloaded',
        video_size_mb: (videoBuffer.length / 1024 / 1024).toFixed(1),
      });

      // 2. Upload to Gemini File API (so we don't re-upload per chunk)
      span.update({ phase: 'uploading_to_gemini' });
      const uploadResult = await geminiUploadFile(videoBuffer, videoFileName, geminiApiKey);
      const { name: fileName, uri: fileUri, mimeType: fileMimeType } = uploadResult.file;

      // 3. Wait for Gemini to process the file
      span.update({ phase: 'waiting_for_gemini_processing' });
      await geminiWaitForActive(fileName, geminiApiKey);
      span.update({ phase: 'file_active', gemini_file_uri: fileUri });

      // 4. Calculate chunks (single chunk if duration unknown)
      let chunks: ProcessingChunk[];
      if (durationSeconds !== undefined && durationSeconds > 0) {
        chunks = calculateChunks(durationSeconds, config);
      } else {
        console.warn(`[processFullVideo] durationSeconds unknown for "${videoFileName}" — processing as single chunk without time-range restrictions`);
        chunks = [{ startSeconds: 0, endSeconds: 0, index: 0, total: 1 }];
      }
      span.update({ chunk_count: chunks.length });

      // 5. Process each chunk sequentially
      const results: VideoSegmentResult[] = [];
      for (const chunk of chunks) {
        span.update({ phase: `processing_chunk_${chunk.index + 1}_of_${chunk.total}` });
        const result = await processVideoChunk(fileUri, fileMimeType, videoFileName, chunk, config, geminiApiKey, logContext, durationSeconds);
        results.push(result);
      }

      // 6. Merge results & filter hallucinated timestamps
      const merged = mergeChunkResults(results);
      const validated = filterByDuration(merged, durationSeconds);
      span.update({
        phase: 'complete',
        total_segments: validated.segments.length,
        segments_filtered: merged.segments.length - validated.segments.length,
        tool_detected: validated.tool_detected,
      });

      return validated;
    },
    { asType: 'span' }
  );
}

// ── Post-processing: filter hallucinated timestamps ───────────

/**
 * Remove segments that start beyond the known video duration,
 * and clamp end timestamps that overshoot.
 */
function filterByDuration(result: VideoSegmentResult, durationSeconds?: number): VideoSegmentResult {
  if (durationSeconds === undefined || durationSeconds <= 0) return result;

  const tolerance = 1.0; // allow 1s past end for rounding
  const maxTimestamp = durationSeconds + tolerance;

  const filtered = result.segments
    .filter((seg) => seg.start < maxTimestamp)
    .map((seg) => ({
      ...seg,
      end: Math.min(seg.end, maxTimestamp),
    }));

  if (filtered.length < result.segments.length) {
    console.warn(`[filterByDuration] Removed ${result.segments.length - filtered.length} hallucinated segments beyond ${fmtTime(durationSeconds)}`);
  }

  const reindexed = filtered.map((seg, i) => ({
    ...seg,
    id: `seg_${String(i + 1).padStart(3, '0')}`,
  }));

  return { ...result, segments: reindexed };
}

// ── Config helpers ─────────────────────────────────────────────

export function resolveGeminiModel(adminConfigModel: string | null): string {
  if (!adminConfigModel) return DEFAULT_GEMINI_MODEL;
  if (adminConfigModel.startsWith('gemini-')) return adminConfigModel;
  if (adminConfigModel.startsWith('google/')) return adminConfigModel.replace('google/', '');
  console.warn(`[videoProcessing] Model "${adminConfigModel}" does not support video. Falling back to ${DEFAULT_GEMINI_MODEL}`);
  return DEFAULT_GEMINI_MODEL;
}

export function buildChunkConfig(adminConfig: Record<string, string | null>): ChunkConfig {
  const extractionMode = adminConfig['extraction_mode'] ?? 'interactions';
  const isTeaching = extractionMode === 'teaching';
  return {
    chunkMinutes: Number(adminConfig['processing_chunk_minutes']) || DEFAULT_CHUNK_MINUTES,
    overlapSeconds: Number(adminConfig['processing_overlap_seconds']) || DEFAULT_OVERLAP_SECONDS,
    minSegmentSeconds: Number(adminConfig['min_segment_duration']) || (isTeaching ? 5 : 1.0),
    maxSegmentSeconds: Number(adminConfig['max_segment_duration']) || (isTeaching ? 60 : 120),
    model: resolveGeminiModel(adminConfig['llm_model'] ?? null),
    extractionMode,
  };
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Attempt to salvage a VideoSegmentResult from truncated JSON.
 * Finds the last complete segment object and closes the structure.
 */
function repairTruncatedJson(raw: string): VideoSegmentResult | null {
  const segIdx = raw.indexOf('"segments"');
  if (segIdx === -1) return null;

  const arrStart = raw.indexOf('[', segIdx);
  if (arrStart === -1) return null;

  // Walk backwards to find last complete {...} segment object
  let lastCompleteEnd = -1;
  let braceDepth = 0;
  for (let i = raw.length - 1; i > arrStart; i--) {
    const ch = raw[i];
    if (ch === '}') {
      if (braceDepth === 0) lastCompleteEnd = i;
      braceDepth++;
    } else if (ch === '{') {
      braceDepth--;
      if (braceDepth === 0 && lastCompleteEnd > i) {
        const candidate = raw.slice(i, lastCompleteEnd + 1);
        try {
          const obj = JSON.parse(candidate);
          if (obj.id && typeof obj.start === 'number') {
            const repaired = raw.slice(0, lastCompleteEnd + 1) + '\n  ]\n}';
            try {
              const result = JSON.parse(repaired) as VideoSegmentResult;
              if (result.segments && Array.isArray(result.segments)) {
                return result;
              }
            } catch {
              /* keep searching */
            }
          }
        } catch {
          /* not valid segment */
        }
        lastCompleteEnd = -1;
        braceDepth = 0;
      }
    }
  }
  return null;
}

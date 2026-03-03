/**
 * Google Drive API helpers for listing and syncing video files.
 * Requires GOOGLE_API_KEY environment variable.
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string; // bytes as string
  videoMediaMetadata?: {
    durationMillis?: string;
    width?: number;
    height?: number;
  };
  webViewLink?: string;
}

export interface SyncResult {
  id: string;
  fileName: string;
  fileId: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | undefined;
  sourceUrl: string;
  fileHash: string;
  isNew: boolean; // true if not yet in pipelineVideos
}

/**
 * Extract folder ID from various Google Drive folder URL formats,
 * or accept a raw folder ID string directly.
 */
export function extractFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try URL patterns first
  const patterns = [/\/folders\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  // Accept raw folder ID (alphanumeric, dash, underscore; min 10 chars)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * List video files in a Google Drive folder using the Drive API v3.
 */
export async function listVideosInFolder(folderId: string, apiKey: string): Promise<GoogleDriveFile[]> {
  const query = `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`;
  const fields = 'files(id,name,mimeType,size,videoMediaMetadata,webViewLink)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=100&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Google Drive API error (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  return (data.files ?? []) as GoogleDriveFile[];
}

/**
 * Simple hash matching the one used in videos.ts for dedup.
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

/**
 * Download a file from Google Drive by file ID.
 * Uses the Drive API v3 alt=media endpoint.
 */
export async function downloadFile(fileId: string, apiKey: string): Promise<Uint8Array> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to download video from Google Drive (${response.status}): ${errorText.slice(0, 200)}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Compare Google Drive file list with existing pipeline videos.
 * Returns SyncResult[] with isNew flag indicating which files are new.
 */
export function compareWithExisting(driveFiles: GoogleDriveFile[], existingHashes: Set<string>): SyncResult[] {
  return driveFiles.map((file) => {
    const sizeBytes = parseInt(file.size, 10) || 0;
    const durationMs = file.videoMediaMetadata?.durationMillis ? parseInt(file.videoMediaMetadata.durationMillis, 10) : undefined;
    const durationSeconds = durationMs ? Math.round(durationMs / 1000) : undefined;

    const hashInput = file.name + ':' + String(durationSeconds ?? sizeBytes ?? 0);
    const fileHash = simpleHash(hashInput);

    return {
      id: file.id,
      fileName: file.name,
      fileId: file.id,
      mimeType: file.mimeType,
      sizeBytes,
      durationSeconds,
      sourceUrl: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
      fileHash,
      isNew: !existingHashes.has(fileHash),
    };
  });
}

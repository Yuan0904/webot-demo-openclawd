/**
 * Stub for the deleted web/media module.
 *
 * The original implementation loaded media from local files or remote URLs
 * (HTTP/HTTPS). This stub preserves the public API surface so that downstream
 * code compiles. Local-file loading is retained (via fs); remote fetching
 * delegates to the shared media/fetch helper.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchRemoteMedia } from "../media/fetch.js";
import { detectMime } from "../media/mime.js";

export type WebMediaResult = {
  kind: string;
  buffer: Buffer;
  contentType?: string;
  mimeType?: string;
  fileName?: string;
};

function classifyMime(mime?: string): string {
  if (!mime) return "unknown";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("text/")) return "text";
  return "file";
}

export async function loadWebMedia(
  source: string,
  maxBytes?: number,
  _opts?: { localRoots?: string | string[] | "any" },
): Promise<WebMediaResult> {
  const trimmed = source.trim();

  // Handle file:// URLs
  if (trimmed.startsWith("file://")) {
    const filePath = fileURLToPath(trimmed);
    return loadLocalFile(filePath, maxBytes);
  }

  // Handle remote URLs
  if (/^https?:\/\//i.test(trimmed)) {
    const result = await fetchRemoteMedia({ url: trimmed, maxBytes });
    const kind = classifyMime(result.contentType);
    return {
      kind,
      buffer: result.buffer,
      contentType: result.contentType,
      mimeType: result.contentType,
      fileName: result.fileName,
    };
  }

  // Assume local file path
  return loadLocalFile(trimmed, maxBytes);
}

async function loadLocalFile(filePath: string, maxBytes?: number): Promise<WebMediaResult> {
  const buffer = await fs.readFile(filePath);
  if (maxBytes && buffer.length > maxBytes) {
    throw new Error(
      `File ${filePath} exceeds maximum size: ${buffer.length} > ${maxBytes}`,
    );
  }
  const contentType = await detectMime({ buffer, filePath });
  const kind = classifyMime(contentType ?? undefined);
  return {
    kind,
    buffer,
    contentType: contentType ?? undefined,
    mimeType: contentType ?? undefined,
    fileName: path.basename(filePath),
  };
}

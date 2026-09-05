import "server-only";
import { randomId } from "./crypto";
import { media } from "./db";

/** Store an upload in R2 and return the public URL platforms will fetch it from. */
export async function storeMedia(env: CloudflareEnv, file: File) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `${new Date().toISOString().slice(0, 10)}/${randomId()}.${ext}`;
  // R2 needs a known length: buffer the upload (files are capped at 100 MB by the route).
  await env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  const base = (env.MEDIA_PUBLIC_URL || `${env.APP_URL}/api/media`).replace(/\/$/, "");
  const url = `${base}/${key}`;
  const id = randomId("m_");
  await media.insert(env.DB, { id, key, url, type: file.type, size: file.size });
  return { id, path: url, type: file.type, size: file.size };
}

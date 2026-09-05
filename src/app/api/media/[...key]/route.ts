import { env } from "@/lib/env";

/** Serves R2 objects when no public bucket URL is configured. */
export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const e = await env();
  const object = await e.MEDIA.get((await params).key.join("/"));
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body as unknown as ReadableStream, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Content-Length": String(object.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: object.httpEtag,
    },
  });
}

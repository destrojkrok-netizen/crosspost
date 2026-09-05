import { json } from "../http";
import type { Credentials, Provider } from "./types";

const DEFAULT_PDS = "https://bsky.social";

type Session = { accessJwt: string; did: string; handle: string };

async function session(cred: Credentials): Promise<Session> {
  const pds = cred.pdsUrl ?? DEFAULT_PDS;
  return json<Session>(`${pds}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: cred.handle, password: cred.appPassword }),
  });
}

/** Link facets so URLs are clickable; byte offsets per the AT Protocol spec. */
function facets(text: string) {
  const enc = new TextEncoder();
  const out: unknown[] = [];
  for (const m of text.matchAll(/https?:\/\/[^\s)]+/g)) {
    const byteStart = enc.encode(text.slice(0, m.index)).length;
    out.push({
      index: { byteStart, byteEnd: byteStart + enc.encode(m[0]).length },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: m[0] }],
    });
  }
  return out;
}

export const bluesky: Provider = {
  id: "bluesky",
  label: "Bluesky",
  limit: 300,
  auth: "token",
  requiredEnv: [],
  fields: [
    { name: "handle", label: "Handle", placeholder: "you.bsky.social" },
    { name: "appPassword", label: "App password (Settings → App passwords)", secret: true },
  ],
  supportsMedia: ["image"],
  supportsThread: true,

  async fromFields(_ctx, f) {
    if (!f.handle || !f.appPassword) throw new Error("Handle and app password are required");
    const s = await session({ handle: f.handle.replace(/^@/, ""), appPassword: f.appPassword });
    return { handle: s.handle, appPassword: f.appPassword, did: s.did, username: s.handle };
  },

  async whoami(_ctx, cred) {
    const s = await session(cred);
    const p = await json<{ avatar?: string }>(`${cred.pdsUrl ?? DEFAULT_PDS}/xrpc/app.bsky.actor.getProfile?actor=${s.did}`, {
      headers: { Authorization: `Bearer ${s.accessJwt}` },
    });
    return { id: s.did, username: s.handle, picture: p.avatar };
  },

  async publish(_ctx, cred, { parts, media }) {
    const pds = cred.pdsUrl ?? DEFAULT_PDS;
    const s = await session(cred);
    const auth = { Authorization: `Bearer ${s.accessJwt}` };
    // Images (up to 4) go up as blobs first.
    const images: unknown[] = [];
    for (const m of media.filter((m) => !m.type?.startsWith("video")).slice(0, 4)) {
      const file = await fetch(m.path);
      if (!file.ok) throw new Error(`Bluesky: could not fetch media ${m.path}`);
      const blob = await file.blob();
      const up = await json<{ blob: unknown }>(`${pds}/xrpc/com.atproto.repo.uploadBlob`, {
        method: "POST",
        headers: { ...auth, "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      images.push({ image: up.blob, alt: "" });
    }
    let root: { uri: string; cid: string } | undefined;
    let parent: { uri: string; cid: string } | undefined;
    for (let i = 0; i < parts.length; i++) {
      const record: Record<string, unknown> = {
        $type: "app.bsky.feed.post",
        text: parts[i],
        createdAt: new Date().toISOString(),
        facets: facets(parts[i]),
        ...(i === 0 && images.length ? { embed: { $type: "app.bsky.embed.images", images } } : {}),
        ...(parent ? { reply: { root, parent } } : {}),
      };
      const r = await json<{ uri: string; cid: string }>(`${pds}/xrpc/com.atproto.repo.createRecord`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ repo: s.did, collection: "app.bsky.feed.post", record }),
      });
      parent = r;
      root ??= r;
    }
    const rkey = root!.uri.split("/").pop();
    return { releaseId: root!.uri, releaseUrl: `https://bsky.app/profile/${s.handle}/post/${rkey}` };
  },

  async channelStats(_ctx, cred) {
    const s = await session(cred);
    const p = await json<{ followersCount?: number; postsCount?: number }>(
      `${cred.pdsUrl ?? DEFAULT_PDS}/xrpc/app.bsky.actor.getProfile?actor=${s.did}`,
      { headers: { Authorization: `Bearer ${s.accessJwt}` } },
    );
    return { followers: p.followersCount ?? 0, posts: p.postsCount ?? 0 };
  },

  async postStats(_ctx, cred, releaseId) {
    const s = await session(cred);
    const r = await json<{ posts: { likeCount?: number; repostCount?: number; replyCount?: number; quoteCount?: number }[] }>(
      `${cred.pdsUrl ?? DEFAULT_PDS}/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(releaseId)}`,
      { headers: { Authorization: `Bearer ${s.accessJwt}` } },
    );
    const p = r.posts[0] ?? {};
    return { likes: p.likeCount ?? 0, reposts: (p.repostCount ?? 0) + (p.quoteCount ?? 0), replies: p.replyCount ?? 0 };
  },
};

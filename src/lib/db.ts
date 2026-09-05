import "server-only";
import type { D1Database } from "@cloudflare/workers-types";
import type { Channel, MediaRef, PostState, QueuedPost } from "./types";

export type ChannelRow = {
  id: string;
  provider: string;
  name: string;
  picture: string | null;
  external_id: string | null;
  credentials: string;
  disabled: number;
  created_at: number;
};

export type PostRow = {
  id: string;
  group_id: string;
  channel_id: string;
  parts: string;
  media: string;
  publish_at: number;
  state: PostState;
  release_id: string | null;
  release_url: string | null;
  error: string | null;
  attempts: number;
  created_at: number;
};

export const toChannel = (r: ChannelRow): Channel => ({
  id: r.id,
  name: r.name,
  identifier: r.provider as Channel["identifier"],
  picture: r.picture,
  disabled: Boolean(r.disabled),
  externalId: r.external_id,
});

export function toPost(r: PostRow, channel?: ChannelRow | Channel): QueuedPost {
  const parts = JSON.parse(r.parts) as string[];
  const c = channel && "provider" in channel ? toChannel(channel) : channel;
  return {
    id: r.id,
    group: r.group_id,
    content: parts[0] ?? "",
    parts,
    media: JSON.parse(r.media) as MediaRef[],
    publishDate: new Date(r.publish_at).toISOString(),
    state: r.state,
    releaseURL: r.release_url,
    error: r.error,
    integration: c && { id: c.id, name: c.name, providerIdentifier: c.identifier, picture: c.picture },
  };
}

export const channels = {
  all: (db: D1Database) => db.prepare("SELECT * FROM channels ORDER BY created_at").all<ChannelRow>().then((r) => r.results),
  get: (db: D1Database, id: string) => db.prepare("SELECT * FROM channels WHERE id = ?").bind(id).first<ChannelRow>(),
  insert: (db: D1Database, r: ChannelRow) =>
    db
      .prepare(
        "INSERT INTO channels (id, provider, name, picture, external_id, credentials, disabled, created_at) VALUES (?,?,?,?,?,?,?,?)",
      )
      .bind(r.id, r.provider, r.name, r.picture, r.external_id, r.credentials, r.disabled, r.created_at)
      .run(),
  setCredentials: (db: D1Database, id: string, credentials: string) =>
    db.prepare("UPDATE channels SET credentials = ? WHERE id = ?").bind(credentials, id).run(),
  remove: (db: D1Database, id: string) => db.prepare("DELETE FROM channels WHERE id = ?").bind(id).run(),
};

export const posts = {
  between: (db: D1Database, from: number, to: number) =>
    db
      .prepare("SELECT * FROM posts WHERE publish_at BETWEEN ? AND ? ORDER BY publish_at")
      .bind(from, to)
      .all<PostRow>()
      .then((r) => r.results),
  get: (db: D1Database, id: string) => db.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<PostRow>(),
  insertMany: (db: D1Database, rows: PostRow[]) =>
    db.batch(
      rows.map((r) =>
        db
          .prepare(
            "INSERT INTO posts (id, group_id, channel_id, parts, media, publish_at, state, release_id, release_url, error, attempts, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(r.id, r.group_id, r.channel_id, r.parts, r.media, r.publish_at, r.state, r.release_id, r.release_url, r.error, r.attempts, r.created_at),
      ),
    ),
  removeGroup: (db: D1Database, groupOrId: string) =>
    db.prepare("DELETE FROM posts WHERE group_id = ? OR id = ?").bind(groupOrId, groupOrId).run(),
  /** Claim due posts atomically: flip QUEUE → PUBLISHING, return what was claimed. */
  claimDue: async (db: D1Database, now: number, limit = 10) => {
    const due = await db
      .prepare("SELECT * FROM posts WHERE state = 'QUEUE' AND publish_at <= ? ORDER BY publish_at LIMIT ?")
      .bind(now, limit)
      .all<PostRow>();
    const claimed: PostRow[] = [];
    for (const row of due.results) {
      const r = await db
        .prepare("UPDATE posts SET state = 'PUBLISHING', attempts = attempts + 1 WHERE id = ? AND state = 'QUEUE'")
        .bind(row.id)
        .run();
      if (r.meta.changes === 1) claimed.push(row);
    }
    return claimed;
  },
  published: (db: D1Database, row: PostRow, releaseId: string, releaseUrl?: string) =>
    db
      .prepare("UPDATE posts SET state = 'PUBLISHED', release_id = ?, release_url = ?, error = NULL WHERE id = ?")
      .bind(releaseId, releaseUrl ?? null, row.id)
      .run(),
  failed: (db: D1Database, row: PostRow, error: string, retry: boolean) =>
    db
      .prepare("UPDATE posts SET state = ?, error = ? WHERE id = ?")
      .bind(retry ? "QUEUE" : "ERROR", error.slice(0, 500), row.id)
      .run(),
  recentlyPublished: (db: D1Database, since: number) =>
    db
      .prepare("SELECT * FROM posts WHERE state = 'PUBLISHED' AND release_id IS NOT NULL AND publish_at >= ?")
      .bind(since)
      .all<PostRow>()
      .then((r) => r.results),
};

export const metrics = {
  upsert: (db: D1Database, subject: string, day: string, snapshot: Record<string, number>) =>
    db.batch(
      Object.entries(snapshot).map(([metric, value]) =>
        db
          .prepare("INSERT INTO metrics (subject, metric, day, value) VALUES (?,?,?,?) ON CONFLICT(subject, metric, day) DO UPDATE SET value = excluded.value")
          .bind(subject, metric, day, value),
      ),
    ),
  series: (db: D1Database, subject: string, fromDay: string) =>
    db
      .prepare("SELECT metric, day, value FROM metrics WHERE subject = ? AND day >= ? ORDER BY day")
      .bind(subject, fromDay)
      .all<{ metric: string; day: string; value: number }>()
      .then((r) => r.results),
};

export const oauthStates = {
  put: (db: D1Database, state: string, provider: string, verifier: string) =>
    db.prepare("INSERT INTO oauth_states (state, provider, verifier, created_at) VALUES (?,?,?,?)").bind(state, provider, verifier, Date.now()).run(),
  take: async (db: D1Database, state: string) => {
    const row = await db.prepare("SELECT * FROM oauth_states WHERE state = ?").bind(state).first<{ provider: string; verifier: string; created_at: number }>();
    await db.prepare("DELETE FROM oauth_states WHERE state = ? OR created_at < ?").bind(state, Date.now() - 3600e3).run();
    return row;
  },
};

export const media = {
  insert: (db: D1Database, r: { id: string; key: string; url: string; type: string; size: number }) =>
    db.prepare("INSERT INTO media (id, key, url, type, size, created_at) VALUES (?,?,?,?,?,?)").bind(r.id, r.key, r.url, r.type, r.size, Date.now()).run(),
};

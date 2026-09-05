import "server-only";
import { credentialsFor, providerContext } from "./channels";
import { channels, posts, type PostRow } from "./db";
import { provider } from "./providers";
import type { MediaRef } from "./types";

const MAX_ATTEMPTS = 3;

/** Publish one claimed row; never throws — the outcome lands in the row. */
export async function publishRow(env: CloudflareEnv, row: PostRow) {
  try {
    const channel = await channels.get(env.DB, row.channel_id);
    if (!channel) throw new Error("channel was removed");
    const p = provider(channel.provider);
    const cred = await credentialsFor(env, channel);
    const result = await p.publish(providerContext(env, p.id), cred, {
      parts: JSON.parse(row.parts) as string[],
      media: JSON.parse(row.media) as MediaRef[],
    });
    await posts.published(env.DB, row, result.releaseId, result.releaseUrl);
    return { ok: true as const, id: row.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Transient (network, 5xx, rate limit) → back to the queue for the next tick.
    const retry = row.attempts < MAX_ATTEMPTS && /\b(429|5\d\d|fetch failed|timeout)\b/i.test(message);
    await posts.failed(env.DB, row, message, retry);
    return { ok: false as const, id: row.id, error: message, retry };
  }
}

/** The cron body: claim everything due and publish it. */
export async function publishDue(env: CloudflareEnv) {
  const claimed = await posts.claimDue(env.DB, Date.now());
  const results = [];
  for (const row of claimed) results.push(await publishRow(env, row));
  return results;
}

import "server-only";
import { credentialsFor, providerContext } from "./channels";
import { channels, metrics, posts } from "./db";
import { provider } from "./providers";
import type { MetricSeries } from "./types";

const LABELS: Record<string, string> = {
  followers: "Followers",
  views: "Views",
  likes: "Likes",
  replies: "Replies",
  reposts: "Reposts",
  shares: "Shares",
  saved: "Saves",
  posts: "Posts",
};

const dayOf = (ts: number) => new Date(ts).toISOString().slice(0, 10);

/** Hourly cron body: snapshot every channel and every post published in the last 30 days.
 * Each platform is asked once; a failure on one channel does not stop the others. */
export async function collectMetrics(env: CloudflareEnv) {
  const today = dayOf(Date.now());
  const rows = await channels.everyone(env.DB);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const report: Record<string, string> = {};
  for (const row of rows) {
    const p = provider(row.provider);
    if (!p.channelStats) continue;
    try {
      const cred = await credentialsFor(env, row);
      await metrics.upsert(env.DB, `channel:${row.id}`, today, await p.channelStats(providerContext(env, p.id), cred));
      report[row.id] = "ok";
    } catch (e) {
      report[row.id] = e instanceof Error ? e.message : String(e);
    }
  }
  for (const post of await posts.recentlyPublished(env.DB, Date.now() - 30 * 864e5)) {
    const row = byId.get(post.channel_id);
    const p = row && provider(row.provider);
    if (!row || !p?.postStats) continue;
    try {
      const cred = await credentialsFor(env, row);
      await metrics.upsert(env.DB, `post:${post.id}`, today, await p.postStats(providerContext(env, p.id), cred, post.release_id!));
    } catch (e) {
      report[post.id] = e instanceof Error ? e.message : String(e);
    }
  }
  return report;
}

/** Stored snapshots for a subject as chart series; days without a snapshot carry the
 * previous value forward so the line is continuous. */
export async function seriesFor(env: CloudflareEnv, subject: string, days: number): Promise<MetricSeries[]> {
  const from = dayOf(Date.now() - (days - 1) * 864e5);
  const rows = await metrics.series(env.DB, subject, from);
  if (rows.length === 0) return [];
  const byMetric = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!byMetric.has(r.metric)) byMetric.set(r.metric, new Map());
    byMetric.get(r.metric)!.set(r.day, r.value);
  }
  const order = ["followers", "views", "likes", "replies", "reposts", "shares", "saved", "posts"];
  return [...byMetric.entries()]
    .sort(([a], [b]) => (order.indexOf(a) + 100) % 100 - ((order.indexOf(b) + 100) % 100))
    .map(([metric, points]) => {
      const data: MetricSeries["data"] = [];
      let last: number | null = null;
      for (let i = days - 1; i >= 0; i--) {
        const day = dayOf(Date.now() - i * 864e5);
        const v = points.get(day);
        if (v !== undefined) last = v;
        if (last !== null) data.push({ date: day, total: last });
      }
      const first = data[0]?.total ?? 0;
      const end = data.at(-1)?.total ?? 0;
      return {
        label: LABELS[metric] ?? metric,
        data,
        percentageChange: first ? Math.round(((end - first) / first) * 1000) / 10 : 0,
      };
    });
}

/** Live numbers right now (used when nothing is stored yet), also written as today's snapshot. */
export async function refreshSubject(env: CloudflareEnv, subject: string) {
  const [kind, id] = subject.split(":");
  if (kind === "channel") {
    const row = await channels.get(env.DB, id);
    const p = row && provider(row.provider);
    if (!row || !p?.channelStats) return;
    await metrics.upsert(env.DB, subject, dayOf(Date.now()), await p.channelStats(providerContext(env, p.id), await credentialsFor(env, row)));
  } else {
    const post = await posts.get(env.DB, id);
    const row = post && (await channels.get(env.DB, post.channel_id));
    const p = row && provider(row.provider);
    if (!post?.release_id || !row || !p?.postStats) return;
    await metrics.upsert(env.DB, subject, dayOf(Date.now()), await p.postStats(providerContext(env, p.id), await credentialsFor(env, row), post.release_id));
  }
}

// Demo mode: what the UI shows when POSTIZ_API_KEY is not set. Channels you add are kept
// in data/demo-channels.json so they survive a restart; posts live in process memory.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { providerLimit } from "./providers";
import type { Channel, CreatePostBody, MetricSeries, NewChannel, QueuedPost } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const CHANNELS_FILE = path.join(DATA_DIR, "demo-channels.json");

const DEFAULT_CHANNELS: Channel[] = [
  { id: "demo-x", name: "@levelup", identifier: "x", picture: null },
  { id: "demo-linkedin", name: "Levelup", identifier: "linkedin", picture: null },
  { id: "demo-instagram", name: "levelup.peoples", identifier: "instagram", picture: null },
  { id: "demo-threads", name: "levelup.peoples", identifier: "threads", picture: null },
];

function loadChannels(): Channel[] {
  try {
    if (existsSync(CHANNELS_FILE)) return JSON.parse(readFileSync(CHANNELS_FILE, "utf8"));
  } catch {
    // a broken file falls back to the defaults
  }
  return [...DEFAULT_CHANNELS];
}

function saveChannels(channels: Channel[]) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2));
}

const channels: Channel[] = loadChannels();

const posts: QueuedPost[] = [
  {
    id: "demo-post-1",
    group: "g1",
    content: "Benjamin Franklin tracked 13 virtues on one page. Now it's a Notion template.",
    publishDate: new Date(Date.now() + 36e5 * 5).toISOString(),
    state: "QUEUE",
    integration: { id: "demo-x", name: "@levelup", providerIdentifier: "x" },
  },
  {
    id: "demo-post-2",
    group: "g1",
    content: "Benjamin Franklin tracked 13 virtues on one page. Now it's a Notion template.",
    publishDate: new Date(Date.now() + 36e5 * 5).toISOString(),
    state: "QUEUE",
    integration: { id: "demo-linkedin", name: "Levelup", providerIdentifier: "linkedin" },
  },
  {
    id: "demo-post-0",
    group: "g0",
    content: "Habit Tracker v2 is live.",
    publishDate: new Date(Date.now() - 36e5 * 26).toISOString(),
    state: "PUBLISHED",
    releaseURL: "https://example.com/post",
    integration: { id: "demo-threads", name: "levelup.peoples", providerIdentifier: "threads" },
  },
];

const BOOT = Date.now();

// Deterministic pseudo-random series, plus a slow upward tick so the demo visibly
// "receives" new views and likes between polls.
function series(seed: number, days: number, base: number, drift: number): MetricSeries["data"] {
  let x = seed;
  const rand = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  const out: MetricSeries["data"] = [];
  let value = base;
  for (let i = days - 1; i >= 0; i--) {
    value = Math.max(0, value + drift + Math.round((rand() - 0.45) * base * 0.08));
    out.push({ date: new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), total: value });
  }
  const live = Math.floor((Date.now() - BOOT) / 5000) * Math.max(1, Math.round(base / 400));
  out[out.length - 1].total += live;
  return out;
}

const change = (s: MetricSeries["data"]) =>
  s[0].total ? Math.round(((s[s.length - 1].total - s[0].total) / s[0].total) * 1000) / 10 : 0;

const seedOf = (id: string) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0);

export const demo = {
  channels: async () => channels,
  addChannel: async (input: NewChannel): Promise<Channel> => {
    const channel: Channel = {
      id: `demo-${input.identifier}-${Math.random().toString(36).slice(2, 7)}`,
      name: input.name,
      identifier: input.identifier,
      picture: input.picture || null,
      custom: true,
    };
    channels.push(channel);
    saveChannels(channels);
    return channel;
  },
  removeChannel: async (id: string) => {
    const i = channels.findIndex((c) => c.id === id);
    if (i >= 0) channels.splice(i, 1);
    saveChannels(channels);
  },
  settings: async (id: string) => ({
    maxLength: providerLimit(channels.find((c) => c.id === id)?.identifier ?? ""),
  }),
  posts: async () => {
    // Scheduled demo posts "publish" themselves once their time passes.
    const now = Date.now();
    for (const p of posts) {
      if (p.state === "QUEUE" && Date.parse(p.publishDate) <= now) {
        p.state = "PUBLISHED";
        p.releaseURL = p.releaseURL ?? `https://example.com/${p.id}`;
      }
    }
    return [...posts].sort((a, b) => a.publishDate.localeCompare(b.publishDate));
  },
  create: async (body: CreatePostBody) => {
    const group = `g${Date.now()}`;
    for (const p of body.posts) {
      const channel = channels.find((c) => c.id === p.integration.id);
      posts.push({
        id: `demo-post-${Math.random().toString(36).slice(2, 8)}`,
        group,
        content: p.value[0]?.content ?? "",
        publishDate: body.date,
        state: body.type === "draft" ? "DRAFT" : body.type === "now" ? "PUBLISHED" : "QUEUE",
        releaseURL: body.type === "now" ? `https://example.com/${group}` : null,
        integration: channel && {
          id: channel.id,
          name: channel.name,
          providerIdentifier: channel.identifier,
        },
      });
    }
    return { group, count: body.posts.length };
  },
  remove: async (id: string) => {
    for (let i = posts.length - 1; i >= 0; i--) {
      if (posts[i].id === id || posts[i].group === id) posts.splice(i, 1);
    }
    return { ok: true };
  },
  upload: async (file: File) => ({
    path: `https://demo.invalid/uploads/${encodeURIComponent(file.name)}`,
  }),
  analytics: async (id: string, days: number): Promise<MetricSeries[]> => {
    const seed = seedOf(id);
    const followers = series(seed, days, 1200 + seed, 4);
    const impressions = series(seed + 7, days, 900, 0);
    const likes = series(seed + 13, days, 60, 0);
    return [
      { label: "Followers", data: followers, percentageChange: change(followers) },
      { label: "Impressions", data: impressions, percentageChange: change(impressions) },
      { label: "Likes", data: likes, percentageChange: change(likes) },
    ];
  },
  postAnalytics: async (id: string, days: number): Promise<MetricSeries[] | { missing: true }> => {
    const post = posts.find((p) => p.id === id);
    if (!post || post.state !== "PUBLISHED") return [];
    const seed = seedOf(id);
    const views = series(seed, days, 400, 30);
    const likes = series(seed + 3, days, 25, 2);
    const comments = series(seed + 5, days, 4, 0);
    return [
      { label: "Views", data: views, percentageChange: change(views) },
      { label: "Likes", data: likes, percentageChange: change(likes) },
      { label: "Comments", data: comments, percentageChange: change(comments) },
    ];
  },
};

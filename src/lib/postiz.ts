import "server-only";
import type { Channel, CreatePostBody, MetricSeries, NewChannel, QueuedPost } from "./types";
import { demo } from "./demo";

const API_URL = (process.env.POSTIZ_API_URL || "https://api.postiz.com").replace(/\/$/, "");
const POSTIZ_URL = (process.env.POSTIZ_URL || "https://platform.postiz.com").replace(/\/$/, "");
const API_KEY = process.env.POSTIZ_API_KEY || "";
const DEMO = !API_KEY || process.env.POSTIZ_DEMO === "1";

export const status = () => ({
  configured: Boolean(API_KEY),
  demo: DEMO,
  apiUrl: API_URL,
  postizUrl: POSTIZ_URL,
});

export class PostizError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/public/v1${path}`, {
    ...init,
    headers: {
      Authorization: API_KEY,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new PostizError(text.slice(0, 500) || res.statusText, res.status);
  return (text ? JSON.parse(text) : null) as T;
}

export async function listChannels(): Promise<Channel[]> {
  if (DEMO) return demo.channels();
  const data = await request<Channel[] | { integrations: Channel[] }>("/integrations");
  return Array.isArray(data) ? data : data.integrations;
}

/** Channels connect through OAuth in Postiz itself; the public API has no endpoint for it.
 * Demo mode adds a local channel so the UI can be tried without an account. */
export async function addChannel(channel: NewChannel): Promise<Channel> {
  if (DEMO) return demo.addChannel(channel);
  throw new PostizError(
    `Connect the account in Postiz (${POSTIZ_URL}/launches → Add channel), then refresh the list here.`,
    400,
  );
}

export async function removeChannel(id: string): Promise<void> {
  if (DEMO) return demo.removeChannel(id);
  throw new PostizError(`Disconnect channels in Postiz (${POSTIZ_URL}/launches).`, 400);
}

export async function channelSettings(
  id: string,
): Promise<{ maxLength?: number } & Record<string, unknown>> {
  if (DEMO) return demo.settings(id);
  const data = await request<{ output?: Record<string, unknown> } & Record<string, unknown>>(
    `/integration-settings/${id}`,
  );
  return (data.output ?? data) as { maxLength?: number };
}

export async function listPosts(startDate: string, endDate: string): Promise<QueuedPost[]> {
  if (DEMO) return demo.posts();
  const q = new URLSearchParams({ startDate, endDate }).toString();
  const data = await request<QueuedPost[] | { posts: QueuedPost[] }>(`/posts?${q}`);
  return Array.isArray(data) ? data : data.posts;
}

export async function createPost(body: CreatePostBody) {
  if (DEMO) return demo.create(body);
  return request<unknown>("/posts", { method: "POST", body: JSON.stringify(body) });
}

export async function deletePost(id: string) {
  if (DEMO) return demo.remove(id);
  return request<unknown>(`/posts/${id}`, { method: "DELETE" });
}

export async function upload(file: File): Promise<{ path: string }> {
  if (DEMO) return demo.upload(file);
  const form = new FormData();
  form.append("file", file, file.name);
  return request<{ path: string }>("/upload", { method: "POST", body: form });
}

/** Platform analytics for one channel over the last `days` days. */
export async function channelAnalytics(id: string, days: number): Promise<MetricSeries[]> {
  if (DEMO) return demo.analytics(id, days);
  const data = await request<MetricSeries[] | { output: MetricSeries[] }>(
    `/analytics/${id}?date=${days}`,
  );
  return Array.isArray(data) ? data : (data.output ?? []);
}

/** Analytics for one published post. `{ missing: true }` means the platform returned no
 * post id yet (Postiz: posts:missing / posts:connect resolve it). */
export async function postAnalytics(
  id: string,
  days: number,
): Promise<MetricSeries[] | { missing: true }> {
  if (DEMO) return demo.postAnalytics(id, days);
  const data = await request<MetricSeries[] | { missing?: boolean; output?: MetricSeries[] }>(
    `/analytics/post/${id}?date=${days}`,
  );
  if (Array.isArray(data)) return data;
  if (data?.missing) return { missing: true };
  return data?.output ?? [];
}

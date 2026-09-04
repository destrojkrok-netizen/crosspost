import { App } from "@/components/App";
import { listChannels, listPosts, status } from "@/lib/postiz";
import type { Channel, QueuedPost } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  const appStatus = status();
  const now = Date.now();
  let channels: Channel[] = [];
  let posts: QueuedPost[] = [];
  let error: string | null = null;
  try {
    [channels, posts] = await Promise.all([
      listChannels(),
      listPosts(new Date(now - 30 * 864e5).toISOString(), new Date(now + 60 * 864e5).toISOString()),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  return (
    <App
      status={appStatus}
      initialChannels={channels}
      initialPosts={posts}
      initialNow={now}
      initialError={error}
    />
  );
}

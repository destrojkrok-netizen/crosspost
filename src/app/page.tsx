import { cookies } from "next/headers";
import { App } from "@/components/App";
import { channels, posts, toChannel, toPost } from "@/lib/db";
import { env } from "@/lib/env";
import { connectable } from "@/lib/providers";
import { SESSION_COOKIE, sessionSecret, verifySession } from "@/lib/session";
import type { AppStatus, Channel, QueuedPost } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  const now = Date.now();
  let status: AppStatus = { configured: false, demo: false, appUrl: "", connectable: [] };
  let channelList: Channel[] = [];
  let postList: QueuedPost[] = [];
  let error: string | null = null;
  let user: { email: string; name?: string; picture?: string } | null = null;
  try {
    const e = await env();
    const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value, sessionSecret(e));
    if (session) user = { email: session.email, name: session.name, picture: session.picture };
    status = { configured: true, demo: false, appUrl: e.APP_URL, connectable: connectable(e) };
    const rows = session ? await channels.all(e.DB, session.uid) : [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    channelList = rows.map(toChannel);
    postList = (session ? await posts.between(e.DB, session.uid, now - 30 * 864e5, now + 60 * 864e5) : []).map((r) => toPost(r, byId.get(r.channel_id)));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    if (/no such table/i.test(error)) error = "Database is empty: run `npm run db:migrate:local` (or db:migrate for production).";
  }
  return <App status={status} initialChannels={channelList} initialPosts={postList} initialNow={now} initialError={error} user={user} />;
}

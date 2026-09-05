import { NextResponse } from "next/server";
import { randomId } from "@/lib/crypto";
import { channels, posts, toPost, type PostRow } from "@/lib/db";
import { env } from "@/lib/env";
import { provider } from "@/lib/providers";
import { publishRow } from "@/lib/publisher";
import type { CreatePostBody } from "@/lib/types";
import { bad, fail } from "../_lib";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const from = Date.parse(q.get("startDate") ?? "") || Date.now() - 30 * 864e5;
  const to = Date.parse(q.get("endDate") ?? "") || Date.now() + 60 * 864e5;
  try {
    const e = await env();
    const byId = new Map((await channels.all(e.DB)).map((c) => [c.id, c]));
    return NextResponse.json((await posts.between(e.DB, from, to)).map((r) => toPost(r, byId.get(r.channel_id))));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  let body: CreatePostBody;
  try {
    body = (await request.json()) as CreatePostBody;
  } catch {
    return bad("Invalid JSON");
  }
  if (!body.posts?.length) return bad("Pick at least one channel");
  const publishAt = body.type === "now" ? Date.now() : Date.parse(body.date);
  if (Number.isNaN(publishAt)) return bad("Invalid date");
  try {
    const e = await env();
    const byId = new Map((await channels.all(e.DB)).map((c) => [c.id, c]));
    const group = randomId("g_");
    const rows: PostRow[] = [];
    for (const item of body.posts) {
      const channel = byId.get(item.integration.id);
      if (!channel) return bad(`Unknown channel ${item.integration.id}`);
      const p = provider(channel.provider);
      const parts = item.value.map((v) => v.content.trim()).filter(Boolean);
      const media = item.value[0]?.image ?? [];
      if (!parts.length && !media.length) return bad(`${channel.name}: text or media is required`);
      const over = parts.find((t) => t.length > p.limit);
      if (over) return bad(`${channel.name}: over ${p.limit} characters`);
      if (p.requiresMedia && !media.length) return bad(`${channel.name}: ${p.label} needs ${p.requiresMedia === "any" ? "an image or a video" : `a ${p.requiresMedia}`}`);
      if (p.requiresMedia === "video" && !media.some((m) => m.type?.startsWith("video"))) return bad(`${channel.name}: ${p.label} needs a video`);
      rows.push({
        id: randomId("p_"),
        group_id: group,
        channel_id: channel.id,
        parts: JSON.stringify(parts.length ? parts : [""]),
        media: JSON.stringify(media),
        publish_at: publishAt,
        state: body.type === "draft" ? "DRAFT" : "QUEUE",
        release_id: null,
        release_url: null,
        error: null,
        attempts: 0,
        created_at: Date.now(),
      });
    }
    await posts.insertMany(e.DB, rows);
    // "Post now" publishes in this request; scheduled posts wait for the cron tick.
    const results = body.type === "now" ? await Promise.all((await posts.claimDue(e.DB, Date.now(), rows.length)).map((r) => publishRow(e, r))) : [];
    const failed = results.filter((r) => !r.ok);
    if (failed.length) return NextResponse.json({ group, count: rows.length, errors: failed.map((f) => (f as { error: string }).error) }, { status: 207 });
    return NextResponse.json({ group, count: rows.length });
  } catch (error) {
    return fail(error);
  }
}

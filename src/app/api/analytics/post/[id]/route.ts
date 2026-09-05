import { NextResponse } from "next/server";
import { posts } from "@/lib/db";
import { env } from "@/lib/env";
import { refreshSubject, seriesFor } from "@/lib/metrics";
import { fail } from "../../../_lib";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 7));
  try {
    const e = await env();
    const id = (await params).id;
    const post = await posts.get(e.DB, id);
    if (post && post.state === "PUBLISHED" && !post.release_id) return NextResponse.json({ missing: true });
    const subject = `post:${id}`;
    let series = await seriesFor(e, subject, days);
    if (series.length === 0) {
      await refreshSubject(e, subject).catch((err) => console.warn(String(err)));
      series = await seriesFor(e, subject, days);
    }
    return NextResponse.json(series);
  } catch (error) {
    return fail(error);
  }
}

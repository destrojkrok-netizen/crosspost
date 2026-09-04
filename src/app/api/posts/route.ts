import { NextResponse } from "next/server";
import { createPost, listPosts } from "@/lib/postiz";
import type { CreatePostBody } from "@/lib/types";
import { fail } from "../_lib";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const start = url.searchParams.get("startDate") ?? new Date(Date.now() - 30 * 864e5).toISOString();
  const end = url.searchParams.get("endDate") ?? new Date(Date.now() + 60 * 864e5).toISOString();
  try {
    return NextResponse.json(await listPosts(start, end));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  let body: CreatePostBody;
  try {
    body = (await request.json()) as CreatePostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.posts?.length) return NextResponse.json({ error: "Pick at least one channel" }, { status: 400 });
  if (body.posts.some((p) => !p.value?.[0]?.content?.trim() && !p.value?.[0]?.image?.length))
    return NextResponse.json({ error: "Every channel needs text or media" }, { status: 400 });
  if (!body.date || Number.isNaN(Date.parse(body.date)))
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  try {
    return NextResponse.json(await createPost(body));
  } catch (error) {
    return fail(error);
  }
}

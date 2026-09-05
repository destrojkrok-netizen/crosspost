import { NextResponse } from "next/server";
import { posts } from "@/lib/db";
import { env } from "@/lib/env";
import { fail } from "../../_lib";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const e = await env();
    await posts.removeGroup(e.DB, (await params).id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

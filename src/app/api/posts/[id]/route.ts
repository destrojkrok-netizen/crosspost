import { NextResponse } from "next/server";
import { posts } from "@/lib/db";
import { env, requireUser } from "@/lib/env";
import { fail } from "../../_lib";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const e = await env();
    const user = await requireUser(request, e);
    await posts.removeGroup(e.DB, (await params).id, user.uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

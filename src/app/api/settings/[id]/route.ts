import { NextResponse } from "next/server";
import { channels } from "@/lib/db";
import { env } from "@/lib/env";
import { provider } from "@/lib/providers";
import { fail } from "../../_lib";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const e = await env();
    const row = await channels.get(e.DB, (await params).id);
    if (!row) return NextResponse.json({ maxLength: 0 });
    const p = provider(row.provider);
    return NextResponse.json({ maxLength: p.limit, supportsThread: Boolean(p.supportsThread), requiresMedia: p.requiresMedia ?? null });
  } catch (error) {
    return fail(error);
  }
}

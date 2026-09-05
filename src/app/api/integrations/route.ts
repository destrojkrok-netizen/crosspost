import { NextResponse } from "next/server";
import { createChannel, providerContext } from "@/lib/channels";
import { channels, toChannel } from "@/lib/db";
import { env } from "@/lib/env";
import { provider } from "@/lib/providers";
import { bad, fail } from "../_lib";

export async function GET() {
  try {
    const e = await env();
    return NextResponse.json((await channels.all(e.DB)).map(toChannel));
  } catch (error) {
    return fail(error);
  }
}

/** Token-based providers (Telegram, Bluesky): the form's fields become the channel. */
export async function POST(request: Request) {
  let body: { identifier?: string; fields?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON");
  }
  try {
    const e = await env();
    const p = provider(body.identifier ?? "");
    if (p.auth !== "token" || !p.fromFields) return bad(`${p.label} connects through OAuth: use /api/connect/${p.id}`);
    const cred = await p.fromFields(providerContext(e, p.id), body.fields ?? {});
    return NextResponse.json(await createChannel(e, p.id, cred));
  } catch (error) {
    return fail(error);
  }
}

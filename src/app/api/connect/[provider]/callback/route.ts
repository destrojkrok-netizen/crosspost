import { NextResponse } from "next/server";
import { createChannel, providerContext } from "@/lib/channels";
import { oauthStates } from "@/lib/db";
import { env } from "@/lib/env";
import { provider } from "@/lib/providers";

/** The platform sends the browser back here; exchange the code and store the channel. */
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const e = await env();
  const url = new URL(request.url);
  const back = (q: Record<string, string>) => NextResponse.redirect(`${e.APP_URL}/?${new URLSearchParams(q)}`, 302);
  try {
    const p = provider((await params).provider);
    const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");
    if (error) return back({ connect_error: `${p.label}: ${error}` });
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return back({ connect_error: `${p.label}: missing code or state` });
    const saved = await oauthStates.take(e.DB, state);
    if (!saved || saved.provider !== p.id) return back({ connect_error: `${p.label}: state mismatch, try again` });
    const cred = await p.exchange!(providerContext(e, p.id), code, saved.verifier);
    const channel = await createChannel(e, p.id, cred);
    return back({ connected: channel.name });
  } catch (error) {
    return back({ connect_error: error instanceof Error ? error.message : String(error) });
  }
}

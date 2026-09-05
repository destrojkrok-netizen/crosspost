import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { SESSION_COOKIE, sessionSecret, verifySession } from "@/lib/session";

export async function GET(request: Request) {
  const e = await env();
  const cookie = /(?:^|;\s*)cp_session=([^;]+)/.exec(request.headers.get("cookie") ?? "")?.[1];
  const session = await verifySession(cookie, sessionSecret(e));
  return NextResponse.json(session ? { email: session.email, name: session.name, picture: session.picture } : null, {
    status: session ? 200 : 401,
    headers: { "Cache-Control": "no-store", "X-Session-Cookie": SESSION_COOKIE },
  });
}

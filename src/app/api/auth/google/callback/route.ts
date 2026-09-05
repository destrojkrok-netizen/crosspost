import { NextResponse } from "next/server";
import { randomId } from "@/lib/crypto";
import { users } from "@/lib/db";
import { env } from "@/lib/env";
import { json } from "@/lib/http";
import { cookieHeader, emailAllowed, sessionSecret, signSession } from "@/lib/session";

export async function GET(request: Request) {
  const e = await env();
  const url = new URL(request.url);
  const appUrl = e.APP_URL.replace(/\/$/, "");
  const fail = (reason: string) => NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(reason)}`, 302);
  const cookie = request.headers.get("cookie") ?? "";
  const saved = /(?:^|;\s*)cp_oauth=([^;]+)/.exec(cookie)?.[1] ?? "";
  const [state, nextEncoded] = saved.split(":");
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error")) return fail(url.searchParams.get("error")!);
  if (!code || !state || url.searchParams.get("state") !== state) return fail("State mismatch, try again");
  try {
    const token = await json<{ id_token: string; access_token: string }>("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: e.GOOGLE_CLIENT_ID!,
        client_secret: e.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const me = await json<{ email: string; email_verified: boolean; name?: string; picture?: string }>(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    if (!me.email_verified) return fail("Google account email is not verified");
    if (!emailAllowed(e, me.email)) return fail(`${me.email} is not in ALLOWED_EMAILS`);
    const user = await users.upsert(e.DB, { id: randomId("u_"), email: me.email, name: me.name, picture: me.picture });
    // Channels that predate accounts go to the configured owner(s), never to a stranger.
    if ((e.OWNER_EMAILS ?? "").toLowerCase().split(",").map((s) => s.trim()).includes(me.email.toLowerCase())) await users.claimLegacy(e.DB, user.id);
    const session = await signSession({ uid: user.id, email: user.email, name: me.name, picture: me.picture }, sessionSecret(e));
    const next = decodeURIComponent(nextEncoded ?? "/") || "/";
    const res = NextResponse.redirect(`${appUrl}${next.startsWith("/") ? next : "/"}`, 302);
    const secure = appUrl.startsWith("https://");
    res.headers.append("Set-Cookie", cookieHeader(session, secure));
    res.headers.append("Set-Cookie", `cp_oauth=; Path=/; Max-Age=0`);
    return res;
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

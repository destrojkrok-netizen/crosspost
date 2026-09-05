import { NextResponse } from "next/server";
import { randomBase64url } from "@/lib/crypto";
import { env } from "@/lib/env";
import { bad } from "../../_lib";

/** Start Google sign-in. The state rides in a short-lived cookie. */
export async function GET(request: Request) {
  const e = await env();
  if (!e.GOOGLE_CLIENT_ID || !e.GOOGLE_CLIENT_SECRET) return bad("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET", 500);
  const next = new URL(request.url).searchParams.get("next") ?? "/";
  const state = randomBase64url(16);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: e.GOOGLE_CLIENT_ID,
    redirect_uri: `${e.APP_URL.replace(/\/$/, "")}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  const res = NextResponse.redirect(url, 302);
  const secure = e.APP_URL.startsWith("https://");
  res.headers.append("Set-Cookie", `cp_oauth=${state}:${encodeURIComponent(next.startsWith("/") ? next : "/")}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure ? "; Secure" : ""}`);
  return res;
}

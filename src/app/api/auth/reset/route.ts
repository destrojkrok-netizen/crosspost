import { NextResponse } from "next/server";
import { sha256base64url } from "@/lib/crypto";
import { passwordResets, users } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { cookieHeader, sessionSecret, signSession } from "@/lib/session";
import { bad, fail } from "../../_lib";

export async function POST(request: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON");
  }
  if (!body.token) return bad("Missing token");
  if ((body.password ?? "").length < 8) return bad("Password must be at least 8 characters");
  try {
    const e = await env();
    const reset = await passwordResets.take(e.DB, await sha256base64url(body.token));
    if (!reset) return bad("This reset link is invalid or has expired", 400);
    await users.setPassword(e.DB, reset.user_id, await hashPassword(body.password!));
    const user = (await users.byId(e.DB, reset.user_id))!;
    const res = NextResponse.json({ ok: true });
    res.headers.append(
      "Set-Cookie",
      cookieHeader(await signSession({ uid: user.id, email: user.email, name: user.name ?? undefined }, sessionSecret(e)), e.APP_URL.startsWith("https://")),
    );
    return res;
  } catch (error) {
    return fail(error);
  }
}

import { NextResponse } from "next/server";
import { randomId } from "@/lib/crypto";
import { users } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { cookieHeader, emailAllowed, sessionSecret, signSession } from "@/lib/session";
import { bad, fail } from "../../_lib";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON");
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!EMAIL.test(email)) return bad("Enter a valid email");
  if (password.length < 8) return bad("Password must be at least 8 characters");
  try {
    const e = await env();
    if (!emailAllowed(e, email)) return bad("This email is not allowed to sign up", 403);
    if (await users.byEmail(e.DB, email)) return bad("An account with this email exists — sign in instead", 409);
    const user = await users.create(e.DB, { id: randomId("u_"), email, name: body.name?.trim() || undefined, passwordHash: await hashPassword(password) });
    if ((e.OWNER_EMAILS ?? "").toLowerCase().split(",").map((s) => s.trim()).includes(email)) await users.claimLegacy(e.DB, user.id);
    const res = NextResponse.json({ ok: true });
    res.headers.append("Set-Cookie", cookieHeader(await signSession({ uid: user.id, email, name: user.name ?? undefined }, sessionSecret(e)), e.APP_URL.startsWith("https://")));
    return res;
  } catch (error) {
    return fail(error);
  }
}

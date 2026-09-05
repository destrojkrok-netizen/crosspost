import { NextResponse } from "next/server";
import { users } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/password";
import { cookieHeader, sessionSecret, signSession } from "@/lib/session";
import { bad, fail } from "../../_lib";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON");
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  try {
    const e = await env();
    const user = await users.byEmail(e.DB, email);
    if (user && !user.password_hash) return bad("This account signs in with Google", 400);
    // One message for both cases, so the form does not reveal which emails exist.
    if (!user || !(await verifyPassword(body.password ?? "", user.password_hash))) return bad("Wrong email or password", 401);
    await users.touch(e.DB, user.id);
    const res = NextResponse.json({ ok: true });
    res.headers.append(
      "Set-Cookie",
      cookieHeader(await signSession({ uid: user.id, email: user.email, name: user.name ?? undefined, picture: user.picture ?? undefined }, sessionSecret(e)), e.APP_URL.startsWith("https://")),
    );
    return res;
  } catch (error) {
    return fail(error);
  }
}

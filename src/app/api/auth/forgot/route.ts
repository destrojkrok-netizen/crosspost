import { NextResponse } from "next/server";
import { randomBase64url, sha256base64url } from "@/lib/crypto";
import { passwordResets, users } from "@/lib/db";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mail";
import { bad, fail } from "../../_lib";

const TTL_MS = 60 * 60 * 1000;

/** Always answers ok, so the form cannot be used to find out which emails exist. */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON");
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email) return bad("Enter your email");
  try {
    const e = await env();
    const user = await users.byEmail(e.DB, email);
    if (!user?.password_hash) return NextResponse.json({ ok: true });
    const token = randomBase64url(32);
    await passwordResets.create(e.DB, await sha256base64url(token), user.id, Date.now() + TTL_MS);
    const link = `${e.APP_URL.replace(/\/$/, "")}/reset?token=${token}`;
    const local = new URL(e.APP_URL).hostname === "localhost";
    if (local && !e.RESEND_API_KEY) {
      console.log(`[dev] password reset link for ${email}: ${link}`);
      return NextResponse.json({ ok: true, devLink: link });
    }
    await sendMail(
      e,
      user.email,
      "Reset your Crosspost password",
      `<p>Someone asked to reset the password for ${user.email}.</p><p><a href="${link}">Set a new password</a> — the link works for one hour.</p><p>If that wasn't you, ignore this email.</p>`,
      `Reset your Crosspost password: ${link}\nThe link works for one hour. If that wasn't you, ignore this email.`,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

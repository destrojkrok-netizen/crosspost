import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { cookieHeader } from "@/lib/session";

export async function POST() {
  const e = await env();
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", cookieHeader("", e.APP_URL.startsWith("https://"), 0));
  return res;
}

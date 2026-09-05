import { NextResponse } from "next/server";

/** Cron routes accept the Worker's scheduled call (shared secret) or a local dev call. */
export function cronAllowed(request: Request, env: CloudflareEnv) {
  const given = request.headers.get("x-cron-secret") ?? "";
  if (env.CRON_SECRET) return given === env.CRON_SECRET;
  return new URL(request.url).hostname === "localhost"; // no secret configured: local only
}

export const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

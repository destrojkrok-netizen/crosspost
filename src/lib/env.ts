import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** The Worker's bindings and vars for this request (wrangler serves them to `next dev` too). */
export async function env(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

export class AppError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

import { SESSION_COOKIE, sessionSecret, verifySession, type Session } from "./session";

/** The signed-in user for this request; the proxy already turned strangers away, this
 * is the authoritative read route handlers scope their queries with. */
export async function requireUser(request: Request, e?: CloudflareEnv): Promise<Session> {
  const cf = e ?? (await env());
  const cookie = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(request.headers.get("cookie") ?? "")?.[1];
  const session = await verifySession(cookie, sessionSecret(cf));
  if (!session) throw new AppError("Sign in required", 401);
  return session;
}

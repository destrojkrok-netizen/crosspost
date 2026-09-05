import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionSecret, verifySession } from "@/lib/session";

// Everything needs a signed-in user except: sign-in itself, the cron (shared secret),
// public media, and the OAuth callbacks platforms redirect the browser to.
const PUBLIC = [/^\/login$/, /^\/forgot$/, /^\/reset$/, /^\/api\/auth\//, /^\/api\/cron\//, /^\/api\/media\//, /^\/api\/status$/];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();
  const { env } = await getCloudflareContext({ async: true });
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret(env));
  if (session) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

// Signed session cookie: base64url(JSON{email,name,picture,exp}) + "." + HMAC-SHA256.
// Runs in the proxy (edge) and in route handlers alike — WebCrypto only.

export const SESSION_COOKIE = "cp_session";
const TTL_MS = 30 * 864e5;

export type Session = { uid: string; email: string; name?: string; picture?: string; exp: number };

const enc = new TextEncoder();
const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(session: Omit<Session, "exp">, secret: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ ...session, exp: Date.now() + TTL_MS })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(cookie: string | undefined, secret: string): Promise<Session | null> {
  if (!cookie) return null;
  const [payload, sig] = cookie.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), unb64url(sig), enc.encode(payload));
    if (!ok) return null;
    const session = JSON.parse(new TextDecoder().decode(unb64url(payload))) as Session;
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

/** The secret sessions are signed with: SESSION_SECRET, or TOKEN_KEY as a fallback. */
export const sessionSecret = (env: CloudflareEnv) => env.SESSION_SECRET || env.TOKEN_KEY || "";

/** Who may sign in: any Google account, unless ALLOWED_EMAILS restricts it to a list. */
export function emailAllowed(env: CloudflareEnv, email: string) {
  const allowed = (env.ALLOWED_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.length === 0 || allowed.includes(email.toLowerCase());
}

export function cookieHeader(value: string, secure: boolean, maxAge = TTL_MS / 1000) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

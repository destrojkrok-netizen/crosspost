import "server-only";

// Stored credentials are AES-GCM encrypted with TOKEN_KEY (32 random bytes, base64).
// Without a key (local play) they are stored as plain JSON with a marker prefix.

const PLAIN = "plain:";
const ENC = "enc:";

async function key(raw: string) {
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function seal(value: unknown, tokenKey?: string): Promise<string> {
  const text = JSON.stringify(value);
  if (!tokenKey) return PLAIN + text;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(tokenKey), new TextEncoder().encode(text));
  return ENC + b64(iv) + "." + b64(data);
}

export async function open<T>(stored: string, tokenKey?: string): Promise<T> {
  if (stored.startsWith(PLAIN)) return JSON.parse(stored.slice(PLAIN.length)) as T;
  if (!stored.startsWith(ENC)) throw new Error("Unknown credential format");
  if (!tokenKey) throw new Error("TOKEN_KEY is not set; stored credentials cannot be read");
  const [iv, data] = stored.slice(ENC.length).split(".");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await key(tokenKey), unb64(data));
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

export const randomId = (prefix = "") =>
  prefix + [...crypto.getRandomValues(new Uint8Array(9))].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14);

export async function sha256base64url(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return b64(digest).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const randomBase64url = (bytes = 32) =>
  b64(crypto.getRandomValues(new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

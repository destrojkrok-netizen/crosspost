// Small fetch helpers the provider adapters share. Runs on Workers and Node alike.

export class HttpError extends Error {
  constructor(
    public status: number,
    public body: string,
    public url: string,
  ) {
    super(`${status} ${url.split("?")[0]}: ${body.slice(0, 400)}`);
  }
}

export async function json<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new HttpError(res.status, text, url);
  return (text ? JSON.parse(text) : {}) as T;
}

export function form(data: Record<string, string | undefined>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) if (v !== undefined) p.set(k, v);
  return p;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll `check` until it returns true; throws after `tries`. */
export async function until(check: () => Promise<boolean>, tries: number, everyMs: number, what: string) {
  for (let i = 0; i < tries; i++) {
    if (await check()) return;
    await sleep(everyMs);
  }
  throw new Error(`${what}: not ready after ${Math.round((tries * everyMs) / 1000)}s`);
}

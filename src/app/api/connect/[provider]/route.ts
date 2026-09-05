import { NextResponse } from "next/server";
import { providerContext } from "@/lib/channels";
import { randomBase64url, sha256base64url } from "@/lib/crypto";
import { oauthStates } from "@/lib/db";
import { env } from "@/lib/env";
import { provider } from "@/lib/providers";
import { bad, fail } from "../../_lib";

/** Start OAuth: remember state (+ PKCE verifier), send the browser to the platform. */
export async function GET(_: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const e = await env();
    const p = provider((await params).provider);
    if (p.auth !== "oauth" || !p.authUrl) return bad(`${p.label} is added with a form, not OAuth`);
    const missing = p.requiredEnv.filter((k) => !e[k]);
    if (missing.length) return bad(`Set ${missing.join(", ")} (wrangler secret / .dev.vars) to connect ${p.label}`);
    const state = randomBase64url(16);
    const verifier = randomBase64url(32);
    await oauthStates.put(e.DB, state, p.id, verifier);
    // X needs the S256 challenge in the URL; other providers ignore the third argument.
    const url = p.authUrl(providerContext(e, p.id), state, await sha256base64url(verifier));
    return NextResponse.redirect(url, 302);
  } catch (error) {
    return fail(error);
  }
}

import type { ProviderId } from "../types";
import { bluesky } from "./bluesky";
import { instagram } from "./instagram";
import { telegram } from "./telegram";
import { threads } from "./threads";
import { tiktok } from "./tiktok";
import type { Provider } from "./types";
import { x } from "./x";

export const PROVIDERS: Record<ProviderId, Provider> = { threads, x, instagram, tiktok, telegram, bluesky };

export const PROVIDER_LIST = Object.values(PROVIDERS);

export function provider(id: string): Provider {
  const p = PROVIDERS[id as ProviderId];
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

/** Providers whose app credentials are present, so Connect can start. Token providers always. */
export function connectable(env: CloudflareEnv): ProviderId[] {
  return PROVIDER_LIST.filter((p) => p.requiredEnv.every((k) => Boolean(env[k]))).map((p) => p.id);
}

export type { Provider, Credentials, PublishInput, PublishResult } from "./types";

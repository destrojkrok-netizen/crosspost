import "server-only";
import { open, randomId, seal } from "./crypto";
import { channels, type ChannelRow } from "./db";
import { AppError } from "./env";
import { provider } from "./providers";
import { needsRefresh, type Credentials, type ProviderContext } from "./providers/types";
import type { Channel } from "./types";

export function providerContext(env: CloudflareEnv, providerId: string): ProviderContext {
  const appUrl = env.APP_URL.replace(/\/$/, "");
  return { env, appUrl, redirectUri: `${appUrl}/api/connect/${providerId}/callback` };
}

/** Verify the credentials with the platform, then store the channel (encrypted). */
export async function createChannel(env: CloudflareEnv, userId: string, providerId: string, cred: Credentials): Promise<Channel> {
  const p = provider(providerId);
  const ctx = providerContext(env, providerId);
  const who = await p.whoami(ctx, cred);
  const row: ChannelRow = {
    id: randomId("ch_"),
    provider: p.id,
    name: cred.username ?? who.username ?? who.id,
    picture: who.picture ?? null,
    external_id: who.id,
    credentials: await seal({ ...cred, userId: cred.userId ?? who.id, username: who.username ?? cred.username }, env.TOKEN_KEY),
    disabled: 0,
    created_at: Date.now(),
    user_id: userId,
  };
  // One channel per account per user: replace an existing connection of the same account.
  for (const existing of await channels.all(env.DB, userId)) {
    if (existing.provider === p.id && existing.external_id === who.id) await channels.remove(env.DB, existing.id, userId);
  }
  await channels.insert(env.DB, row);
  return { id: row.id, name: row.name, identifier: p.id, picture: row.picture, externalId: row.external_id };
}

/** Decrypt a channel's credentials, refreshing an expiring token and persisting it. */
export async function credentialsFor(env: CloudflareEnv, row: ChannelRow): Promise<Credentials> {
  const p = provider(row.provider);
  let cred = await open<Credentials>(row.credentials, env.TOKEN_KEY);
  if (p.refresh && needsRefresh(cred)) {
    cred = await p.refresh(providerContext(env, p.id), cred);
    await channels.setCredentials(env.DB, row.id, await seal(cred, env.TOKEN_KEY));
  }
  return cred;
}

export async function requireChannel(env: CloudflareEnv, id: string, userId: string): Promise<ChannelRow> {
  const row = await channels.get(env.DB, id, userId);
  if (!row) throw new AppError("Unknown channel", 404);
  return row;
}

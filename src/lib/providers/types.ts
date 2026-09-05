import type { MediaRef, ProviderId } from "../types";

/** What a channel stores (encrypted): OAuth tokens, or a bot token / app password. */
export type Credentials = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // unix ms
  userId?: string;
  username?: string;
  // token-based providers
  botToken?: string;
  chatId?: string;
  handle?: string;
  appPassword?: string;
  did?: string;
  pdsUrl?: string;
};

export type PublishInput = {
  parts: string[]; // root text, then thread replies
  media: MediaRef[];
};

export type PublishResult = { releaseId: string; releaseUrl?: string };

/** A metric snapshot: today's totals for one subject. */
export type Snapshot = Record<string, number>;

export type ProviderContext = {
  env: CloudflareEnv;
  appUrl: string;
  redirectUri: string;
};

export type Provider = {
  id: ProviderId;
  label: string;
  limit: number; // characters per post / part
  /** "oauth": redirect flow; "token": a small form the user fills in. */
  auth: "oauth" | "token";
  /** Which env vars must be set for "Connect" to work. */
  requiredEnv: (keyof CloudflareEnv)[];
  /** For token providers: the form fields. */
  fields?: { name: keyof Credentials; label: string; placeholder?: string; secret?: boolean }[];
  supportsMedia: ("image" | "video")[];
  requiresMedia?: "image" | "video" | "any";
  supportsThread?: boolean;

  authUrl?(ctx: ProviderContext, state: string, verifier: string): string;
  exchange?(ctx: ProviderContext, code: string, verifier: string): Promise<Credentials>;
  /** Token providers: validate the form and turn it into credentials. */
  fromFields?(ctx: ProviderContext, fields: Partial<Credentials>): Promise<Credentials>;
  refresh?(ctx: ProviderContext, cred: Credentials): Promise<Credentials>;
  whoami(ctx: ProviderContext, cred: Credentials): Promise<{ id: string; username?: string; picture?: string }>;
  publish(ctx: ProviderContext, cred: Credentials, input: PublishInput): Promise<PublishResult>;
  channelStats?(ctx: ProviderContext, cred: Credentials): Promise<Snapshot>;
  postStats?(ctx: ProviderContext, cred: Credentials, releaseId: string): Promise<Snapshot>;
};

export const needsRefresh = (cred: Credentials) =>
  Boolean(cred.expiresAt && cred.expiresAt - Date.now() < 10 * 60 * 1000);

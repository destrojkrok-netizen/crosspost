// Client-safe provider facts (no server code): labels, limits, auth style, form fields.
import type { ProviderId } from "./types";

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  limit: number;
  auth: "oauth" | "token";
  fields?: { name: string; label: string; placeholder?: string; secret?: boolean }[];
  supportsThread?: boolean;
  requiresMedia?: "image" | "video" | "any";
};

export const PROVIDER_INFO: ProviderInfo[] = [
  { id: "threads", label: "Threads", limit: 500, auth: "oauth", supportsThread: true },
  { id: "x", label: "X (Twitter)", limit: 280, auth: "oauth", supportsThread: true },
  { id: "instagram", label: "Instagram", limit: 2200, auth: "oauth", requiresMedia: "any" },
  { id: "tiktok", label: "TikTok", limit: 2200, auth: "oauth", requiresMedia: "video" },
  {
    id: "telegram",
    label: "Telegram",
    limit: 4096,
    auth: "token",
    fields: [
      { name: "botToken", label: "Bot token (from @BotFather)", placeholder: "123456:ABC…", secret: true },
      { name: "chatId", label: "Channel @username or chat id", placeholder: "@levelup_channel" },
    ],
  },
  {
    id: "bluesky",
    label: "Bluesky",
    limit: 300,
    auth: "token",
    supportsThread: true,
    fields: [
      { name: "handle", label: "Handle", placeholder: "you.bsky.social" },
      { name: "appPassword", label: "App password (Settings → App passwords)", secret: true },
    ],
  },
];

export const providerInfo = (id: string) => PROVIDER_INFO.find((p) => p.id === id);
export const providerLabel = (id: string) => providerInfo(id)?.label ?? id;
export const providerLimit = (id: string) => providerInfo(id)?.limit ?? 5000;

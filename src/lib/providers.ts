// The platforms Postiz can connect (identifier as Postiz reports it in `integrations`).
export const PROVIDERS: { id: string; label: string; limit: number }[] = [
  { id: "x", label: "X (Twitter)", limit: 280 },
  { id: "linkedin", label: "LinkedIn", limit: 3000 },
  { id: "linkedin-page", label: "LinkedIn Page", limit: 3000 },
  { id: "instagram", label: "Instagram", limit: 2200 },
  { id: "instagram-standalone", label: "Instagram (standalone)", limit: 2200 },
  { id: "facebook", label: "Facebook Page", limit: 63206 },
  { id: "threads", label: "Threads", limit: 500 },
  { id: "tiktok", label: "TikTok", limit: 2200 },
  { id: "youtube", label: "YouTube", limit: 5000 },
  { id: "pinterest", label: "Pinterest", limit: 500 },
  { id: "reddit", label: "Reddit", limit: 40000 },
  { id: "bluesky", label: "Bluesky", limit: 300 },
  { id: "mastodon", label: "Mastodon", limit: 500 },
  { id: "telegram", label: "Telegram", limit: 4096 },
  { id: "discord", label: "Discord", limit: 2000 },
  { id: "slack", label: "Slack", limit: 4000 },
  { id: "medium", label: "Medium", limit: 100000 },
  { id: "dev.to", label: "DEV Community", limit: 100000 },
  { id: "hashnode", label: "Hashnode", limit: 100000 },
  { id: "dribbble", label: "Dribbble", limit: 1000 },
  { id: "lemmy", label: "Lemmy", limit: 10000 },
  { id: "vk", label: "VK", limit: 4096 },
  { id: "nostr", label: "Nostr", limit: 5000 },
  { id: "warpcast", label: "Farcaster (Warpcast)", limit: 1024 },
];

export const providerLabel = (id: string) => PROVIDERS.find((p) => p.id === id)?.label ?? id;
export const providerLimit = (id: string) => PROVIDERS.find((p) => p.id === id)?.limit ?? 5000;

export type ProviderId = "threads" | "x" | "instagram" | "tiktok" | "telegram" | "bluesky";

export type Channel = {
  id: string;
  name: string;
  identifier: ProviderId; // provider
  picture?: string | null;
  disabled?: boolean;
  profile?: string | null;
  externalId?: string | null;
};

export type MediaRef = { id: string; path: string; type?: string };

export type CreatePostBody = {
  type: "now" | "schedule" | "draft";
  date: string; // ISO 8601
  posts: {
    integration: { id: string };
    /** Root text, then thread replies (X / Threads / Bluesky); other providers join them. */
    value: { content: string; image: MediaRef[] }[];
  }[];
};

export type PostState = "DRAFT" | "QUEUE" | "PUBLISHING" | "PUBLISHED" | "ERROR";

export type QueuedPost = {
  id: string;
  group?: string;
  content: string;
  parts?: string[];
  media?: MediaRef[];
  publishDate: string;
  state?: PostState | string;
  releaseURL?: string | null;
  error?: string | null;
  integration?: { id: string; name?: string; providerIdentifier?: string; picture?: string | null };
};

export type MetricSeries = {
  label: string;
  percentageChange?: number;
  data: { date: string; total: number }[];
};

export type AppStatus = {
  configured: boolean;
  demo: boolean;
  appUrl: string;
  /** Providers whose app credentials are set, so "Connect" can work. */
  connectable: ProviderId[];
};

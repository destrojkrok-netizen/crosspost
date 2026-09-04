export type Channel = {
  id: string;
  name: string;
  identifier: string; // provider: "x", "linkedin", "instagram", ...
  picture?: string | null;
  disabled?: boolean;
  profile?: string | null;
  custom?: boolean; // added from this app (demo mode only)
};

export type NewChannel = { name: string; identifier: string; picture?: string | null };

export type MediaRef = { id: string; path: string };

export type PostValue = { content: string; image: MediaRef[]; delay?: number };

export type CreatePostBody = {
  type: "now" | "schedule" | "draft";
  date: string; // ISO 8601
  shortLink: boolean;
  tags: string[];
  posts: {
    integration: { id: string };
    value: PostValue[];
    settings?: Record<string, unknown>;
  }[];
};

export type QueuedPost = {
  id: string;
  group?: string;
  content: string;
  publishDate: string;
  state?: string; // QUEUE | PUBLISHED | ERROR | DRAFT
  releaseURL?: string | null;
  integration?: { id: string; name?: string; providerIdentifier?: string; picture?: string | null };
};

// One metric series from Postiz analytics: a label, daily points, and the change over the window.
export type MetricSeries = {
  label: string;
  percentageChange?: number;
  data: { date: string; total: number }[];
};

export type AppStatus = { configured: boolean; demo: boolean; apiUrl: string; postizUrl: string };

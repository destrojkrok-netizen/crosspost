// Bindings and vars the Worker receives; `getCloudflareContext().env` is typed with this.
// Binding types are imported (not the global workers-types lib) so DOM types stay intact.
import type { D1Database, Fetcher, R2Bucket } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    MEDIA: R2Bucket;
    ASSETS: Fetcher;
    APP_URL: string;
    MEDIA_PUBLIC_URL?: string;
    TOKEN_KEY?: string;
    CRON_SECRET?: string;
    THREADS_APP_ID?: string;
    THREADS_APP_SECRET?: string;
    X_CLIENT_ID?: string;
    X_CLIENT_SECRET?: string;
    TIKTOK_CLIENT_KEY?: string;
    TIKTOK_CLIENT_SECRET?: string;
    IG_APP_ID?: string;
    IG_APP_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    SESSION_SECRET?: string;
    ALLOWED_EMAILS?: string;
    OWNER_EMAILS?: string;
    RESEND_API_KEY?: string;
    MAIL_FROM?: string;
  }
}

export {};

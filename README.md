# Crosspost

Self-hosted Postiz alternative: write once, publish to Threads, X, Instagram, TikTok,
Telegram and Bluesky through their own APIs. Runs on Cloudflare Workers (D1, R2, Cron).
No third-party posting service in the middle.

## Accounts

Sign-in is Google OAuth or email + password (PBKDF2-SHA256 hashes in D1); every account gets its own workspace (channels, queue,
media, analytics). Create an OAuth client at console.cloud.google.com (Web application)
with redirect URI `<APP_URL>/api/auth/google/callback` and set `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET`. `ALLOWED_EMAILS` (optional) restricts sign-in to a list;
`OWNER_EMAILS` inherit channels that were created before accounts existed. Sessions are
HMAC-signed cookies (`SESSION_SECRET`, falls back to `TOKEN_KEY`), 30 days. Password reset
emails go through Resend: set `RESEND_API_KEY` (secret) and `MAIL_FROM`; locally without a
key the reset link is printed and shown on the page.

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars        # APP_URL, TOKEN_KEY (openssl rand -base64 32), app keys
npm run db:migrate:local
npm run dev                          # http://localhost:3000, with local D1 + R2 via wrangler
```

Add channels from the UI: Telegram (bot token + chat) and Bluesky (handle + app password)
work at once; Threads / X / Instagram / TikTok need your own developer app, with the
redirect URI `<APP_URL>/api/connect/<provider>/callback` and the keys in `.dev.vars`.

Scheduled posts are published by the cron tick. Locally, trigger it by hand:

```bash
curl -X POST localhost:3000/api/cron/publish -H 'x-cron-secret: dev'
curl -X POST localhost:3000/api/cron/metrics -H 'x-cron-secret: dev'
```

## Deploy to Cloudflare Workers

```bash
npx wrangler login
npx wrangler d1 create crosspost         # paste database_id into wrangler.jsonc
npx wrangler r2 bucket create crosspost-media
npm run db:migrate                       # remote
npx wrangler secret put TOKEN_KEY        # openssl rand -base64 32
npx wrangler secret put CRON_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put RESEND_API_KEY        # password reset emails
npx wrangler secret put THREADS_APP_ID   # …and the other platform keys you use
npm run cf:deploy
```

Set `APP_URL` in `wrangler.jsonc` to the deployed URL (it is the OAuth redirect base).
For TikTok / Instagram / Threads media, make the R2 bucket public (or attach a domain) and
put that base URL into `MEDIA_PUBLIC_URL`; otherwise media is served by the app itself.

## What it does

- Channels: OAuth connect (Threads, X with PKCE, Instagram, TikTok) or token form
  (Telegram bot, Bluesky app password). Tokens are AES-GCM encrypted in D1 and refreshed
  before they expire.
- Composer: shared text with per-channel overrides, live limits per platform, threads via
  `---` lines (X, Threads, Bluesky), media to R2.
- Post now / schedule / draft. A cron tick every minute claims due posts atomically and
  publishes them; transient failures retry up to 3 times, the rest land as ERROR with the
  message on the row.
- Analytics: hourly cron snapshots followers / views / likes / replies per channel and per
  post into `metrics`; the UI polls and charts the history (Recharts).
- Responsive: three columns on desktop, Compose / Queue / Stats tabs on phones.

## Layout

```
worker.ts                  Worker entry: OpenNext handler + scheduled() → /api/cron/*
migrations/                D1 schema
src/lib/providers/*        one adapter per platform (auth, publish, stats)
src/lib/db.ts              D1 queries
src/lib/channels.ts        connect + credential refresh
src/lib/publisher.ts       claim due posts, publish, retry
src/lib/metrics.ts         snapshots and chart series
src/proxy.ts               sign-in gate (everything but /login, auth, cron, media)
src/lib/session.ts         signed session cookie
src/app/api/*              routes
src/components/*           App, ChannelPicker, AddChannelDialog, Composer, Queue, Analytics
```

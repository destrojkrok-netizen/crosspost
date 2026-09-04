# Crosspost

Write once, publish to every connected channel. A thin web UI over the
[Postiz](https://postiz.com) public API: Postiz holds the OAuth connections to 28+
platforms; this app is the composer and queue.

## Run

```bash
npm install
cp .env.example .env.local   # add POSTIZ_API_KEY (Postiz → Settings → Public API)
npm run dev                  # http://localhost:3000
```

Without a key the app runs in **demo mode** with six fake channels and an in-memory queue.

## What it does

- Channels: pick all / none / individual; **Add channel** — in demo mode a local channel of any of the 24 platforms (kept in `data/demo-channels.json`), with a Postiz key a guided "connect in Postiz → refresh list" flow (OAuth lives in Postiz; the public API has no connect endpoint).
- One shared text; per-channel override tabs; live character count against each
  platform's limit (fetched from Postiz), with over-limit channels flagged.
- Media: drag-drop or pick; uploaded to Postiz first (TikTok, Instagram, YouTube reject
  external URLs).
- Post now, schedule, or save as draft — one request fans out to every selected channel.
- Queue: cross-posts grouped, state badges, link to the published post, delete.
- Analytics: followers / impressions / likes per channel over 7, 30, or 90 days (Recharts). **Refreshes itself** every 60 s while the tab is visible, immediately after a "Post now", and on tab focus; the queue re-polls every 30 s so `queue → published` shows up without a reload.
- Post stats: on a published row, the chart icon shows views / likes / comments per platform, polled on the same cadence.
- Responsive: three columns on desktop, Compose / Queue / Stats tabs on phones and tablets.

Stack: Next.js 16 (App Router), Tailwind v4, shadcn/ui, Recharts, lucide icons.

## Layout

```
src/lib/postiz.ts        server-only client (key never reaches the browser)
src/lib/demo.ts          demo-mode data
src/app/api/*            route handlers proxying to Postiz
src/components/*         App (state), ChannelPicker, Composer, Queue, Analytics, ProviderBadge
src/components/ui/*      shadcn/ui primitives
src/hooks/use-is-desktop matchMedia hook that picks the desktop or tabbed layout
src/hooks/use-polling    visibility-aware interval used by the queue, analytics, and post stats
src/lib/providers.ts     the 24 Postiz platforms and their character limits
```

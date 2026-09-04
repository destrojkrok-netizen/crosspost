"use client";

import { useCallback, useMemo, useState } from "react";
import { BarChart3, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import type { Channel, MetricSeries, QueuedPost } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePolling } from "@/hooks/use-polling";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "./ProviderBadge";

const STATE_STYLE: Record<string, string> = {
  QUEUE: "border-primary/40 text-primary",
  PUBLISHED: "border-success/40 text-success",
  ERROR: "border-destructive/40 text-destructive",
  DRAFT: "text-muted-foreground",
};

const POST_STATS_POLL_MS = 60_000;

export function Queue({
  posts,
  channels,
  now,
  refreshKey,
  onDelete,
  onRefresh,
}: {
  posts: QueuedPost[];
  channels: Channel[];
  now: number; // set by the parent when posts load, so rendering stays pure
  refreshKey: number;
  onDelete: (post: QueuedPost) => void;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");
  const [open, setOpen] = useState<Set<string>>(new Set()); // rows showing post stats
  const byId = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels]);

  // One row per group: a cross-post is several Postiz posts sharing a group id.
  const rows = useMemo(() => {
    const groups = new Map<string, QueuedPost[]>();
    for (const p of posts) {
      const key = p.group ?? p.id;
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    return [...groups.values()]
      .map((items) => ({
        key: items[0].group ?? items[0].id,
        items,
        when: Date.parse(items[0].publishDate),
      }))
      // Upcoming keeps what just went out for an hour, so a "post now" does not vanish.
      .filter(
        (g) =>
          filter === "all" || g.when >= now - 36e5 || g.items.some((i) => i.state === "QUEUE"),
      )
      .sort((a, b) => (filter === "all" ? b.when - a.when : a.when - b.when));
  }, [posts, filter, now]);

  const toggleStats = (key: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Card className="h-fit min-w-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">Queue</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            className={cn(filter === "upcoming" && "text-foreground")}
            onClick={() => setFilter("upcoming")}
          >
            Upcoming
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className={cn(filter === "all" && "text-foreground")}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onRefresh} aria-label="Refresh">
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing {filter === "upcoming" ? "scheduled" : "here"} yet.
          </p>
        ) : (
          <ScrollArea className="lg:max-h-[70vh]">
            <ul className="space-y-2">
              {rows.map((g) => {
                const first = g.items[0];
                const state = first.state ?? "QUEUE";
                const published = g.items.filter((p) => p.state === "PUBLISHED");
                const showStats = open.has(g.key);
                return (
                  <li key={g.key} className="rounded-lg border bg-background/40 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <time dateTime={first.publishDate} suppressHydrationWarning>
                        {formatWhen(g.when, now)}
                      </time>
                      <Badge
                        variant="outline"
                        className={cn("ml-auto capitalize", STATE_STYLE[state] ?? STATE_STYLE.QUEUE)}
                      >
                        {state.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="mt-1.5 line-clamp-3 text-sm">
                      {first.content || <em className="text-muted-foreground">media only</em>}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {g.items.map((p) => (
                        <ProviderBadge
                          key={p.id}
                          size="md"
                          provider={
                            p.integration?.providerIdentifier ??
                            byId.get(p.integration?.id ?? "")?.identifier ??
                            "?"
                          }
                        />
                      ))}
                      {first.releaseURL && (
                        <a
                          href={first.releaseURL}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open post"
                          className={buttonVariants({ variant: "ghost", size: "icon-xs" })}
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      {published.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-pressed={showStats}
                          aria-label="Post stats"
                          className={cn(showStats && "text-primary")}
                          onClick={() => toggleStats(g.key)}
                        >
                          <BarChart3 className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="ml-auto hover:text-destructive"
                        onClick={() => onDelete(first)}
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    {showStats && (
                      <div className="mt-2 grid gap-1.5 border-t pt-2">
                        {published.map((p) => (
                          <PostStats
                            key={p.id}
                            post={p}
                            provider={
                              p.integration?.providerIdentifier ??
                              byId.get(p.integration?.id ?? "")?.identifier ??
                              "?"
                            }
                            refreshKey={refreshKey}
                          />
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

/** Views, likes, comments for one published post; refreshes with the same cadence as the
 * channel analytics so new engagement shows up without a reload. */
function PostStats({
  post,
  provider,
  refreshKey,
}: {
  post: QueuedPost;
  provider: string;
  refreshKey: number;
}) {
  const [stats, setStats] = useState<MetricSeries[] | { missing: true } | null>(null);
  const load = useCallback(async () => {
    const r = await fetch(`/api/analytics/post/${encodeURIComponent(post.id)}?days=7`, {
      cache: "no-store",
    });
    if (r.ok) setStats(await r.json());
  }, [post.id]);
  usePolling(load, POST_STATS_POLL_MS, [load, refreshKey]);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <ProviderBadge provider={provider} />
      {stats === null ? (
        <span className="text-muted-foreground">loading…</span>
      ) : "missing" in stats ? (
        <span className="text-muted-foreground">
          no post id from the platform yet (resolve in Postiz: posts:connect)
        </span>
      ) : stats.length === 0 ? (
        <span className="text-muted-foreground">no stats yet</span>
      ) : (
        stats.map((s) => {
          const last = s.data[s.data.length - 1]?.total ?? 0;
          return (
            <span key={s.label} className="tabular-nums">
              <span className="text-muted-foreground">{s.label.toLowerCase()} </span>
              <b>{last.toLocaleString()}</b>
            </span>
          );
        })
      )}
    </div>
  );
}

function formatWhen(ts: number, now: number) {
  if (Number.isNaN(ts)) return "—";
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  });
}

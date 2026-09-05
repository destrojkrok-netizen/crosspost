"use client";

import { useCallback, useState } from "react";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Channel, MetricSeries } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePolling } from "@/hooks/use-polling";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "./ProviderBadge";

const WINDOWS = [7, 30, 90] as const;
export const ANALYTICS_POLL_MS = 60_000;

export function Analytics({
  channels,
  refreshKey,
}: {
  channels: Channel[];
  refreshKey: number; // bumped by the parent after a publish, so numbers refresh at once
}) {
  const [channelId, setChannelId] = useState<string>("");
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const [series, setSeries] = useState<MetricSeries[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const active = channels.find((c) => c.id === channelId) ?? channels[0];
  const activeId = active?.id ?? "";

  const load = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/analytics/${encodeURIComponent(activeId)}?days=${days}`, {
        cache: "no-store",
      });
      const data = (await r.json()) as MetricSeries[] & { error?: string };
      if (!r.ok) throw new Error(data.error ?? "Analytics unavailable");
      setSeries(data as MetricSeries[]);
      setError(null);
      setUpdatedAt(Date.now());
    } catch (e) {
      setSeries([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [activeId, days]);

  // Refreshes on its own: every minute while the tab is visible, and after a publish.
  usePolling(load, ANALYTICS_POLL_MS, [load, refreshKey]);

  const shown = series?.[Math.min(metric, Math.max(0, (series?.length ?? 1) - 1))];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          Analytics
          <LiveDot updatedAt={updatedAt} loading={loading} />
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 overflow-x-auto">
            {channels.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannelId(c.id)}
                aria-pressed={c.id === activeId}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs transition",
                  c.id === activeId ? "bg-primary/15 ring-1 ring-primary/60" : "text-muted-foreground hover:bg-accent",
                )}
              >
                <ProviderBadge provider={c.identifier} />
                <span className="max-w-[7rem] truncate">{c.name}</span>
              </button>
            ))}
          </div>
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as typeof days)}>
            <TabsList>
              {WINDOWS.map((w) => (
                <TabsTrigger key={w} value={String(w)}>
                  {w}d
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="icon-xs" onClick={() => void load()} aria-label="Refresh analytics">
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!active ? (
          <p className="text-sm text-muted-foreground">Add a channel to see its numbers.</p>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : !series ? (
          <div className="h-56 animate-pulse rounded-md bg-muted/50" />
        ) : series.length === 0 ? (
          <p className="text-sm text-muted-foreground">No analytics for this channel yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
            {/* Stat tiles double as the metric switch. */}
            <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
              {series.map((s, i) => {
                const last = s.data[s.data.length - 1]?.total ?? 0;
                const delta = s.percentageChange ?? 0;
                return (
                  <Button
                    key={s.label}
                    variant="ghost"
                    onClick={() => setMetric(i)}
                    aria-pressed={i === metric}
                    className={cn(
                      "h-auto flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left",
                      i === metric ? "border-primary/60 bg-primary/10" : "border-transparent",
                    )}
                  >
                    <span className="text-[11px] text-muted-foreground">{s.label}</span>
                    <span className="text-lg font-semibold tabular-nums">{last.toLocaleString()}</span>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[11px] tabular-nums",
                        delta >= 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {delta > 0 ? "+" : ""}
                      {delta}%
                    </span>
                  </Button>
                );
              })}
            </div>
            <div className="h-56 min-w-0">
              {shown && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={shown.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => d.slice(5)}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      width={44}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                    />
                    <ChartTooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "var(--muted-foreground)" }}
                      itemStyle={{ color: "var(--foreground)" }}
                      formatter={(v) => [Number(v).toLocaleString(), shown.label]}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LiveDot({ updatedAt, loading }: { updatedAt: number | null; loading: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground">
      <span
        className={cn(
          "inline-block size-1.5 rounded-full",
          loading ? "animate-pulse bg-warning" : "bg-success",
        )}
      />
      {updatedAt ? (
        <time dateTime={new Date(updatedAt).toISOString()} suppressHydrationWarning>
          updated {new Date(updatedAt).toLocaleTimeString()}
        </time>
      ) : (
        "live"
      )}
    </span>
  );
}

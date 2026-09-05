"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, CalendarClock, PenSquare, Radio } from "lucide-react";
import type { AppStatus, Channel, CreatePostBody, MediaRef, QueuedPost } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { usePolling } from "@/hooks/use-polling";
import { cn } from "@/lib/utils";
import { AddChannelDialog } from "./AddChannelDialog";
import { Analytics } from "./Analytics";
import { ChannelPicker } from "./ChannelPicker";
import { Composer } from "./Composer";
import { Queue } from "./Queue";

type Toast = { kind: "ok" | "error"; text: string };

const POSTS_POLL_MS = 30_000; // queue states move (queue → published) without a reload

export function App({
  status,
  initialChannels,
  initialPosts,
  initialNow,
  initialError,
}: {
  status: AppStatus;
  initialChannels: Channel[];
  initialPosts: QueuedPost[];
  initialNow: number;
  initialError: string | null;
}) {
  const isDesktop = useIsDesktop();
  const [channels, setChannels] = useState(initialChannels);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [posts, setPosts] = useState<QueuedPost[]>(initialPosts);
  const [now, setNow] = useState(initialNow);
  const [refreshKey, setRefreshKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<Toast | null>(
    initialError ? { kind: "error", text: initialError } : null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const loadPosts = useCallback(async () => {
    const res = await fetch("/api/posts", { cache: "no-store" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) return notify({ kind: "error", text: data.error ?? "Could not load posts" });
    setPosts(data as QueuedPost[]);
    setNow(Date.now());
  }, [notify]);

  // The initial list came with the HTML; the poll keeps queue states current.
  usePolling(loadPosts, POSTS_POLL_MS, []);

  const refreshChannels = useCallback(async () => {
    const res = await fetch("/api/integrations", { cache: "no-store" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) return notify({ kind: "error", text: data.error ?? "Could not load channels" });
    const list = data as Channel[];
    setChannels(list);
    setSelected((s) => new Set([...s].filter((id) => list.some((c) => c.id === id))));
  }, [notify]);

  // Back from an OAuth callback: show the outcome, drop the query, reload channels.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const connected = q.get("connected");
    const failed = q.get("connect_error");
    if (!connected && !failed) return;
    window.history.replaceState(null, "", "/");
    const t = setTimeout(() => {
      notify(connected ? { kind: "ok", text: `Connected ${connected}` } : { kind: "error", text: failed! });
      if (connected) void refreshChannels();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A channel's character limit is fetched the first time it is selected.
  const ensureLimit = useCallback(
    (id: string) => {
      if (id in limits) return;
      setLimits((l) => ({ ...l, [id]: 0 }));
      fetch(`/api/settings/${encodeURIComponent(id)}`)
        .then((r) => r.json())
        .then((s: { maxLength?: number }) => setLimits((l) => ({ ...l, [id]: Number(s?.maxLength) || 0 })))
        .catch(() => undefined);
    },
    [limits],
  );

  const selectedChannels = useMemo(
    () => channels.filter((c) => selected.has(c.id)),
    [channels, selected],
  );

  const toggle = (id: string) => {
    ensureLimit(id);
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    const ids = channels.filter((c) => !c.disabled).map((c) => c.id);
    ids.forEach(ensureLimit);
    setSelected(new Set(ids));
  };

  const removeChannel = async (channel: Channel) => {
    const res = await fetch(`/api/integrations/${encodeURIComponent(channel.id)}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return notify({ kind: "error", text: data.error ?? "Could not remove the channel" });
    }
    setChannels((all) => all.filter((c) => c.id !== channel.id));
    setSelected((s) => {
      const next = new Set(s);
      next.delete(channel.id);
      return next;
    });
    notify({ kind: "ok", text: `Removed ${channel.name}` });
  };

  const submit = async (
    type: CreatePostBody["type"],
    date: string,
    texts: Record<string, string>,
    media: MediaRef[],
  ) => {
    const body: CreatePostBody = {
      type,
      date,
      posts: selectedChannels.map((c) => ({
        integration: { id: c.id },
        // "---" on its own line splits a thread; providers without threads join the parts.
        value: (texts[c.id] ?? texts.__base ?? "")
          .split(/\n\s*---\s*\n/)
          .map((content, i) => ({ content, image: i === 0 ? media : [] })),
      })),
    };
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string; errors?: string[] };
    if (!res.ok && res.status !== 207) {
      notify({ kind: "error", text: data.error ?? "Failed" });
      return false;
    }
    if (data.errors?.length) {
      notify({ kind: "error", text: `Some channels failed: ${data.errors.join(" · ")}` });
      void loadPosts();
      return true;
    }
    const n = selectedChannels.length;
    notify({
      kind: "ok",
      text:
        type === "draft"
          ? `Draft saved for ${n} channel${n === 1 ? "" : "s"}`
          : type === "now"
            ? `Publishing to ${n} channel${n === 1 ? "" : "s"}`
            : `Scheduled for ${n} channel${n === 1 ? "" : "s"}`,
    });
    void loadPosts();
    if (type === "now") setRefreshKey((k) => k + 1);
    return true;
  };

  const remove = async (post: QueuedPost) => {
    const id = post.group ?? post.id;
    const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return notify({ kind: "error", text: data.error ?? "Delete failed" });
    }
    notify({ kind: "ok", text: "Deleted" });
    void loadPosts();
  };

  const picker = (
    <ChannelPicker
      channels={channels}
      selected={selected}
      demo={false}
      onToggle={toggle}
      onSelectAll={selectAll}
      onClear={() => setSelected(new Set())}
      onAdd={() => setAdding(true)}
      onRemove={removeChannel}
      onRefresh={() => void refreshChannels()}
    />
  );
  const composer = (
    <Composer
      channels={selectedChannels}
      limits={limits}
      onSubmit={submit}
      onError={(text) => notify({ kind: "error", text })}
    />
  );
  const queue = (
    <Queue
      posts={posts}
      channels={channels}
      now={now}
      refreshKey={refreshKey}
      onDelete={remove}
      onRefresh={loadPosts}
    />
  );
  const analytics = <Analytics channels={channels} refreshKey={refreshKey} />;

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="inline-block h-6 w-6 rounded-md bg-gradient-to-br from-primary to-chart-4" />
          <span className="font-semibold tracking-tight">Crosspost</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Write once, publish everywhere.
          </span>
          <div className="ml-auto">
            {status.demo ? (
              <Badge variant="outline" className="border-warning/40 text-warning">
                <Radio className="size-3" />
                Database not ready
              </Badge>
            ) : (
              <Badge variant="outline" className="border-success/40 text-success">
                <Radio className="size-3" />
                {status.appUrl ? new URL(status.appUrl).host : "self-hosted"}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Phone and tablet: one panel at a time; desktop: three columns, analytics below. */}
      {!isDesktop ? (
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6">
          <Tabs defaultValue="compose">
            <TabsList className="w-full">
              <TabsTrigger value="compose" className="flex-1">
                <PenSquare className="size-4" /> Compose
                {selected.size > 0 && (
                  <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-[10px] text-primary">
                    {selected.size}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="queue" className="flex-1">
                <CalendarClock className="size-4" /> Queue
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex-1">
                <BarChart3 className="size-4" /> Stats
              </TabsTrigger>
            </TabsList>
            <TabsContent value="compose" className="mt-4 space-y-4">
              {picker}
              {composer}
            </TabsContent>
            <TabsContent value="queue" className="mt-4">
              {queue}
            </TabsContent>
            <TabsContent value="analytics" className="mt-4">
              {analytics}
            </TabsContent>
          </Tabs>
        </main>
      ) : (
        <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)_320px] xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          {picker}
          {composer}
          {queue}
          <div className="lg:col-span-3">{analytics}</div>
        </main>
      )}

      <AddChannelDialog
        open={adding}
        onOpenChange={setAdding}
        status={status}
        onAdded={(channel) => {
          setChannels((all) => [...all, channel]);
          notify({ kind: "ok", text: `Added ${channel.name}` });
        }}
      />

      {toast && (
        <div
          role="status"
          className={cn(
            "fixed bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-lg border bg-card px-4 py-2.5 text-sm shadow-xl",
            toast.kind === "ok" ? "border-success/40 text-success" : "border-destructive/40 text-destructive",
          )}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

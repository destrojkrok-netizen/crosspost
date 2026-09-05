"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Send, CalendarClock, FileText, X } from "lucide-react";
import type { Channel, CreatePostBody, MediaRef } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "./ProviderBadge";

const BASE = "__base";

function localDefault(minutesAhead = 15) {
  const d = new Date(Date.now() + minutesAhead * 60e3);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Media = MediaRef & { name: string; preview?: string };
const THREAD_HINT = "Put --- on its own line to start a thread reply (X, Threads, Bluesky).";

export function Composer({
  channels,
  limits,
  onSubmit,
  onError,
}: {
  channels: Channel[];
  limits: Record<string, number>;
  onSubmit: (
    type: CreatePostBody["type"],
    dateIso: string,
    texts: Record<string, string>,
    media: MediaRef[],
  ) => Promise<boolean>;
  onError: (text: string) => void;
}) {
  const [texts, setTexts] = useState<Record<string, string>>({ [BASE]: "" });
  const [tab, setTab] = useState<string>(BASE);
  const [media, setMedia] = useState<Media[]>([]);
  const [when, setWhen] = useState(() => localDefault());
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const activeTab = channels.some((c) => c.id === tab) ? tab : BASE;
  const value = texts[activeTab] ?? texts[BASE];

  const overLimit = useMemo(
    () =>
      channels.filter((c) => {
        const limit = limits[c.id];
        return limit > 0 && (texts[c.id] ?? texts[BASE]).length > limit;
      }),
    [channels, limits, texts],
  );

  const edit = (v: string) => setTexts((t) => ({ ...t, [activeTab]: v }));
  const resetOverride = (id: string) =>
    setTexts((t) => {
      const next = { ...t };
      delete next[id];
      return next;
    });

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading((n) => n + files.length);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = (await res.json()) as { error?: string; path: string; type?: string };
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        setMedia((m) => [
          ...m,
          {
            id: Math.random().toString(36).slice(2, 9),
            path: data.path,
            type: data.type ?? file.type,
            name: file.name,
            preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
          },
        ]);
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const ready =
    channels.length > 0 && (value.trim().length > 0 || media.length > 0) && overLimit.length === 0;

  const go = async (type: CreatePostBody["type"]) => {
    if (!ready || busy) return;
    const date = type === "now" ? new Date() : new Date(when);
    if (Number.isNaN(date.getTime())) return onError("Pick a valid date");
    if (type === "schedule" && date.getTime() < Date.now())
      return onError("Scheduled time is in the past");
    setBusy(type);
    const ok = await onSubmit(type, date.toISOString(), texts, media.map(({ id, path, type: t }) => ({ id, path, type: t })));
    setBusy(null);
    if (ok) {
      setTexts({ [BASE]: "" });
      setMedia([]);
      setTab(BASE);
      setWhen(localDefault());
    }
  };

  return (
    <Card className="min-w-0">
      <CardContent className="flex flex-col gap-4 pt-6">
        {/* Per-channel tabs: shared text, then one tab per selected channel. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <TabButton active={activeTab === BASE} onClick={() => setTab(BASE)}>
            All channels
          </TabButton>
          {channels.map((c) => (
            <TabButton
              key={c.id}
              active={activeTab === c.id}
              warn={overLimit.some((o) => o.id === c.id)}
              onClick={() => setTab(c.id)}
            >
              <ProviderBadge provider={c.identifier} />
              <span className="max-w-[8rem] truncate">{c.name}</span>
              {c.id in texts && <span className="text-[10px] text-primary">edited</span>}
            </TabButton>
          ))}
          {channels.length === 0 && (
            <span className="pl-1 text-xs text-muted-foreground">Pick channels to start.</span>
          )}
        </div>

        <div className="relative">
          <Textarea
            value={value}
            onChange={(e) => edit(e.target.value)}
            placeholder={
              activeTab === BASE
                ? "What do you want to say?"
                : `Custom text for ${channels.find((c) => c.id === activeTab)?.name}. Leave empty to use the shared text.`
            }
            rows={8}
            className="min-h-40 resize-y text-[15px] leading-relaxed"
          />
          {activeTab !== BASE && activeTab in texts && (
            <Button
              variant="secondary"
              size="xs"
              className="absolute right-2 top-2"
              onClick={() => resetOverride(activeTab)}
            >
              Use shared text
            </Button>
          )}
        </div>

        {channels.length > 0 && <p className="text-[11px] text-muted-foreground">{THREAD_HINT}</p>}
        {channels.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {channels.map((c) => {
              const limit = limits[c.id] || 0;
              const len = (texts[c.id] ?? texts[BASE]).length;
              const over = limit > 0 && len > limit;
              return (
                <li
                  key={c.id}
                  className={cn("flex items-center gap-1.5", over ? "text-destructive" : "text-muted-foreground")}
                >
                  <ProviderBadge provider={c.identifier} />
                  <span className="font-mono tabular-nums">
                    {len}
                    {limit > 0 ? `/${limit}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void upload(e.dataTransfer.files);
          }}
          className="rounded-lg border border-dashed p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            {media.map((m) => (
              <div key={m.id} className="group relative size-16 overflow-hidden rounded-md bg-muted">
                {m.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.preview} alt={m.name} className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center break-all p-1 text-center text-[10px] text-muted-foreground">
                    {m.name}
                  </span>
                )}
                <button
                  aria-label={`Remove ${m.name}`}
                  onClick={() => setMedia((all) => all.filter((x) => x.id !== m.id))}
                  className="absolute right-0.5 top-0.5 hidden rounded bg-black/70 p-0.5 group-hover:block"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {uploading > 0 && (
              <div className="size-16 animate-pulse rounded-md bg-muted" aria-label="Uploading" />
            )}
            <Button variant="outline" className="h-16" onClick={() => fileInput.current?.click()}>
              <ImagePlus className="size-4" />
              Add media
            </Button>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept="image/*,video/*"
              hidden
              onChange={(e) => {
                void upload(e.target.files);
                e.target.value = "";
              }}
            />
            <span className="text-xs text-muted-foreground">
              or drop files · stored in R2, platforms fetch them by URL
            </span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="size-4" />
            <Input
              type="datetime-local"
              suppressHydrationWarning
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-auto"
              aria-label="Schedule for"
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button variant="outline" disabled={!ready || busy !== null} onClick={() => go("draft")}>
              <FileText className="size-4" />
              {busy === "draft" ? "Saving…" : "Draft"}
            </Button>
            <Button variant="secondary" disabled={!ready || busy !== null} onClick={() => go("now")}>
              <Send className="size-4" />
              {busy === "now" ? "Publishing…" : "Post now"}
            </Button>
            <Button disabled={!ready || busy !== null} onClick={() => go("schedule")}>
              <CalendarClock className="size-4" />
              {busy === "schedule"
                ? "Scheduling…"
                : `Schedule${channels.length ? ` · ${channels.length}` : ""}`}
            </Button>
          </div>
        </div>
        {overLimit.length > 0 && (
          <p className="text-xs text-destructive">
            Too long for {overLimit.map((c) => c.name).join(", ")}. Shorten the shared text or write a
            custom version in that channel&apos;s tab.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  warn,
  onClick,
  children,
}: {
  active: boolean;
  warn?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition",
        active ? "bg-primary/15 text-foreground ring-1 ring-primary/60" : "text-muted-foreground hover:bg-accent",
        warn && "ring-1 ring-destructive/60",
      )}
    >
      {children}
    </button>
  );
}

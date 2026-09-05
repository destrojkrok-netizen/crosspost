"use client";

import { useState } from "react";
import { ExternalLink, KeyRound, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PROVIDER_INFO, type ProviderInfo } from "@/lib/providers-public";
import type { AppStatus, Channel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "./ProviderBadge";

const SECRET_HINT: Record<string, string> = {
  threads: "THREADS_APP_ID / THREADS_APP_SECRET",
  x: "X_CLIENT_ID / X_CLIENT_SECRET",
  instagram: "IG_APP_ID / IG_APP_SECRET",
  tiktok: "TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET",
};

export function AddChannelDialog({
  open,
  onOpenChange,
  status,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: AppStatus;
  onAdded: (channel: Channel) => void;
}) {
  const [pick, setPick] = useState<ProviderInfo>(PROVIDER_INFO[0]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConnect = status.connectable.includes(pick.id);
  const redirect = `${status.appUrl || ""}/api/connect/${pick.id}/callback`;

  const submitToken = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: pick.id, fields }),
    });
    const data = (await res.json()) as Channel & { error?: string };
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not connect");
    onAdded(data);
    setFields({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a channel</DialogTitle>
          <DialogDescription>
            Threads, X, Instagram and TikTok connect through OAuth with your own developer app.
            Telegram and Bluesky take a token.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-md border p-1">
          {PROVIDER_INFO.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPick(p);
                setError(null);
              }}
              aria-pressed={p.id === pick.id}
              className={cn(
                "flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition",
                p.id === pick.id ? "bg-primary/15 ring-1 ring-primary/60" : "hover:bg-accent",
              )}
            >
              <ProviderBadge provider={p.id} />
              <span className="truncate">{p.label}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {p.auth === "oauth" ? (status.connectable.includes(p.id) ? "oauth" : "needs keys") : "token"}
              </span>
            </button>
          ))}
        </div>

        {pick.auth === "oauth" ? (
          canConnect ? (
            <p className="text-sm text-muted-foreground">
              You will be sent to {pick.label} to approve access, then back here.
            </p>
          ) : (
            <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs">
              <p className="mb-1 font-medium text-warning">App credentials missing</p>
              <p className="text-muted-foreground">
                Create a developer app at {pick.label}, set its redirect URI to{" "}
                <code className="break-all text-foreground">{redirect}</code>, then put{" "}
                <code className="text-foreground">{SECRET_HINT[pick.id]}</code> into{" "}
                <code>.dev.vars</code> (local) or <code>wrangler secret put</code> (production) and restart.
              </p>
            </div>
          )
        ) : (
          <div className="grid gap-3">
            {pick.fields?.map((f) => (
              <label key={f.name} className="grid gap-1.5 text-xs text-muted-foreground">
                {f.label}
                <Input
                  type={f.secret ? "password" : "text"}
                  value={fields[f.name] ?? ""}
                  placeholder={f.placeholder}
                  autoComplete="off"
                  onChange={(e) => setFields((v) => ({ ...v, [f.name]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && void submitToken()}
                />
              </label>
            ))}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {pick.auth === "oauth" ? (
            <a
              href={canConnect ? `/api/connect/${pick.id}` : undefined}
              aria-disabled={!canConnect}
              className={cn(buttonVariants({ variant: "default" }), !canConnect && "pointer-events-none opacity-50")}
            >
              <ExternalLink className="size-4" />
              Connect {pick.label}
            </a>
          ) : (
            <Button disabled={busy || !pick.fields?.every((f) => fields[f.name]?.trim())} onClick={() => void submitToken()}>
              {busy ? <KeyRound className="size-4 animate-pulse" /> : <Plus className="size-4" />}
              {busy ? "Checking…" : `Add ${pick.label}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

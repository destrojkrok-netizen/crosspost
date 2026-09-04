"use client";

import { useState } from "react";
import { ExternalLink, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PROVIDERS } from "@/lib/providers";
import type { AppStatus, Channel, NewChannel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "./ProviderBadge";

export function AddChannelDialog({
  open,
  onOpenChange,
  status,
  onAdded,
  onRefresh,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: AppStatus;
  onAdded: (channel: Channel) => void;
  onRefresh: () => Promise<void>;
}) {
  const [provider, setProvider] = useState(PROVIDERS[0].id);
  const [name, setName] = useState("");
  const [picture, setPicture] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const body: NewChannel = { name: name.trim(), identifier: provider, picture: picture.trim() || null };
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not add the channel");
    onAdded(data);
    setName("");
    setPicture("");
    onOpenChange(false);
  };

  const refresh = async () => {
    setBusy(true);
    await onRefresh();
    setBusy(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a channel</DialogTitle>
          <DialogDescription>
            {status.demo
              ? "Demo mode: the channel is local to this app. With a Postiz key, accounts connect through Postiz."
              : "Accounts connect through OAuth in Postiz. Connect it there, then pull the list here."}
          </DialogDescription>
        </DialogHeader>

        {status.demo ? (
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-xs text-muted-foreground">
              Platform
              <div className="grid max-h-44 grid-cols-2 gap-1 overflow-y-auto rounded-md border p-1">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    aria-pressed={p.id === provider}
                    className={cn(
                      "flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground transition",
                      p.id === provider ? "bg-primary/15 ring-1 ring-primary/60" : "hover:bg-accent",
                    )}
                  >
                    <ProviderBadge provider={p.id} />
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            </label>
            <label className="grid gap-1.5 text-xs text-muted-foreground">
              Account name
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="@handle or page name"
                maxLength={80}
                onKeyDown={(e) => e.key === "Enter" && name.trim() && void submit()}
              />
            </label>
            <label className="grid gap-1.5 text-xs text-muted-foreground">
              Avatar URL (optional)
              <Input
                value={picture}
                onChange={(e) => setPicture(e.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            <li>
              Open Postiz →{" "}
              <a
                href={`${status.postizUrl}/launches`}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Launches <ExternalLink className="inline size-3" />
              </a>{" "}
              → <b>Add channel</b>, pick the platform, finish OAuth.
            </li>
            <li>Come back and refresh the list below.</li>
          </ol>
        )}

        <DialogFooter>
          {status.demo ? (
            <Button disabled={busy || !name.trim()} onClick={() => void submit()}>
              <Plus className="size-4" />
              {busy ? "Adding…" : "Add channel"}
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => void refresh()}>
              <RefreshCw className={cn("size-4", busy && "animate-spin")} />
              {busy ? "Refreshing…" : "Refresh channels"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

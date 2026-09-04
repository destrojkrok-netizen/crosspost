"use client";

import { Check, Plus, RefreshCw, X } from "lucide-react";
import type { Channel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ProviderBadge } from "./ProviderBadge";

export function ChannelPicker({
  channels,
  selected,
  demo,
  onToggle,
  onSelectAll,
  onClear,
  onAdd,
  onRemove,
  onRefresh,
}: {
  channels: Channel[];
  selected: Set<string>;
  demo: boolean;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onAdd: () => void;
  onRemove: (channel: Channel) => void;
  onRefresh: () => void;
}) {
  return (
    <Card className="h-fit">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">
          Channels{" "}
          <span className="font-normal text-muted-foreground">
            {selected.size}/{channels.length}
          </span>
        </CardTitle>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="xs" onClick={onSelectAll}>
            All
          </Button>
          <Button variant="ghost" size="xs" onClick={onClear}>
            None
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onRefresh} aria-label="Refresh channels">
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No channels yet. Add one below.</p>
        ) : (
          // Horizontal chips on phones, a vertical list from lg up.
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
            {channels.map((c) => {
              const on = selected.has(c.id);
              return (
                <li key={c.id} className="group/row relative shrink-0 lg:shrink">
                  <button
                    type="button"
                    disabled={c.disabled}
                    onClick={() => onToggle(c.id)}
                    aria-pressed={on}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition lg:border-transparent",
                      on
                        ? "border-primary/60 bg-primary/10 lg:border-primary/60"
                        : "hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent",
                    )}
                  >
                    <Avatar channel={c} />
                    <span className="min-w-0">
                      <span className="block max-w-[10rem] truncate text-sm lg:max-w-none">{c.name}</span>
                      <span className="hidden text-[11px] capitalize text-muted-foreground lg:block">
                        {c.identifier}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "ml-auto hidden size-4 items-center justify-center rounded-full border lg:flex",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                  </button>
                  {demo && (
                    <button
                      type="button"
                      aria-label={`Remove ${c.name}`}
                      onClick={() => onRemove(c)}
                      className="absolute -right-1 -top-1 hidden rounded-full border bg-card p-0.5 text-muted-foreground hover:text-destructive group-hover/row:block"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Button variant="outline" size="sm" onClick={onAdd} className="w-full">
          <Plus className="size-4" />
          Add channel
        </Button>
      </CardContent>
    </Card>
  );
}

function Avatar({ channel }: { channel: Channel }) {
  return (
    <span className="relative inline-block size-8 shrink-0">
      {channel.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={channel.picture} alt="" className="size-8 rounded-full bg-muted object-cover" />
      ) : (
        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
          {channel.name.replace(/^@/, "").slice(0, 2)}
        </span>
      )}
      <ProviderBadge provider={channel.identifier} className="absolute -bottom-1 -right-1" />
    </span>
  );
}

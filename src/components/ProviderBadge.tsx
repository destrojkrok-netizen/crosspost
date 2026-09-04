import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  x: "bg-black text-white",
  twitter: "bg-black text-white",
  linkedin: "bg-[#0a66c2] text-white",
  "linkedin-page": "bg-[#0a66c2] text-white",
  instagram: "bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white",
  "instagram-standalone": "bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white",
  facebook: "bg-[#1877f2] text-white",
  threads: "bg-black text-white",
  telegram: "bg-[#229ed9] text-white",
  bluesky: "bg-[#0085ff] text-white",
  mastodon: "bg-[#6364ff] text-white",
  youtube: "bg-[#ff0000] text-white",
  tiktok: "bg-black text-white",
  pinterest: "bg-[#e60023] text-white",
  reddit: "bg-[#ff4500] text-white",
  discord: "bg-[#5865f2] text-white",
  slack: "bg-[#4a154b] text-white",
  dribbble: "bg-[#ea4c89] text-white",
  medium: "bg-black text-white",
  "dev.to": "bg-black text-white",
  hashnode: "bg-[#2962ff] text-white",
  lemmy: "bg-[#00bc8c] text-white",
  vk: "bg-[#0077ff] text-white",
  nostr: "bg-[#8e30eb] text-white",
  warpcast: "bg-[#855dcd] text-white",
  farcaster: "bg-[#855dcd] text-white",
};

const GLYPH: Record<string, string> = { x: "𝕏", twitter: "𝕏", threads: "@", "dev.to": "D" };

export function ProviderBadge({
  provider,
  size = "sm",
  className,
}: {
  provider: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const key = provider.toLowerCase();
  return (
    <span
      title={provider}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ring-card",
        size === "sm" ? "h-4 w-4 text-[9px]" : "h-6 w-6 text-[11px]",
        COLORS[key] ?? "bg-muted text-foreground",
        className,
      )}
    >
      {GLYPH[key] ?? key.slice(0, 1).toUpperCase()}
    </span>
  );
}

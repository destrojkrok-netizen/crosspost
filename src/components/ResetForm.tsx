"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) return <p className="text-sm text-destructive">The link is missing its token. Request a new one.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== again) return setError("Passwords do not match");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong");
    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password, 8+ characters" autoComplete="new-password" />
      <Input type="password" required minLength={8} value={again} onChange={(e) => setAgain(e.target.value)} placeholder="Repeat it" autoComplete="new-password" />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Saving…" : "Set password and sign in"}
      </Button>
    </form>
  );
}

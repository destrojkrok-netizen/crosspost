"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; devLink?: string };
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong");
    setDone(data.devLink ?? null);
  };

  if (done !== null)
    return (
      <div className="grid gap-2 text-sm">
        <p>If an account with a password exists for <b>{email}</b>, a reset link is on its way.</p>
        {done && (
          <p className="break-all text-xs text-muted-foreground">
            Dev mode, no mail provider: <a className="text-primary underline" href={done}>{done}</a>
          </p>
        )}
        <a href="/login" className="text-xs text-muted-foreground hover:text-foreground">Back to sign in</a>
      </div>
    );
  return (
    <form onSubmit={submit} className="grid gap-3">
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Sending…" : "Send reset link"}
      </Button>
      <a href="/login" className="text-center text-xs text-muted-foreground hover:text-foreground">
        Back to sign in
      </a>
    </form>
  );
}

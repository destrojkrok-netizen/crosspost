"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EmailAuthForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong");
    router.push(next.startsWith("/") ? next : "/");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      {mode === "register" && (
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" autoComplete="name" />
      )}
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <Input
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === "register" ? "Password, 8+ characters" : "Password"}
        autoComplete={mode === "register" ? "new-password" : "current-password"}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" variant="secondary" disabled={busy} className="w-full">
        {mode === "login" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
        {busy ? "…" : mode === "login" ? "Sign in with email" : "Create account"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {mode === "login" ? "No account yet? Create one" : "Have an account? Sign in"}
      </button>
    </form>
  );
}

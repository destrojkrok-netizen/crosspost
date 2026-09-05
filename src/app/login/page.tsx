import { env } from "@/lib/env";
import { LoginCard } from "@/components/LoginCard";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const q = await searchParams;
  let configured = false;
  try {
    const e = await env();
    configured = Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
  } catch {
    // no bindings (should not happen); the card explains
  }
  return <LoginCard configured={configured} error={q.error ?? null} next={q.next ?? "/"} />;
}

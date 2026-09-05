import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LoginCard({ configured, error, next }: { configured: boolean; error: string | null; next: string }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block size-6 rounded-md bg-gradient-to-br from-primary to-chart-4" />
            <span className="font-semibold tracking-tight">Crosspost</span>
          </div>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Sign in with Google. Each account gets its own channels, queue and analytics.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
          {configured ? (
            <a href={`/api/auth/google?next=${encodeURIComponent(next)}`} className={cn(buttonVariants({ variant: "default" }), "w-full")}>
              <GoogleMark />
              Continue with Google
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">
              Google sign-in is not configured: set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code>.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.3 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

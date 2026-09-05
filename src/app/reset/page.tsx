import { AuthShell } from "@/components/AuthShell";
import { ResetForm } from "@/components/ResetForm";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password" description="This link works once, for one hour.">
      <ResetForm token={token ?? ""} />
    </AuthShell>
  );
}

import { AuthShell } from "@/components/AuthShell";
import { ForgotForm } from "@/components/ForgotForm";

export default function ForgotPage() {
  return (
    <AuthShell title="Reset password" description="Enter your email; we will send a link that works for one hour.">
      <ForgotForm />
    </AuthShell>
  );
}

import "server-only";
import { AppError } from "./env";

/** Sends through Resend's HTTP API (works on Workers). MAIL_FROM must be a verified
 * sender; Resend's onboarding@resend.dev works for the account owner while testing. */
export async function sendMail(env: CloudflareEnv, to: string, subject: string, html: string, text: string) {
  if (!env.RESEND_API_KEY) throw new AppError("Email is not configured (RESEND_API_KEY)", 500);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.MAIL_FROM || "Crosspost <onboarding@resend.dev>", to: [to], subject, html, text }),
  });
  if (!res.ok) throw new AppError(`Mail failed (${res.status}): ${(await res.text()).slice(0, 200)}`, 502);
}

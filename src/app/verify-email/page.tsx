import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export const metadata: Metadata = { title: "Confirmar email — Pulsewatch", referrer: "no-referrer" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string; preview?: string }> }) {
  const { token, email, preview } = await searchParams;
  return <VerifyEmailForm token={token} initialEmail={email} initialPreviewUrl={preview} />;
}

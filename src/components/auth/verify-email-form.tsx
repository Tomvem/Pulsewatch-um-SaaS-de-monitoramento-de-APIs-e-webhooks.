"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MailCheck, RefreshCw, XCircle } from "lucide-react";
import { AccountShell } from "@/components/auth/account-shell";
import { Button } from "@/components/ui/button";

type Status = "waiting" | "verifying" | "verified" | "error";

export function VerifyEmailForm({ token, initialEmail = "", initialPreviewUrl }: { token?: string; initialEmail?: string; initialPreviewUrl?: string }) {
  const [status, setStatus] = useState<Status>(token ? "verifying" : "waiting");
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState(token ? "A validar o seu link..." : "Consulte a caixa de entrada e clique no link que enviámos.");
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => ({ ok: response.ok, payload: await response.json() }))
      .then(({ ok, payload }) => { setStatus(ok ? "verified" : "error"); setMessage(payload.message ?? payload.error); })
      .catch(() => { setStatus("error"); setMessage("Não foi possível confirmar o email."); });
  }, [token]);

  async function resend(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    try {
      const response = await fetch("/api/auth/verify-email/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const payload = await response.json();
      setMessage(payload.message);
      setPreviewUrl(payload.devPreviewUrl);
    } finally {
      setSending(false);
    }
  }

  return <AccountShell icon={MailCheck} eyebrow="Segurança da conta" title={status === "verified" ? "Email confirmado" : "Confirme o seu email"} description={message}>{status === "verifying" ? <div className="grid place-items-center py-5"><RefreshCw className="h-8 w-8 animate-spin text-teal" /></div> : status === "verified" ? <div className="space-y-5 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><Link href="/login" className="flex h-12 items-center justify-center rounded-xl bg-ink text-sm font-bold text-white">Continuar para o login</Link></div> : <div className="space-y-4">{status === "error" && <XCircle className="mx-auto h-10 w-10 text-red-500" />}{previewUrl && <a href={previewUrl} className="flex h-11 items-center justify-center rounded-xl bg-amber-100 px-4 text-sm font-bold text-amber-900">Abrir link de desenvolvimento</a>}<form onSubmit={resend} className="space-y-3"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-black/10 px-4 text-sm outline-none focus:border-teal/50 focus:ring-4 focus:ring-teal/5" placeholder="nome@empresa.com" /><Button variant="secondary" className="h-11 w-full" disabled={sending}>{sending && <RefreshCw className="h-4 w-4 animate-spin" />}Reenviar confirmação</Button></form></div>}</AccountShell>;
}

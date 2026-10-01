"use client";

import { useState } from "react";
import { KeyRound, Mail, RefreshCw } from "lucide-react";
import { AccountShell } from "@/components/auth/account-shell";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const payload = await response.json();
      setMessage(payload.message);
      setPreviewUrl(payload.devPreviewUrl);
    } finally {
      setLoading(false);
    }
  }

  return <AccountShell icon={KeyRound} eyebrow="Recuperação" title="Esqueceu a senha?" description="Informe o email da conta. Se ela existir, enviaremos um link válido por 30 minutos.">{message ? <div className="space-y-4"><div className="rounded-xl bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800">{message}</div>{previewUrl && <a href={previewUrl} className="flex h-11 items-center justify-center rounded-xl bg-amber-100 px-4 text-sm font-bold text-amber-900">Abrir link de desenvolvimento</a>}<Button variant="secondary" className="w-full" onClick={() => { setMessage(""); setPreviewUrl(undefined); }}>Enviar novamente</Button></div> : <form onSubmit={submit} className="space-y-4"><label className="block text-xs font-bold text-slate-600">Email<div className="relative mt-2"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-black/10 pl-10 pr-4 text-sm outline-none focus:border-teal/50 focus:ring-4 focus:ring-teal/5" placeholder="nome@empresa.com" /></div></label><Button className="h-12 w-full" disabled={loading}>{loading && <RefreshCw className="h-4 w-4 animate-spin" />}Enviar instruções</Button></form>}</AccountShell>;
}

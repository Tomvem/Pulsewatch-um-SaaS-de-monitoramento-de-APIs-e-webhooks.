"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, LockKeyhole, RefreshCw } from "lucide-react";
import { AccountShell } from "@/components/auth/account-shell";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(token ? "" : "O link de recuperação está incompleto.");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) return setError("As senhas não coincidem.");
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  }

  return <AccountShell icon={LockKeyhole} eyebrow="Nova credencial" title={success ? "Senha atualizada" : "Crie uma nova senha"} description={success ? "Todas as sessões anteriores foram terminadas por segurança." : "Utilize pelo menos oito caracteres e confirme a nova senha."}>{success ? <div className="space-y-5 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><Link href="/login" className="flex h-12 items-center justify-center rounded-xl bg-ink text-sm font-bold text-white">Entrar com a nova senha</Link></div> : <form onSubmit={submit} className="space-y-4"><PasswordInput label="Nova senha" value={password} show={show} onChange={setPassword} onToggle={() => setShow((value) => !value)} /><PasswordInput label="Confirmar senha" value={confirmPassword} show={show} onChange={setConfirmPassword} onToggle={() => setShow((value) => !value)} />{error && <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}<Button className="h-12 w-full" disabled={loading || !token}>{loading && <RefreshCw className="h-4 w-4 animate-spin" />}Atualizar senha</Button></form>}</AccountShell>;
}

function PasswordInput({ label, value, show, onChange, onToggle }: { label: string; value: string; show: boolean; onChange: (value: string) => void; onToggle: () => void }) {
  return <label className="block text-xs font-bold text-slate-600">{label}<div className="relative mt-2"><input required minLength={8} maxLength={128} type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-black/10 px-4 pr-11 text-sm outline-none focus:border-teal/50 focus:ring-4 focus:ring-teal/5" /><button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>;
}

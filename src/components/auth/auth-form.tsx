"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Eye, EyeOff, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: mode === "login" ? "demo@pulsewatch.dev" : "", password: mode === "login" ? "pulsewatch" : "" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (payload.code === "EMAIL_NOT_VERIFIED") {
        router.push(`/verify-email?email=${encodeURIComponent(payload.email ?? form.email)}`);
        return;
      }
      if (!response.ok) throw new Error(payload.error);
      if (mode === "register") {
        const preview = payload.devPreviewUrl ? `&preview=${encodeURIComponent(payload.devPreviewUrl)}` : "";
        router.push(`/verify-email?email=${encodeURIComponent(form.email)}${preview}`);
      } else router.push("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível continuar");
    } finally {
      setLoading(false);
    }
  }

  return <main className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_.95fr]"><section className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-teal/30 blur-3xl" /><div className="absolute -bottom-40 left-10 h-[420px] w-[420px] rounded-full bg-lime/15 blur-3xl" /><div className="relative flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><Activity className="h-5 w-5" /></div><span className="text-xl font-black">Pulsewatch</span></div><div className="relative max-w-xl"><p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-lime">Monitor the moment</p><h1 className="text-5xl font-black leading-[1.06] tracking-[-.05em]">Os seus serviços.<br />Sempre à vista.</h1><p className="mt-6 max-w-md text-base leading-relaxed text-white/50">Detete falhas antes dos seus utilizadores e acompanhe a performance das suas APIs em tempo real.</p><div className="mt-10 flex gap-6 text-xs text-white/50"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-lime" /> Checks automáticos</span><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-lime" /> Alertas instantâneos</span></div></div><p className="relative text-xs text-white/25">Pulsewatch · Portfolio SaaS</p></section><section className="flex items-center justify-center p-5 md:p-10"><div className="w-full max-w-md"><div className="mb-9 flex items-center gap-3 lg:hidden"><div className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-lime"><Activity className="h-5 w-5" /></div><span className="text-xl font-black">Pulsewatch</span></div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal">{mode === "login" ? "Bem-vindo de volta" : "Comece agora"}</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">{mode === "login" ? "Entre na sua conta" : "Crie a sua conta"}</h2><p className="mt-2 text-sm text-slate-400">{mode === "login" ? "Use a conta demo já preenchida para explorar." : "Sem cartão. Os seus monitores ficam guardados com segurança."}</p><form onSubmit={submit} className="mt-8 space-y-4">{mode === "register" && <AuthField label="Nome" type="text" value={form.name} onChange={(value) => setForm((old) => ({ ...old, name: value }))} placeholder="O seu nome" />}<AuthField label="Email" type="email" value={form.email} onChange={(value) => setForm((old) => ({ ...old, email: value }))} placeholder="nome@empresa.com" /><label className="block text-xs font-bold text-slate-600"><span className="flex items-center justify-between">Senha{mode === "login" && <Link href="/forgot-password" className="font-semibold text-teal hover:underline">Esqueceu a senha?</Link>}</span><div className="relative mt-2"><input required minLength={8} type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setForm((old) => ({ ...old, password: event.target.value }))} className="h-12 w-full rounded-xl border border-black/10 bg-white px-4 pr-11 text-sm outline-none transition focus:border-teal/50 focus:ring-4 focus:ring-teal/5" placeholder="Mínimo de 8 caracteres" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>{error && <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}<Button className="h-12 w-full" disabled={loading}>{loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{loading ? "A processar..." : mode === "login" ? "Entrar no dashboard" : "Criar conta"}</Button></form><p className="mt-7 text-center text-sm text-slate-400">{mode === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"} <Link href={mode === "login" ? "/register" : "/login"} className="font-bold text-teal hover:underline">{mode === "login" ? "Registe-se" : "Entre aqui"}</Link></p></div></section></main>;
}

function AuthField({ label, ...props }: { label: string; type: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-bold text-slate-600">{label}<input required type={props.type} value={props.value} onChange={(event) => props.onChange(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-teal/50 focus:ring-4 focus:ring-teal/5" placeholder={props.placeholder} /></label>;
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity, Bell, Bolt, Clock3, Code2, ExternalLink, Gauge,
  LayoutDashboard, MoreHorizontal, Plus, RefreshCw, Search, Server,
  LogOut, Settings, ShieldCheck, Trash2, X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { LatencyChart } from "@/components/dashboard/latency-chart";
import { cn, formatLatency } from "@/lib/utils";
import type { HttpMethod, MonitorSummary } from "@/types/monitor";

const emptyForm = { name: "", url: "", method: "GET" as HttpMethod, intervalMinutes: 5, timeoutMs: 10000, headers: "", alertWebhook: "" };

type DashboardUser = { name: string; email: string };
export type DashboardSection = "overview" | "monitores" | "incidentes" | "api" | "configuracoes";

export function Dashboard({ user, section = "overview" }: { user: DashboardUser; section?: DashboardSection }) {
  const router = useRouter();
  const [monitors, setMonitors] = useState<MonitorSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UP" | "DOWN" | "PAUSED">("ALL");
  const [apiError, setApiError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [endpointsOpen, setEndpointsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMonitors = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/monitors", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) throw new Error("Não foi possível carregar os monitores.");
      const payload = await response.json();
      setMonitors(payload.data ?? []);
      setSelectedId((current) => current ?? payload.data?.[0]?.id ?? null);
      setApiError("");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Ocorreu um erro inesperado.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => loadMonitors(), 0);
    const timer = setInterval(() => loadMonitors(true), 30_000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(timer);
    };
  }, [loadMonitors]);

  const selected = monitors.find((monitor) => monitor.id === selectedId) ?? monitors[0];
  const filtered = monitors.filter((monitor) => {
    const matchesSearch = `${monitor.name} ${monitor.url}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "ALL"
      || (statusFilter === "PAUSED" ? !monitor.active : monitor.active && monitor.status === statusFilter);
    return matchesSearch && matchesStatus;
  });
  const stats = useMemo(() => {
    const active = monitors.filter((monitor) => monitor.active);
    const up = active.filter((monitor) => monitor.status === "UP").length;
    const known = active.filter((monitor) => monitor.status !== "PENDING");
    const averageLatency = known.length ? Math.round(known.reduce((total, monitor) => total + (monitor.lastLatencyMs ?? 0), 0) / known.length) : 0;
    return { active: active.length, up, incidents: monitors.reduce((total, monitor) => total + monitor.alerts.filter((alert) => alert.type === "DOWN").length, 0), averageLatency };
  }, [monitors]);

  async function runCheck(id: string) {
    setCheckingId(id);
    try {
      const response = await fetch(`/api/monitors/${id}/check`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao verificar o serviço.");
      setMonitors((items) => items.map((item) => item.id === id ? payload.data : item));
      setApiError("");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Falha ao verificar o serviço.");
    } finally {
      setCheckingId(null);
    }
  }

  async function toggleMonitor(monitor: MonitorSummary) {
    const response = await fetch(`/api/monitors/${monitor.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !monitor.active }),
    });
    const payload = await response.json();
    if (response.ok) {
      setMonitors((items) => items.map((item) => item.id === monitor.id ? payload.data : item));
      setApiError("");
    } else setApiError(payload.error ?? "Não foi possível alterar o monitor.");
  }

  async function deleteMonitor(id: string) {
    if (!window.confirm("Eliminar este monitor? Esta ação não pode ser desfeita.")) return;
    const response = await fetch(`/api/monitors/${id}`, { method: "DELETE" });
    if (response.ok) {
      setMonitors((items) => items.filter((item) => item.id !== id));
      setSelectedId((current) => current === id ? null : current);
      setApiError("");
    } else setApiError("Não foi possível eliminar o monitor.");
  }

  async function createMonitor(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      let headers = {};
      if (form.headers.trim()) headers = JSON.parse(form.headers);
      const response = await fetch("/api/monitors", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, headers }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível criar o monitor");
      setMonitors((items) => [payload.data, ...items]);
      setSelectedId(payload.data.id);
      setForm(emptyForm);
      setModalOpen(false);
      void runCheck(payload.data.id);
    } catch (error) {
      setFormError(error instanceof SyntaxError ? "Os headers devem ser um objeto JSON válido." : error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-black/[.07] bg-[#111a1e] text-white lg:flex">
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-lime text-ink"><Activity className="h-5 w-5" /></div>
          <div><p className="text-[17px] font-extrabold tracking-tight">Pulsewatch</p><p className="text-[10px] font-medium uppercase tracking-[.2em] text-white/40">Monitor the moment</p></div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <NavItem href="/" icon={LayoutDashboard} label="Overview" active={section === "overview"} />
          <NavItem href="/monitores" icon={Server} label="Monitores" active={section === "monitores"} count={monitors.length} />
          <NavItem href="/incidentes" icon={Bell} label="Incidentes" active={section === "incidentes"} count={stats.incidents} />
          <NavItem href="/api-webhooks" icon={Code2} label="API & Webhooks" active={section === "api"} />
          <p className="px-3 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[.18em] text-white/30">Workspace</p>
          <NavItem href="/configuracoes" icon={Settings} label="Definições" active={section === "configuracoes"} />
        </nav>
        <div className="m-4 rounded-2xl border border-white/10 bg-white/[.04] p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold"><ShieldCheck className="h-4 w-4 text-lime" /> Ambiente demo</div>
          <p className="text-[11px] leading-relaxed text-white/45">Dados persistidos em PostgreSQL com checks num worker dedicado.</p>
        </div>
        <div className="flex items-center gap-3 border-t border-white/10 p-4">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-lime to-teal text-xs font-black text-ink">{user.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{user.name}</p><p className="truncate text-[10px] text-white/40">{user.email}</p></div>
          <button onClick={logout} title="Terminar sessão" className="grid h-8 w-8 place-items-center rounded-lg text-white/30 transition hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /></button>
        </div>
      </aside>

      <main className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-black/[.06] bg-canvas/90 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3 lg:hidden"><div className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-lime"><Activity className="h-5 w-5" /></div><span className="font-extrabold">Pulsewatch</span></div>
          <div className="relative hidden w-full max-w-sm md:block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar monitores..." className="h-10 w-full rounded-xl border border-black/[.08] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-teal/50 focus:ring-4 focus:ring-teal/5" /></div>
          <div className="ml-auto flex items-center gap-2"><button type="button" onClick={() => setNotificationsOpen(true)} aria-label="Abrir notificações" className="relative grid h-10 w-10 place-items-center rounded-xl border border-black/[.08] bg-white text-slate-500 transition hover:border-teal/30 hover:text-teal"><Bell className="h-4 w-4" />{stats.incidents > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />}</button><Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Novo monitor</span></Button></div>
        </header>

        <div className="mx-auto max-w-[1500px] p-5 md:p-8">
          {section === "overview" ? <>
          <section className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-teal">Visão geral</p><h1 className="text-3xl font-black tracking-[-.04em] md:text-4xl">Tudo sob controlo.</h1><p className="mt-2 text-sm text-slate-500">Acompanhe a saúde dos seus serviços num só lugar.</p></div>
            <div className="flex items-center gap-2 text-xs text-slate-400"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>Atualização automática a cada 30s</div>
          </section>

          {apiError && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><span>{apiError}</span><button onClick={() => setApiError("")} className="rounded-lg p-1 hover:bg-red-100"><X className="h-4 w-4" /></button></div>}

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Server} label="Monitores ativos" value={stats.active.toString()} detail={`${stats.up} operacionais`} tone="teal" onClick={() => router.push("/monitores")} />
            <MetricCard icon={Gauge} label="Latência média" value={`${stats.averageLatency} ms`} detail="Última verificação" tone="lime" onClick={() => router.push("/monitores")} />
            <MetricCard icon={ShieldCheck} label="Disponibilidade" value={`${stats.active ? ((stats.up / stats.active) * 100).toFixed(1) : "0.0"}%`} detail="Estado atual" tone="blue" onClick={() => router.push("/monitores")} />
            <MetricCard icon={Bolt} label="Incidentes" value={stats.incidents.toString().padStart(2, "0")} detail="No histórico recente" tone="red" onClick={() => router.push("/incidentes")} />
          </section>

          {loading ? <DashboardSkeleton /> : monitors.length === 0 ? <EmptyState onCreate={() => setModalOpen(true)} /> : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,.85fr)]">
              <section className="overflow-hidden rounded-2xl border border-black/[.07] bg-white shadow-soft">
                <div className="flex items-center justify-between gap-3 border-b border-black/[.06] px-5 py-4"><div><h2 className="font-extrabold">Os seus monitores</h2><p className="mt-0.5 text-xs text-slate-400">Selecione um serviço para ver os detalhes</p></div><div className="flex items-center gap-2"><select aria-label="Filtrar monitores" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-9 rounded-lg border border-black/10 bg-white px-2 text-xs font-semibold outline-none"><option value="ALL">Todos</option><option value="UP">Operacionais</option><option value="DOWN">Indisponíveis</option><option value="PAUSED">Pausados</option></select><Button variant="ghost" className="h-9 px-2" onClick={() => loadMonitors()}><RefreshCw className="h-4 w-4" /></Button></div></div>
                <div className="divide-y divide-black/[.055]">
                  {filtered.length === 0 && <div className="px-5 py-12 text-center text-sm text-slate-400">Nenhum monitor corresponde a este filtro.</div>}
                  {filtered.map((monitor) => (
                    <button key={monitor.id} onClick={() => setSelectedId(monitor.id)} className={cn("group grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-[#f8faf9] md:grid-cols-[1.2fr_.55fr_.55fr_auto]", selected?.id === monitor.id && "bg-teal/[.045] shadow-[inset_3px_0_0_#087e6b]") }>
                      <div className="flex min-w-0 items-center gap-3"><StatusBadge status={monitor.status} compact /><div className="min-w-0"><p className="truncate text-sm font-bold">{monitor.name}</p><p className="mt-1 truncate text-[11px] text-slate-400"><span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-500">{monitor.method}</span>{monitor.url}</p></div></div>
                      <div className="hidden md:block"><p className="text-sm font-extrabold">{monitor.uptime.toFixed(2)}%</p><p className="text-[10px] uppercase tracking-wider text-slate-400">Uptime</p></div>
                      <div className="hidden md:block"><p className="text-sm font-extrabold">{formatLatency(monitor.lastLatencyMs)}</p><p className="text-[10px] uppercase tracking-wider text-slate-400">Latência</p></div>
                      <StatusBadge status={monitor.status} />
                    </button>
                  ))}
                </div>
              </section>

              {selected && <MonitorDetails monitor={selected} checking={checkingId === selected.id} onCheck={() => runCheck(selected.id)} onToggle={() => toggleMonitor(selected)} onDelete={() => deleteMonitor(selected.id)} />}

              {selected && <section className="rounded-2xl border border-black/[.07] bg-white p-5 shadow-soft xl:col-span-1"><div className="mb-4 flex items-start justify-between"><div><h2 className="font-extrabold">Tempo de resposta</h2><p className="mt-1 text-xs text-slate-400">Últimas {Math.min(selected.logs.length, 24)} verificações · milissegundos</p></div><div className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{formatLatency(selected.lastLatencyMs)}</div></div><LatencyChart logs={selected.logs} /></section>}

              {selected && <section className="rounded-2xl border border-black/[.07] bg-white p-5 shadow-soft"><div className="mb-4"><h2 className="font-extrabold">Atividade recente</h2><p className="mt-1 text-xs text-slate-400">Eventos e alterações de estado</p></div><div className="space-y-1">{selected.logs.slice(-5).reverse().map((log) => <div key={log.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50"><span className={cn("h-2 w-2 rounded-full", log.status === "UP" ? "bg-emerald-500" : "bg-red-500")} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{log.status === "UP" ? `Resposta HTTP ${log.statusCode}` : log.error ?? "Sem resposta"}</p><p className="mt-0.5 text-[10px] text-slate-400">{format(new Date(log.checkedAt), "dd MMM, HH:mm:ss", { locale: ptBR })}</p></div><span className="text-xs font-bold text-slate-500">{log.latencyMs} ms</span></div>)}</div></section>}
            </div>
          )}
          </> : <SecondaryPage section={section} monitors={monitors} incidents={stats.incidents} onCreate={() => setModalOpen(true)} onEndpoints={() => setEndpointsOpen(true)} />}
        </div>
      </main>

      {modalOpen && <CreateMonitorModal form={form} setForm={setForm} error={formError} saving={saving} onClose={() => setModalOpen(false)} onSubmit={createMonitor} />}
      {endpointsOpen && <EndpointsModal onClose={() => setEndpointsOpen(false)} />}
      {notificationsOpen && <NotificationsModal monitors={monitors} onClose={() => setNotificationsOpen(false)} onOpenIncidents={() => { setNotificationsOpen(false); router.push("/incidentes"); }} />}
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active, count }: { href: string; icon: typeof Activity; label: string; active?: boolean; count?: number }) {
  return <Link href={href} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition", active ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white")}><Icon className={cn("h-4 w-4", active && "text-lime")} /><span className="flex-1">{label}</span>{count !== undefined && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{count}</span>}</Link>;
}

function SecondaryPage({ section, monitors, incidents, onCreate, onEndpoints }: { section: Exclude<DashboardSection, "overview">; monitors: MonitorSummary[]; incidents: number; onCreate: () => void; onEndpoints: () => void }) {
  const content = {
    monitores: { eyebrow: "Monitorização", title: "Os seus monitores", description: "Veja e administre todos os serviços monitorizados." },
    incidentes: { eyebrow: "Histórico", title: "Incidentes", description: "Acompanhe indisponibilidades e recuperações dos seus serviços." },
    api: { eyebrow: "Integrações", title: "API & Webhooks", description: "Configure endpoints, headers e webhooks para receber alertas." },
    configuracoes: { eyebrow: "Workspace", title: "Definições", description: "As preferências do espaço de trabalho estarão disponíveis aqui." },
  }[section];

  return <section><div className="mb-7"><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-teal">{content.eyebrow}</p><h1 className="text-3xl font-black tracking-[-.04em] md:text-4xl">{content.title}</h1><p className="mt-2 text-sm text-slate-500">{content.description}</p></div>{section === "monitores" && <div className="space-y-3">{monitors.map((monitor) => <div key={monitor.id} className="flex items-center justify-between rounded-2xl border border-black/[.07] bg-white p-5 shadow-soft"><div><p className="font-extrabold">{monitor.name}</p><p className="mt-1 text-xs text-slate-400">{monitor.method} · {monitor.url}</p></div><StatusBadge status={monitor.status} /></div>)}<Button onClick={onCreate}><Plus className="h-4 w-4" />Novo monitor</Button></div>}{section === "incidentes" && <div className="rounded-2xl border border-black/[.07] bg-white p-6 shadow-soft"><p className="text-3xl font-black">{incidents}</p><p className="mt-1 text-sm text-slate-500">incidentes registados nos monitores atuais.</p></div>}{section === "api" && <div className="grid gap-4 md:grid-cols-2"><InfoCard title="Criar monitor" text="Defina URL, método, intervalo, headers e webhook de alerta." actionLabel="Novo monitor" onAction={onCreate} /><InfoCard title="Endpoints" text="Consulte as rotas REST disponíveis para os seus monitores." actionLabel="Ver endpoints" onAction={onEndpoints} /></div>}{section === "configuracoes" && <InfoCard title="Ambiente local" text="O workspace usa PostgreSQL local e atualiza os monitores automaticamente a cada 30 segundos." />}</section>;
}

function InfoCard({ title, text, actionLabel, onAction }: { title: string; text: string; actionLabel?: string; onAction?: () => void }) { return <div className="rounded-2xl border border-black/[.07] bg-white p-6 shadow-soft"><h2 className="font-extrabold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>{onAction && actionLabel && <Button className="mt-5" onClick={onAction}>{title === "Criar monitor" ? <Plus className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}{actionLabel}</Button>}</div>; }

function EndpointsModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const endpoints = [{ method: "GET", path: "/api/monitors", description: "Lista os seus monitores." }, { method: "POST", path: "/api/monitors", description: "Cria um monitor." }, { method: "GET", path: "/api/monitors/:id", description: "Consulta um monitor." }, { method: "PATCH", path: "/api/monitors/:id", description: "Atualiza ou pausa um monitor." }, { method: "DELETE", path: "/api/monitors/:id", description: "Remove um monitor." }, { method: "POST", path: "/api/monitors/:id/check", description: "Executa uma verificação imediata." }];
  async function copy(path: string) { await navigator.clipboard.writeText(path); setCopied(path); window.setTimeout(() => setCopied(null), 1_500); }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section role="dialog" aria-modal="true" aria-labelledby="endpoints-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-canvas p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-teal">Integrações</p><h2 id="endpoints-title" className="mt-1 text-2xl font-black">Endpoints da API</h2><p className="mt-2 text-sm text-slate-500">As rotas usam a sessão da conta conectada.</p></div><button type="button" onClick={onClose} aria-label="Fechar modal" className="grid h-9 w-9 place-items-center rounded-xl bg-black/5 hover:bg-black/10"><X className="h-4 w-4" /></button></div><div className="mt-6 space-y-2">{endpoints.map((endpoint) => <div key={`${endpoint.method}-${endpoint.path}`} className="flex items-center gap-3 rounded-xl border border-black/[.07] bg-white p-3"><span className="w-14 rounded-md bg-teal/10 px-2 py-1 text-center text-[10px] font-black text-teal">{endpoint.method}</span><div className="min-w-0 flex-1"><code className="text-sm font-bold text-ink">{endpoint.path}</code><p className="mt-0.5 text-xs text-slate-500">{endpoint.description}</p></div><button type="button" onClick={() => void copy(endpoint.path)} className="rounded-lg px-2 py-1 text-xs font-bold text-teal hover:bg-teal/10">{copied === endpoint.path ? "Copiado" : "Copiar"}</button></div>)}</div><p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Para testar no navegador, use primeiro o login. Os endpoints retornam apenas os dados do utilizador autenticado.</p></section></div>;
}

function MetricCard({ icon: Icon, label, value, detail, tone, onClick }: { icon: typeof Activity; label: string; value: string; detail: string; tone: string; onClick: () => void }) {
  const tones: Record<string, string> = { teal: "bg-teal/10 text-teal", lime: "bg-lime/40 text-[#567916]", blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600" };
  return <button type="button" onClick={onClick} className="rounded-2xl border border-black/[.07] bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-teal/10"><div className="mb-5 flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{label}</span><div className={cn("grid h-9 w-9 place-items-center rounded-xl", tones[tone])}><Icon className="h-4 w-4" /></div></div><p className="text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-[11px] text-slate-400">{detail}</p></button>;
}

function NotificationsModal({ monitors, onClose, onOpenIncidents }: { monitors: MonitorSummary[]; onClose: () => void; onOpenIncidents: () => void }) {
  const alerts = monitors.flatMap((monitor) => monitor.alerts.map((alert) => ({ ...alert, monitorName: monitor.name }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section role="dialog" aria-modal="true" aria-labelledby="notifications-title" className="w-full max-w-md rounded-3xl bg-canvas p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-teal">Atualizações</p><h2 id="notifications-title" className="mt-1 text-2xl font-black">Notificações</h2></div><button type="button" onClick={onClose} aria-label="Fechar notificações" className="grid h-9 w-9 place-items-center rounded-xl bg-black/5 hover:bg-black/10"><X className="h-4 w-4" /></button></div><div className="mt-6 max-h-80 space-y-2 overflow-y-auto">{alerts.length ? alerts.map((alert) => <div key={alert.id} className="rounded-xl border border-black/[.07] bg-white p-3"><p className="text-sm font-bold">{alert.monitorName}</p><p className="mt-1 text-xs text-slate-500">{alert.message}</p></div>) : <p className="rounded-xl bg-white p-4 text-sm text-slate-500">Não há novas notificações.</p>}</div><Button className="mt-5 w-full" onClick={onOpenIncidents}>Ver incidentes</Button></section></div>;
}

function MonitorDetails({ monitor, checking, onCheck, onToggle, onDelete }: { monitor: MonitorSummary; checking: boolean; onCheck: () => void; onToggle: () => void; onDelete: () => void }) {
  return <aside className="rounded-2xl border border-black/[.07] bg-[#111a1e] p-5 text-white shadow-soft"><div className="mb-5 flex items-start justify-between"><div className="min-w-0"><StatusBadge status={monitor.status} /><h2 className="mt-3 truncate text-xl font-black">{monitor.name}</h2><a href={monitor.url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 truncate text-xs text-white/40 hover:text-lime">{monitor.url}<ExternalLink className="h-3 w-3 shrink-0" /></a></div><button className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/40"><MoreHorizontal className="h-4 w-4" /></button></div><div className="grid grid-cols-2 gap-2"><Detail label="Uptime" value={`${monitor.uptime.toFixed(2)}%`} /><Detail label="Resposta" value={formatLatency(monitor.lastLatencyMs)} /><Detail label="HTTP" value={monitor.lastStatusCode?.toString() ?? "—"} /><Detail label="Intervalo" value={`${monitor.intervalMinutes} min`} /></div><div className="mt-5 border-t border-white/10 pt-4"><div className="mb-4 flex items-center gap-2 text-[11px] text-white/40"><Clock3 className="h-3.5 w-3.5" />{monitor.lastCheckedAt ? `Verificado ${formatDistanceToNow(new Date(monitor.lastCheckedAt), { addSuffix: true, locale: ptBR })}` : "Ainda não verificado"}</div><div className="grid grid-cols-[1fr_auto_auto] gap-2"><Button onClick={onCheck} disabled={checking} className="bg-lime text-ink hover:bg-white">{checking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Verificar agora</Button><Button variant="secondary" className="border-white/10 bg-white/5 px-3 text-white hover:bg-white/10" onClick={onToggle}>{monitor.active ? "Pausar" : "Ativar"}</Button><Button variant="danger" className="px-3" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button></div></div></aside>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white/[.055] p-3"><p className="text-[10px] uppercase tracking-wider text-white/35">{label}</p><p className="mt-1 text-sm font-extrabold">{value}</p></div>; }

function DashboardSkeleton() { return <div className="grid animate-pulse gap-6 xl:grid-cols-[1.65fr_.85fr]"><div className="h-80 rounded-2xl bg-black/5" /><div className="h-80 rounded-2xl bg-black/5" /></div>; }

function EmptyState({ onCreate }: { onCreate: () => void }) { return <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center"><div><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-lime/50"><Server className="h-6 w-6" /></div><h2 className="font-extrabold">Nenhum monitor encontrado</h2><p className="mb-5 mt-2 text-sm text-slate-400">Adicione a sua primeira API ou webhook.</p><Button onClick={onCreate}><Plus className="h-4 w-4" />Criar monitor</Button></div></div>; }

type FormState = typeof emptyForm;
function CreateMonitorModal({ form, setForm, error, saving, onClose, onSubmit }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; error: string; saving: boolean; onClose: () => void; onSubmit: (event: React.FormEvent) => void }) {
  const field = "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-teal/50 focus:ring-4 focus:ring-teal/5";
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-canvas p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-teal">Configuração</p><h2 className="mt-1 text-2xl font-black tracking-tight">Novo monitor</h2></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-black/5"><X className="h-4 w-4" /></button></div><div className="grid gap-4"><label className="text-xs font-bold text-slate-600">Nome do serviço<input required minLength={2} value={form.name} onChange={(e) => setForm((old) => ({ ...old, name: e.target.value }))} className={cn(field, "mt-2")} placeholder="Ex.: Payments API" /></label><label className="text-xs font-bold text-slate-600">URL pública<input required type="url" value={form.url} onChange={(e) => setForm((old) => ({ ...old, url: e.target.value }))} className={cn(field, "mt-2")} placeholder="https://api.exemplo.com/health" /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-600">Método<select value={form.method} onChange={(e) => setForm((old) => ({ ...old, method: e.target.value as HttpMethod }))} className={cn(field, "mt-2")}>{["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((method) => <option key={method}>{method}</option>)}</select></label><label className="text-xs font-bold text-slate-600">Intervalo (min)<input required type="number" min={1} max={1440} value={form.intervalMinutes} onChange={(e) => setForm((old) => ({ ...old, intervalMinutes: Number(e.target.value) }))} className={cn(field, "mt-2")} /></label></div><label className="text-xs font-bold text-slate-600">Headers personalizados <span className="font-normal text-slate-400">(JSON opcional)</span><textarea value={form.headers} onChange={(e) => setForm((old) => ({ ...old, headers: e.target.value }))} className="mt-2 min-h-20 w-full resize-y rounded-xl border border-black/10 bg-white p-3 font-mono text-xs outline-none focus:border-teal/50" placeholder={'{"Authorization": "Bearer token"}'} /></label><label className="text-xs font-bold text-slate-600">Webhook de alerta <span className="font-normal text-slate-400">(opcional)</span><input type="url" value={form.alertWebhook} onChange={(e) => setForm((old) => ({ ...old, alertWebhook: e.target.value }))} className={cn(field, "mt-2")} placeholder="https://discord.com/api/webhooks/..." /></label>{error && <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}</div><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <RefreshCw className="h-4 w-4 animate-spin" />}{saving ? "A guardar..." : "Criar monitor"}</Button></div></form></div>;
}

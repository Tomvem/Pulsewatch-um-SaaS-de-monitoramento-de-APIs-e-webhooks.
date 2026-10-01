import { monitorStore } from "@/lib/store";
import { assertSafeResolvedUrl } from "@/lib/validation";
import type { Alert, PingLog } from "@/types/monitor";

async function safeFetch(url: string, init: RequestInit, maxRedirects = 5) {
  let currentUrl = url;
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    await assertSafeResolvedUrl(currentUrl);
    const response = await fetch(currentUrl, { ...init, redirect: "manual" });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    if (redirect === maxRedirects) throw new Error("Limite de redirecionamentos excedido");
    await response.body?.cancel();
    currentUrl = new URL(location, currentUrl).toString();
  }
  throw new Error("Redirecionamento inválido");
}

async function deliverAlert(webhook: string, alert: Alert) {
  try {
    const response = await safeFetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `🚨 Pulsewatch: ${alert.message}`, alert }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function checkMonitor(id: string) {
  const monitor = await monitorStore.findAny(id);
  if (!monitor) return null;

  const previousStatus = monitor.status;
  const startedAt = performance.now();
  let statusCode: number | null = null;
  let error: string | null = null;

  try {
    const response = await safeFetch(monitor.url, {
      method: monitor.method,
      headers: monitor.headers,
      cache: "no-store",
      signal: AbortSignal.timeout(monitor.timeoutMs),
    });
    statusCode = response.status;
    if (!response.ok) error = `HTTP ${response.status} ${response.statusText}`.trim();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Falha desconhecida";
  }

  const status = statusCode !== null && statusCode >= 200 && statusCode < 300 ? "UP" : "DOWN";
  const checkedAt = new Date().toISOString();
  const log: PingLog = {
    id: crypto.randomUUID(), monitorId: id, status, statusCode,
    latencyMs: Math.max(1, Math.round(performance.now() - startedAt)), error, checkedAt,
  };

  let alert: Alert | undefined;
  if ((status === "DOWN" && previousStatus !== "DOWN") || (status === "UP" && previousStatus === "DOWN")) {
    alert = {
      id: crypto.randomUUID(), monitorId: id, type: status === "DOWN" ? "DOWN" : "RECOVERY",
      message: status === "DOWN" ? `${monitor.name} está indisponível${statusCode ? ` (HTTP ${statusCode})` : ""}` : `${monitor.name} voltou a responder`,
      delivered: false, createdAt: checkedAt,
    };
    if (monitor.alertWebhook) alert.delivered = await deliverAlert(monitor.alertWebhook, alert);
  }

  return monitorStore.addResult(id, log, alert);
}

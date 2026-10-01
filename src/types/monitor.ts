export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
export type MonitorStatus = "UP" | "DOWN" | "PENDING";

export interface PingLog {
  id: string;
  monitorId: string;
  status: "UP" | "DOWN";
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
  checkedAt: string;
}

export interface Alert {
  id: string;
  monitorId: string;
  type: "DOWN" | "RECOVERY";
  message: string;
  delivered: boolean;
  createdAt: string;
}

export interface Monitor {
  id: string;
  ownerId: string;
  name: string;
  url: string;
  method: HttpMethod;
  intervalMinutes: number;
  timeoutMs: number;
  headers: Record<string, string>;
  alertWebhook: string | null;
  active: boolean;
  status: MonitorStatus;
  lastStatusCode: number | null;
  lastLatencyMs: number | null;
  lastCheckedAt: string | null;
  createdAt: string;
  logs: PingLog[];
  alerts: Alert[];
}

export interface MonitorSummary extends Monitor {
  uptime: number;
}

export interface CreateMonitorInput {
  name: string;
  url: string;
  method: HttpMethod;
  intervalMinutes: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
  alertWebhook?: string | null;
}

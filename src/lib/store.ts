import { db } from "@/lib/db";
import { calculateUptime } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";
import type { Alert, CreateMonitorInput, MonitorSummary, PingLog } from "@/types/monitor";

const monitorInclude = {
  logs: { orderBy: { checkedAt: "desc" as const }, take: 96 },
  alerts: { orderBy: { createdAt: "desc" as const }, take: 20 },
} satisfies Prisma.MonitorInclude;

type MonitorRecord = Prisma.MonitorGetPayload<{ include: typeof monitorInclude }>;

function mapMonitor(record: MonitorRecord): MonitorSummary {
  const logs: PingLog[] = record.logs.toReversed().map((log) => ({
    id: log.id,
    monitorId: log.monitorId,
    status: log.status === "UP" ? "UP" : "DOWN",
    statusCode: log.statusCode,
    latencyMs: log.latencyMs,
    error: log.error,
    checkedAt: log.checkedAt.toISOString(),
  }));
  const alerts: Alert[] = record.alerts.toReversed().map((alert) => ({
    id: alert.id,
    monitorId: alert.monitorId,
    type: alert.type,
    message: alert.message,
    delivered: alert.delivered,
    createdAt: alert.createdAt.toISOString(),
  }));
  const headers = record.headers && typeof record.headers === "object" && !Array.isArray(record.headers)
    ? record.headers as Record<string, string>
    : {};

  return {
    id: record.id,
    ownerId: record.ownerId,
    name: record.name,
    url: record.url,
    method: record.method,
    intervalMinutes: record.intervalMinutes,
    timeoutMs: record.timeoutMs,
    headers,
    alertWebhook: record.alertWebhook,
    active: record.active,
    status: record.status,
    lastStatusCode: record.lastStatusCode,
    lastLatencyMs: record.lastLatencyMs,
    lastCheckedAt: record.lastCheckedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    logs,
    alerts,
    uptime: calculateUptime(logs),
  };
}

export const monitorStore = {
  async list(ownerId: string) {
    const records = await db.monitor.findMany({ where: { ownerId }, include: monitorInclude, orderBy: { createdAt: "desc" } });
    return records.map(mapMonitor);
  },
  async listActive() {
    return db.monitor.findMany({
      where: { active: true },
      select: { id: true, intervalMinutes: true, lastCheckedAt: true },
    });
  },
  async find(id: string, ownerId: string) {
    const record = await db.monitor.findFirst({ where: { id, ownerId }, include: monitorInclude });
    return record ? mapMonitor(record) : null;
  },
  async findAny(id: string) {
    const record = await db.monitor.findUnique({ where: { id }, include: monitorInclude });
    return record ? mapMonitor(record) : null;
  },
  async create(input: CreateMonitorInput, ownerId: string) {
    const record = await db.monitor.create({
      data: {
        ownerId,
        name: input.name,
        url: input.url,
        method: input.method,
        intervalMinutes: input.intervalMinutes,
        timeoutMs: input.timeoutMs ?? 10_000,
        headers: input.headers ?? {},
        alertWebhook: input.alertWebhook ?? null,
      },
      include: monitorInclude,
    });
    return mapMonitor(record);
  },
  async update(id: string, ownerId: string, input: Partial<CreateMonitorInput & { active: boolean }>) {
    const exists = await db.monitor.findFirst({ where: { id, ownerId }, select: { id: true } });
    if (!exists) return null;
    const record = await db.monitor.update({
      where: { id },
      data: input,
      include: monitorInclude,
    });
    return mapMonitor(record);
  },
  async delete(id: string, ownerId: string) {
    const result = await db.monitor.deleteMany({ where: { id, ownerId } });
    return result.count > 0;
  },
  async addResult(id: string, log: PingLog, alert?: Alert) {
    const exists = await db.monitor.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;
    await db.$transaction(async (tx) => {
      await tx.pingLog.create({
        data: {
          id: log.id,
          monitorId: id,
          status: log.status,
          statusCode: log.statusCode,
          latencyMs: log.latencyMs,
          error: log.error,
          checkedAt: new Date(log.checkedAt),
        },
      });
      if (alert) {
        await tx.alert.create({
          data: {
            id: alert.id,
            monitorId: id,
            type: alert.type,
            message: alert.message,
            delivered: alert.delivered,
            createdAt: new Date(alert.createdAt),
          },
        });
      }
      await tx.monitor.update({
        where: { id },
        data: {
          status: log.status,
          lastStatusCode: log.statusCode,
          lastLatencyMs: log.latencyMs,
          lastCheckedAt: new Date(log.checkedAt),
        },
      });
    });
    return monitorStore.findAny(id);
  },
};

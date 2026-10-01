import { monitorStore } from "@/lib/store";
import { checkMonitor } from "@/services/check-service";
import { runMaintenanceIfDue } from "@/services/maintenance-service";

declare global {
  var pulsewatchScheduler: NodeJS.Timeout | undefined;
}

export function startScheduler() {
  if (globalThis.pulsewatchScheduler) return;
  const tickEvery = Number(process.env.CHECK_INTERVAL_SECONDS ?? 30) * 1000;
  const tick = async () => {
    try {
      const now = Date.now();
      await runMaintenanceIfDue(now);
      const active = await monitorStore.listActive();
      const due = active.filter((monitor) =>
        !monitor.lastCheckedAt || now - monitor.lastCheckedAt.getTime() >= monitor.intervalMinutes * 60_000,
      );
      await Promise.allSettled(due.map((monitor) => checkMonitor(monitor.id)));
    } catch (error) {
      console.error("[worker] Falha ao agendar verificações", error);
    }
  };
  void tick();
  globalThis.pulsewatchScheduler = setInterval(tick, tickEvery);
}

export function stopScheduler() {
  if (globalThis.pulsewatchScheduler) clearInterval(globalThis.pulsewatchScheduler);
  globalThis.pulsewatchScheduler = undefined;
}

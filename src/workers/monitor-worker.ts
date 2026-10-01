import "dotenv/config";
import { db } from "@/lib/db";
import { startScheduler, stopScheduler } from "@/services/scheduler";

console.log("[worker] Pulsewatch monitor worker iniciado");
startScheduler();

async function shutdown(signal: string) {
  console.log(`[worker] ${signal} recebido; a encerrar...`);
  stopScheduler();
  await db.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
const monitors = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Checkout API", url: "https://httpstat.us/200", intervalMinutes: 5, baseLatency: 184, downAt: [] as number[] },
  { id: "10000000-0000-4000-8000-000000000002", name: "Authentication", url: "https://jsonplaceholder.typicode.com/users/1", intervalMinutes: 2, baseLatency: 82, downAt: [] as number[] },
  { id: "10000000-0000-4000-8000-000000000003", name: "Orders Webhook", url: "https://httpstat.us/503", intervalMinutes: 5, baseLatency: 310, downAt: [18, 19, 23] },
];

async function seed() {
  const user = await db.user.upsert({
    where: { email: "demo@pulsewatch.dev" },
    update: { name: "Everton Hildebrando", emailVerifiedAt: new Date() },
    create: { id: DEMO_USER_ID, name: "Everton Hildebrando", email: "demo@pulsewatch.dev", passwordHash: hashPassword("pulsewatch"), emailVerifiedAt: new Date() },
  });

  for (const item of monitors) {
    const isDown = item.downAt.includes(23);
    const monitor = await db.monitor.upsert({
      where: { id: item.id },
      update: { ownerId: user.id },
      create: {
        id: item.id,
        ownerId: user.id,
        name: item.name,
        url: item.url,
        intervalMinutes: item.intervalMinutes,
        status: isDown ? "DOWN" : "UP",
        lastStatusCode: isDown ? 503 : 200,
        lastLatencyMs: isDown ? item.baseLatency * 3 : item.baseLatency,
        lastCheckedAt: new Date(),
      },
    });
    const logCount = await db.pingLog.count({ where: { monitorId: monitor.id } });
    if (logCount === 0) {
      await db.pingLog.createMany({
        data: Array.from({ length: 24 }, (_, index) => {
          const down = item.downAt.includes(index);
          return {
            id: randomUUID(),
            monitorId: monitor.id,
            status: down ? "DOWN" as const : "UP" as const,
            statusCode: down ? 503 : 200,
            latencyMs: down ? item.baseLatency * 3 : item.baseLatency + ((index * 17) % 90) - 30,
            error: down ? "Service Unavailable" : null,
            checkedAt: new Date(Date.now() - (23 - index) * 5 * 60_000),
          };
        }),
      });
    }
  }
  console.log("Seed concluído: demo@pulsewatch.dev / pulsewatch");
}

seed().finally(() => db.$disconnect());

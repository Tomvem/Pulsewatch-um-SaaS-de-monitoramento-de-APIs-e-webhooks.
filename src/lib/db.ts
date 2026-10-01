import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL
  ?? "postgresql://pulsewatch:pulsewatch_dev@localhost:5432/pulsewatch?schema=public";

const createClient = () => {
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({ adapter });
};

declare global {
  var pulsewatchPrisma: ReturnType<typeof createClient> | undefined;
}

export const db = globalThis.pulsewatchPrisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalThis.pulsewatchPrisma = db;

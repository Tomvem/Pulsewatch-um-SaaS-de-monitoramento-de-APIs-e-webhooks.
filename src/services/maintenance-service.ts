import { db } from "@/lib/db";

let lastRunAt = 0;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export async function runMaintenanceIfDue(now = Date.now()) {
  if (now - lastRunAt < HOUR_MS) return;

  const pingRetention = Number(process.env.PING_RETENTION_DAYS ?? 30);
  const alertRetention = Number(process.env.ALERT_RETENTION_DAYS ?? 90);
  const [sessions, verificationTokens, resetTokens, logs, alerts] = await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    db.emailVerificationToken.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    db.pingLog.deleteMany({ where: { checkedAt: { lt: new Date(now - pingRetention * DAY_MS) } } }),
    db.alert.deleteMany({ where: { createdAt: { lt: new Date(now - alertRetention * DAY_MS) } } }),
  ]);
  lastRunAt = now;

  if (sessions.count + verificationTokens.count + resetTokens.count + logs.count + alerts.count > 0) {
    console.log(`[worker] Manutenção: ${sessions.count} sessões, ${verificationTokens.count + resetTokens.count} tokens, ${logs.count} logs e ${alerts.count} alertas removidos`);
  }
}

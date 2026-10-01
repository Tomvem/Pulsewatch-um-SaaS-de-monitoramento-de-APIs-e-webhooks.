import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createOpaqueToken, hashToken } from "@/lib/tokens";
import { sendPasswordChangedEmail, sendPasswordResetEmail, sendVerificationEmail } from "@/services/email-service";

const MINUTE_MS = 60_000;

export async function issueEmailVerification(user: { id: string; email: string; name: string }) {
  const recent = await db.emailVerificationToken.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - MINUTE_MS) } },
  });
  if (recent) return { delivered: false, previewUrl: undefined, throttled: true };

  const { token, tokenHash } = createOpaqueToken();
  await db.$transaction([
    db.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
    db.emailVerificationToken.create({ data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 8 * 60 * MINUTE_MS) } }),
  ]);
  return { ...await sendVerificationEmail({ email: user.email, name: user.name, token }), throttled: false };
}

export async function verifyEmail(rawToken: string) {
  const token = await db.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!token || token.expiresAt <= new Date()) return false;
  return db.$transaction(async (tx) => {
    const consumed = await tx.emailVerificationToken.deleteMany({ where: { id: token.id, expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) return false;
    await tx.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } });
    await tx.emailVerificationToken.deleteMany({ where: { userId: token.userId } });
    return true;
  });
}

export async function resendEmailVerification(email: string) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || user.emailVerifiedAt) return { delivered: false, previewUrl: undefined, throttled: false };
  return issueEmailVerification(user);
}

export async function issuePasswordReset(email: string) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return { delivered: false, previewUrl: undefined, throttled: false };
  const recent = await db.passwordResetToken.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - MINUTE_MS) } },
  });
  if (recent) return { delivered: false, previewUrl: undefined, throttled: true };

  const { token, tokenHash } = createOpaqueToken();
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    db.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 30 * MINUTE_MS) } }),
  ]);
  return { ...await sendPasswordResetEmail({ email: user.email, name: user.name, token }), throttled: false };
}

export async function resetPassword(rawToken: string, password: string) {
  const token = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!token || token.expiresAt <= new Date()) return false;

  const changed = await db.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.deleteMany({ where: { id: token.id, expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) return false;
    await tx.user.update({ where: { id: token.userId }, data: { passwordHash: hashPassword(password) } });
    await tx.passwordResetToken.deleteMany({ where: { userId: token.userId } });
    await tx.session.deleteMany({ where: { userId: token.userId } });
    return true;
  });
  if (changed) await sendPasswordChangedEmail(token.user).catch(() => undefined);
  return changed;
}

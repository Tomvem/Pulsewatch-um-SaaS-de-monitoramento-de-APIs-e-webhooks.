import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export const SESSION_COOKIE = "pulsewatch_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function publicUser(user: { id: string; name: string; email: string; createdAt: Date }) {
  return { ...user, createdAt: user.createdAt.toISOString() };
}

export const authStore = {
  async register(name: string, email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    if (existing) return null;
    const user = await db.user.create({
      data: { name, email: normalizedEmail, passwordHash: hashPassword(password) },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    return publicUser(user);
  },
  async login(email: string, password: string) {
    const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !verifyPassword(password, user.passwordHash)) return { status: "invalid" as const };
    if (!user.emailVerifiedAt) return { status: "unverified" as const, user: publicUser(user) };
    const token = randomBytes(32).toString("hex");
    await db.session.create({
      data: { tokenHash: tokenHash(token), userId: user.id, expiresAt: new Date(Date.now() + SESSION_DURATION_MS) },
    });
    return { status: "success" as const, token, user: publicUser(user) };
  },
  async userByToken(token?: string) {
    if (!token) return null;
    const session = await db.session.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    });
    if (!session || session.expiresAt <= new Date()) {
      if (session) await db.session.delete({ where: { id: session.id } });
      return null;
    }
    return publicUser(session.user);
  },
  async logout(token?: string) {
    if (token) await db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  },
};

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return authStore.userByToken(token);
}

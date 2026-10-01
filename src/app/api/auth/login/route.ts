import { NextResponse } from "next/server";
import { z } from "zod";
import { authStore, SESSION_COOKIE } from "@/lib/auth";

const schema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 422 });
  const session = await authStore.login(parsed.data.email, parsed.data.password);
  if (session.status === "invalid") return NextResponse.json({ error: "Credenciais incorretas" }, { status: 401 });
  if (session.status === "unverified") return NextResponse.json({ error: "Confirme o seu email antes de entrar", code: "EMAIL_NOT_VERIFIED", email: session.user.email }, { status: 403 });
  const response = NextResponse.json({ data: session.user });
  response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}

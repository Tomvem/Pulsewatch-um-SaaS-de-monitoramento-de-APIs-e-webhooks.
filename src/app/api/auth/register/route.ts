import { NextResponse } from "next/server";
import { z } from "zod";
import { authStore } from "@/lib/auth";
import { issueEmailVerification } from "@/services/account-recovery-service";

const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Preencha todos os campos corretamente" }, { status: 422 });
  const user = await authStore.register(parsed.data.name, parsed.data.email, parsed.data.password);
  if (!user) return NextResponse.json({ error: "Já existe uma conta com este email" }, { status: 409 });
  const delivery = await issueEmailVerification(user).catch((error) => {
    console.error("Falha ao enviar confirmação de email", error);
    return { previewUrl: undefined, delivered: false, throttled: false };
  });
  return NextResponse.json({
    data: user,
    message: delivery.delivered || delivery.previewUrl
      ? "Enviámos um link de confirmação para o seu email."
      : "Conta criada. Solicite um novo link de confirmação.",
    devPreviewUrl: process.env.NODE_ENV !== "production" ? delivery.previewUrl : undefined,
  }, { status: 201 });
}

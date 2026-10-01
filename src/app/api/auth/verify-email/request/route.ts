import { NextResponse } from "next/server";
import { z } from "zod";
import { resendEmailVerification } from "@/services/account-recovery-service";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const startedAt = Date.now();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (parsed.success) {
    const delivery = await resendEmailVerification(parsed.data.email).catch((error) => {
      console.error("Falha ao reenviar confirmação de email", error);
      return { previewUrl: undefined };
    });
    await minimumResponseTime(startedAt);
    return NextResponse.json({
      message: "Se a conta existir e ainda não estiver confirmada, enviaremos um novo link.",
      devPreviewUrl: process.env.NODE_ENV !== "production" ? delivery.previewUrl : undefined,
    });
  }
  await minimumResponseTime(startedAt);
  return NextResponse.json({ message: "Se a conta existir e ainda não estiver confirmada, enviaremos um novo link." });
}

function minimumResponseTime(startedAt: number) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, 400 - (Date.now() - startedAt))));
}

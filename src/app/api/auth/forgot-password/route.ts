import { NextResponse } from "next/server";
import { z } from "zod";
import { issuePasswordReset } from "@/services/account-recovery-service";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const startedAt = Date.now();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const delivery = parsed.success
    ? await issuePasswordReset(parsed.data.email).catch((error) => {
      console.error("Falha ao enviar recuperação de senha", error);
      return { previewUrl: undefined };
    })
    : { previewUrl: undefined };
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, 400 - (Date.now() - startedAt))));
  return NextResponse.json({
    message: "Se existir uma conta com esse email, enviaremos as instruções de recuperação.",
    devPreviewUrl: process.env.NODE_ENV !== "production" ? delivery.previewUrl : undefined,
  });
}

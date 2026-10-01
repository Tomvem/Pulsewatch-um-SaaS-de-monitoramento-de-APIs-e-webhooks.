import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmail } from "@/services/account-recovery-service";

const schema = z.object({ token: z.string().min(40).max(128) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Token inválido" }, { status: 422 });
  const verified = await verifyEmail(parsed.data.token);
  return verified
    ? NextResponse.json({ message: "Email confirmado. Já pode iniciar sessão." })
    : NextResponse.json({ error: "Este link é inválido, expirou ou já foi utilizado." }, { status: 400 });
}

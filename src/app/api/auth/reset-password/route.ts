import { NextResponse } from "next/server";
import { z } from "zod";
import { resetPassword } from "@/services/account-recovery-service";

const schema = z.object({
  token: z.string().min(40).max(128),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido" }, { status: 422 });
  const changed = await resetPassword(parsed.data.token, parsed.data.password);
  return changed
    ? NextResponse.json({ message: "Senha atualizada. Todas as sessões anteriores foram terminadas." })
    : NextResponse.json({ error: "Este link é inválido, expirou ou já foi utilizado." }, { status: 400 });
}

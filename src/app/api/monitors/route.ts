import { NextResponse } from "next/server";
import { monitorStore } from "@/lib/store";
import { createMonitorSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return NextResponse.json({ data: await monitorStore.list(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const parsed = createMonitorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  return NextResponse.json({ data: await monitorStore.create(parsed.data, user.id) }, { status: 201 });
}

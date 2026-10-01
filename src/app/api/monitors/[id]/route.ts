import { NextResponse } from "next/server";
import { monitorStore } from "@/lib/store";
import { updateMonitorSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const monitor = await monitorStore.find(id, user.id);
  return monitor
    ? NextResponse.json({ data: monitor })
    : NextResponse.json({ error: "Monitor não encontrado" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const parsed = updateMonitorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const monitor = await monitorStore.update(id, user.id, parsed.data);
  return monitor
    ? NextResponse.json({ data: monitor })
    : NextResponse.json({ error: "Monitor não encontrado" }, { status: 404 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  return await monitorStore.delete(id, user.id)
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json({ error: "Monitor não encontrado" }, { status: 404 });
}

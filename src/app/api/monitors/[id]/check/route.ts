import { NextResponse } from "next/server";
import { checkMonitor } from "@/services/check-service";
import { getCurrentUser } from "@/lib/auth";
import { monitorStore } from "@/lib/store";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!(await monitorStore.find(id, user.id))) return NextResponse.json({ error: "Monitor não encontrado" }, { status: 404 });
  const monitor = await checkMonitor(id);
  return monitor
    ? NextResponse.json({ data: monitor })
    : NextResponse.json({ error: "Monitor não encontrado" }, { status: 404 });
}

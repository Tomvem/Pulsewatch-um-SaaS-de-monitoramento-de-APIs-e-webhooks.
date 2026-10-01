import { CircleCheck, CircleDashed, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MonitorStatus } from "@/types/monitor";

export function StatusBadge({ status, compact = false }: { status: MonitorStatus; compact?: boolean }) {
  const Icon = status === "UP" ? CircleCheck : status === "DOWN" ? CircleX : CircleDashed;
  const label = status === "UP" ? "Operacional" : status === "DOWN" ? "Indisponível" : "Pendente";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
      status === "UP" && "bg-emerald-50 text-emerald-700",
      status === "DOWN" && "bg-red-50 text-red-700",
      status === "PENDING" && "bg-amber-50 text-amber-700",
    )}>
      <Icon className="h-3.5 w-3.5" /> {!compact && label}
    </span>
  );
}

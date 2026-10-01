import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLatency(value: number | null) {
  return value === null ? "—" : `${value} ms`;
}

export function calculateUptime(logs: { status: "UP" | "DOWN" }[]) {
  if (!logs.length) return 0;
  return Number(((logs.filter((log) => log.status === "UP").length / logs.length) * 100).toFixed(2));
}

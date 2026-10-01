"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import type { PingLog } from "@/types/monitor";

export function LatencyChart({ logs }: { logs: PingLog[] }) {
  const data = logs.slice(-24).map((log) => ({
    time: format(new Date(log.checkedAt), "HH:mm"),
    latency: log.latencyMs,
    status: log.status,
  }));

  if (!data.length) return <div className="grid h-64 place-items-center text-sm text-slate-400">Sem dados de latência.</div>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 4, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="latency" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#087e6b" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#087e6b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e7ece9" strokeDasharray="4 5" vertical={false} />
          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#87938f", fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#87938f", fontSize: 11 }} unit="ms" />
          <Tooltip contentStyle={{ border: 0, borderRadius: 12, boxShadow: "0 10px 35px rgba(0,0,0,.12)", fontSize: 12 }} formatter={(value: number) => [`${value} ms`, "Latência"]} />
          <Area type="monotone" dataKey="latency" stroke="#087e6b" strokeWidth={2.5} fill="url(#latency)" activeDot={{ r: 5, fill: "#c7f464", stroke: "#087e6b", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

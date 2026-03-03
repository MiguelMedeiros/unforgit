"use client";

import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useMemo } from "react";

interface StoreStats {
  total: number;
  byType: { episodic: number; semantic: number; procedural: number };
  byStatus: { active: number; deprecated: number; superseded: number };
}

interface DashboardChartsProps {
  stats: StoreStats;
}

const TYPE_COLORS = {
  episodic: "#ffb86c",
  semantic: "#bd93f9",
  procedural: "#50fa7b",
};

const STATUS_COLORS = {
  active: "#50fa7b",
  deprecated: "#ff5555",
  superseded: "#ffb86c",
};

export function MemoryTypeChart({ stats }: DashboardChartsProps) {
  const data = [
    { name: "Episodic", value: stats.byType.episodic, color: TYPE_COLORS.episodic },
    { name: "Semantic", value: stats.byType.semantic, color: TYPE_COLORS.semantic },
    { name: "Procedural", value: stats.byType.procedural, color: TYPE_COLORS.procedural },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-[13px] text-muted-foreground">
        No data
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[15px] font-semibold">By Type</h3>
      <div className="rounded-xl border border-border/30 bg-dracula-current/20 p-4 h-[180px] flex items-center">
        <div className="flex items-center gap-6 w-full">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(28, 28, 30, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#f5f5f7" }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-col gap-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[13px] text-foreground">{item.name}</span>
                <span className="text-[13px] text-muted-foreground">({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DailyChartProps {
  dailyCounts: Array<{ date: string; count: number }>;
}

export function DailyMemoriesChart({ dailyCounts }: DailyChartProps) {
  const data = useMemo(() => {
    const countMap = new Map(dailyCounts.map((d) => [d.date, d.count]));
    const result: Array<{ date: string; label: string; count: number }> = [];
    
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      result.push({
        date: dateStr,
        label,
        count: countMap.get(dateStr) ?? 0,
      });
    }
    
    return result;
  }, [dailyCounts]);

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">Last 30 Days</h3>
        <p className="text-[12px] text-muted-foreground">{total} memories</p>
      </div>
      <div className="rounded-xl border border-border/30 bg-dracula-current/20 p-4 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#bd93f9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#bd93f9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#98989d", fontSize: 10 }}
              interval={6}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(28, 28, 30, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              itemStyle={{ color: "#f5f5f7" }}
              labelStyle={{ color: "#98989d" }}
              formatter={(value: number) => [`${value} memories`, ""]}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#bd93f9"
              strokeWidth={2}
              fill="url(#colorCount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

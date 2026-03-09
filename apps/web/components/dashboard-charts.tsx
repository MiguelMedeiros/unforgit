"use client";

import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  hourlyCounts?: Array<{ hour: string; count: number }>;
  days?: number;
  title?: string;
  isIntraday?: boolean;
}

export function DailyMemoriesChart({ dailyCounts, hourlyCounts, days = 30, title, isIntraday = false }: DailyChartProps) {
  const data = useMemo(() => {
    if (isIntraday && hourlyCounts) {
      const countMap = new Map(hourlyCounts.map((d) => [d.hour, d.count]));
      const result: Array<{ date: string; label: string; count: number }> = [];
      
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now);
        d.setHours(d.getHours() - i, 0, 0, 0);
        const hourStr = `${d.toISOString().split("T")[0]} ${String(d.getHours()).padStart(2, "0")}:00`;
        const label = d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
        result.push({
          date: hourStr,
          label,
          count: countMap.get(hourStr) ?? 0,
        });
      }
      
      return result;
    }

    const countMap = new Map(dailyCounts.map((d) => [d.date, d.count]));
    const result: Array<{ date: string; label: string; count: number }> = [];
    
    const daysToShow = Math.min(days, 365);
    const today = new Date();
    for (let i = daysToShow - 1; i >= 0; i--) {
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
  }, [dailyCounts, hourlyCounts, days, isIntraday]);

  const total = data.reduce((sum, d) => sum + d.count, 0);

  const chartTitle = title ?? (isIntraday ? "Last 24 Hours" : days === 1 ? "Today" : `Last ${days} Days`);
  const xAxisInterval = isIntraday ? 3 : days <= 7 ? 0 : days <= 30 ? 6 : days <= 90 ? 14 : 30;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{chartTitle}</h3>
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
              interval={xAxisInterval}
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
              formatter={(value) => [`${value ?? 0} memories`, ""]}
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

interface TopTagsChartProps {
  tags: Array<{ tag: string; count: number }>;
}

export function TopTagsChart({ tags }: TopTagsChartProps) {
  if (tags.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-[15px] font-semibold">Top Tags</h3>
        <div className="flex h-[180px] items-center justify-center rounded-xl border border-border/30 bg-dracula-current/20 text-[13px] text-muted-foreground">
          No tags yet
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...tags.map((t) => t.count));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">Top Tags</h3>
        <p className="text-[12px] text-muted-foreground">{tags.length} tags</p>
      </div>
      <div className="rounded-xl border border-border/30 bg-dracula-current/20 p-4 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={tags}
            layout="vertical"
            margin={{ left: 0, right: 12, top: 0, bottom: 0 }}
          >
            <XAxis type="number" hide domain={[0, maxCount]} />
            <YAxis
              type="category"
              dataKey="tag"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#98989d", fontSize: 11 }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(28, 28, 30, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              itemStyle={{ color: "#f5f5f7" }}
              formatter={(value) => [`${value ?? 0} memories`, ""]}
              labelFormatter={(label) => `#${label}`}
            />
            <Bar
              dataKey="count"
              fill="#8be9fd"
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface MemoryLifecycleProps {
  stats: {
    byStatus: { active: number; deprecated: number; superseded: number; deleted?: number };
    byVisibility: Record<string, number>;
  };
}

const LIFECYCLE_COLORS = {
  active: "#50fa7b",
  superseded: "#ffb86c",
  deprecated: "#6272a4",
};

const VISIBILITY_COLORS = {
  private: "#bd93f9",
  repo: "#8be9fd",
};

export function MemoryLifecycleChart({ stats }: MemoryLifecycleProps) {
  const statusData = [
    { name: "Active", value: stats.byStatus.active, color: LIFECYCLE_COLORS.active },
    { name: "Superseded", value: stats.byStatus.superseded, color: LIFECYCLE_COLORS.superseded },
    { name: "Deprecated", value: stats.byStatus.deprecated, color: LIFECYCLE_COLORS.deprecated },
  ].filter((d) => d.value > 0);

  const visibilityData = [
    { name: "Private", value: stats.byVisibility.private || 0, color: VISIBILITY_COLORS.private },
    { name: "Repo", value: stats.byVisibility.repo || 0, color: VISIBILITY_COLORS.repo },
  ].filter((d) => d.value > 0);

  const statusTotal = statusData.reduce((sum, d) => sum + d.value, 0);
  const visibilityTotal = visibilityData.reduce((sum, d) => sum + d.value, 0);

  if (statusTotal === 0 && visibilityTotal === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-[15px] font-semibold">Memory Health</h3>
        <div className="flex h-[180px] items-center justify-center rounded-xl border border-border/30 bg-dracula-current/20 text-[13px] text-muted-foreground">
          No data
        </div>
      </div>
    );
  }

  const healthScore = statusTotal > 0 ? Math.round((stats.byStatus.active / statusTotal) * 100) : 0;

  return (
    <div className="space-y-3">
      <h3 className="text-[15px] font-semibold">Memory Health</h3>
      <div className="rounded-xl border border-border/30 bg-dracula-current/20 p-4 h-[180px] flex items-center">
        <div className="flex items-center gap-6 w-full">
          <div className="relative">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
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
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[18px] font-bold text-dracula-green">{healthScore}%</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 flex-1">
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">Status</span>
              <div className="flex flex-col gap-1">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[12px] text-foreground">{item.name}</span>
                    <span className="text-[12px] text-muted-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">Visibility</span>
              <div className="flex gap-3">
                {visibilityData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

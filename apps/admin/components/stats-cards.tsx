"use client";

import {
  Brain,
  Lightbulb,
  BookOpen,
  Activity,
} from "lucide-react";

interface StoreStats {
  total: number;
  byType: { episodic: number; semantic: number; procedural: number };
  byStatus: { active: number; deprecated: number; superseded: number };
}

interface StatsCardsProps {
  stats: StoreStats;
}

const statItems = [
  {
    key: "total" as const,
    label: "Total Memories",
    icon: Brain,
    getValue: (s: StoreStats) => s.total,
  },
  {
    key: "episodic" as const,
    label: "Episodic",
    icon: Activity,
    getValue: (s: StoreStats) => s.byType.episodic,
    subtitle: "Events & observations",
  },
  {
    key: "semantic" as const,
    label: "Semantic",
    icon: Lightbulb,
    getValue: (s: StoreStats) => s.byType.semantic,
    subtitle: "Facts & decisions",
  },
  {
    key: "procedural" as const,
    label: "Procedural",
    icon: BookOpen,
    getValue: (s: StoreStats) => s.byType.procedural,
    subtitle: "Playbooks & workflows",
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  const total = stats.byStatus.active + stats.byStatus.deprecated + stats.byStatus.superseded;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4">
        {statItems.map((item, i) => {
          const value = item.getValue(stats);
          return (
            <div
              key={item.key}
              className="rounded-xl border border-border/30 bg-dracula-current p-3 sm:p-4 transition-colors duration-150 hover:bg-dracula-current/35 animate-scale-in"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-white/6">
                  <item.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-foreground/80" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground leading-tight">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[18px] sm:text-[22px] font-bold tracking-tight leading-none">
                    {value}
                  </p>
                </div>
              </div>
              {item.subtitle && (
                <p className="mt-2 sm:mt-3 text-[10px] sm:text-[11px] text-muted-foreground/60 hidden sm:block">
                  {item.subtitle}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border/30 bg-dracula-current px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          {[
            { label: "Active", value: stats.byStatus.active, color: "bg-foreground" },
            { label: "Deprecated", value: stats.byStatus.deprecated, color: "bg-muted-foreground/60" },
            { label: "Superseded", value: stats.byStatus.superseded, color: "bg-muted-foreground/30" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 sm:gap-2">
              <div className={`h-2 w-2 rounded-full ${s.color}`} />
              <span className="text-[11px] sm:text-[12px] text-muted-foreground">{s.label}</span>
              <span className="text-[12px] sm:text-[13px] font-semibold text-foreground">{s.value}</span>
            </div>
          ))}

          {total > 0 && (
            <div className="hidden sm:flex ml-auto h-1.5 flex-1 max-w-[180px] overflow-hidden rounded-full bg-white/4">
              {stats.byStatus.active > 0 && (
                <div
                  className="h-full bg-foreground rounded-full"
                  style={{ width: `${(stats.byStatus.active / total) * 100}%` }}
                />
              )}
              {stats.byStatus.deprecated > 0 && (
                <div
                  className="h-full bg-muted-foreground/60"
                  style={{ width: `${(stats.byStatus.deprecated / total) * 100}%` }}
                />
              )}
              {stats.byStatus.superseded > 0 && (
                <div
                  className="h-full bg-muted-foreground/30"
                  style={{ width: `${(stats.byStatus.superseded / total) * 100}%` }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

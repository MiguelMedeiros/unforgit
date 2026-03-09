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
  byVisibility: Record<string, number>;
}

interface StatsCardsProps {
  local: StoreStats;
  remote: StoreStats;
  remoteAvailable: boolean;
}

const statItems = [
  {
    key: "total" as const,
    label: "Total",
    icon: Brain,
    iconColor: "text-dracula-purple",
    getValue: (c: ReturnType<typeof getCombined>) => c.total,
  },
  {
    key: "episodic" as const,
    label: "Episodic",
    icon: Activity,
    iconColor: "text-dracula-orange",
    getValue: (c: ReturnType<typeof getCombined>) => c.episodic,
    subtitle: "Events & observations",
  },
  {
    key: "semantic" as const,
    label: "Semantic",
    icon: Lightbulb,
    iconColor: "text-dracula-pink",
    getValue: (c: ReturnType<typeof getCombined>) => c.semantic,
    subtitle: "Facts & decisions",
  },
  {
    key: "procedural" as const,
    label: "Procedural",
    icon: BookOpen,
    iconColor: "text-dracula-green",
    getValue: (c: ReturnType<typeof getCombined>) => c.procedural,
    subtitle: "Playbooks & workflows",
  },
];

function getCombined(local: StoreStats, remote: StoreStats) {
  return {
    total: local.total + remote.total,
    episodic: local.byType.episodic + remote.byType.episodic,
    semantic: local.byType.semantic + remote.byType.semantic,
    procedural: local.byType.procedural + remote.byType.procedural,
    active: local.byStatus.active + remote.byStatus.active,
    deprecated: local.byStatus.deprecated + remote.byStatus.deprecated,
    superseded: local.byStatus.superseded + remote.byStatus.superseded,
  };
}

export function StatsCards({ local, remote, remoteAvailable }: StatsCardsProps) {
  const combined = getCombined(local, remote);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statItems.map((item, i) => {
          const value = item.getValue(combined);
          return (
            <div
              key={item.key}
              className="rounded-xl border border-border/30 bg-dracula-current/20 p-4 transition-colors duration-150 hover:bg-dracula-current/35 animate-scale-in"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] font-medium text-muted-foreground">
                  {item.label}
                </span>
                <item.icon className={`h-4 w-4 ${item.iconColor} opacity-70`} />
              </div>
              <div className="text-[28px] font-bold tracking-tight leading-none">
                {value}
              </div>
              {item.key === "total" ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                  {local.total} local
                  {remoteAvailable ? ` · ${remote.total} remote` : ""}
                </p>
              ) : item.subtitle ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                  {item.subtitle}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Status row */}
      <div className="flex gap-3">
        {[
          { label: "Active", value: combined.active, color: "bg-dracula-green" },
          { label: "Deprecated", value: combined.deprecated, color: "bg-dracula-yellow" },
          { label: "Superseded", value: combined.superseded, color: "bg-dracula-comment" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-1 items-center gap-3 rounded-xl border border-border/30 bg-dracula-current/20 px-4 py-3 transition-colors duration-150 hover:bg-dracula-current/35"
          >
            <div className={`h-2 w-2 rounded-full ${s.color}`} />
            <span className="text-[12px] text-muted-foreground">{s.label}</span>
            <span className="ml-auto text-[15px] font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

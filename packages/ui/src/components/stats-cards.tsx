"use client";

import { Brain, Lightbulb, BookOpen, Activity } from "lucide-react";

export interface StoreStats {
  total: number;
  byType: { episodic: number; semantic: number; procedural: number };
  byStatus: { active: number; deprecated: number; superseded: number };
  byVisibility: Record<string, number>;
}

export interface StatsCardsProps {
  local: StoreStats;
  remote: StoreStats;
  remoteAvailable: boolean;
}

const statItems = [
  {
    key: "total" as const,
    label: "Total Memories",
    icon: Brain,
    getValue: (c: ReturnType<typeof getCombined>) => c.total,
  },
  {
    key: "episodic" as const,
    label: "Episodic",
    icon: Activity,
    getValue: (c: ReturnType<typeof getCombined>) => c.episodic,
    subtitle: "Events & observations",
  },
  {
    key: "semantic" as const,
    label: "Semantic",
    icon: Lightbulb,
    getValue: (c: ReturnType<typeof getCombined>) => c.semantic,
    subtitle: "Facts & decisions",
  },
  {
    key: "procedural" as const,
    label: "Procedural",
    icon: BookOpen,
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

export function StatsCards({
  local,
  remote,
  remoteAvailable,
}: StatsCardsProps) {
  const combined = getCombined(local, remote);
  const total = combined.active + combined.deprecated + combined.superseded;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statItems.map((item, i) => {
          const value = item.getValue(combined);
          return (
            <div
              key={item.key}
              className="rounded-xl border border-border/30 bg-dracula-current p-4 transition-colors duration-150 hover:bg-dracula-current/35 animate-scale-in"
              style={{
                animationDelay: `${i * 80}ms`,
                animationFillMode: "both",
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/6">
                  <item.icon className="h-[18px] w-[18px] text-foreground/80" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[22px] font-bold tracking-tight leading-none">
                    {value}
                  </p>
                </div>
              </div>
              {item.key === "total" ? (
                <p className="mt-3 text-[11px] text-muted-foreground/60">
                  {local.total} local
                  {remoteAvailable ? ` · ${remote.total} remote` : ""}
                </p>
              ) : item.subtitle ? (
                <p className="mt-3 text-[11px] text-muted-foreground/60">
                  {item.subtitle}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border/30 bg-dracula-current px-4 py-3">
        <div className="flex items-center gap-6">
          {[
            { label: "Active", value: combined.active, color: "bg-foreground" },
            {
              label: "Deprecated",
              value: combined.deprecated,
              color: "bg-muted-foreground/60",
            },
            {
              label: "Superseded",
              value: combined.superseded,
              color: "bg-muted-foreground/30",
            },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${s.color}`} />
              <span className="text-[12px] text-muted-foreground">
                {s.label}
              </span>
              <span className="text-[13px] font-semibold text-foreground">
                {s.value}
              </span>
            </div>
          ))}

          {total > 0 && (
            <div className="ml-auto flex h-1.5 flex-1 max-w-[180px] overflow-hidden rounded-full bg-white/4">
              {combined.active > 0 && (
                <div
                  className="h-full bg-foreground rounded-full"
                  style={{ width: `${(combined.active / total) * 100}%` }}
                />
              )}
              {combined.deprecated > 0 && (
                <div
                  className="h-full bg-muted-foreground/60"
                  style={{ width: `${(combined.deprecated / total) * 100}%` }}
                />
              )}
              {combined.superseded > 0 && (
                <div
                  className="h-full bg-muted-foreground/30"
                  style={{ width: `${(combined.superseded / total) * 100}%` }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

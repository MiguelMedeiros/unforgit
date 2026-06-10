"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brain, ArrowRight, Sparkles, GitMerge, Network } from "lucide-react";
import { StatsCards } from "@/components/stats-cards";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { MemoryTypeChart, DailyMemoriesChart, TopTagsChart, MemoryLifecycleChart } from "@/components/dashboard-charts";
import { TimeframeSelector, type Timeframe, getTimeframeDays } from "@/components/timeframe-selector";

interface StoreStats {
  total: number;
  byType: { episodic: number; semantic: number; procedural: number };
  byStatus: { active: number; deprecated: number; superseded: number };
  byVisibility: Record<string, number>;
}

interface ActivityData {
  dailyCounts: Array<{ date: string; count: number }>;
  weeklyTrend: Array<{ week: string; count: number }>;
  hourlyCounts: Array<{ hour: string; count: number }>;
}

interface TagData {
  tag: string;
  count: number;
}

interface GraphHealth {
  activeMemories: number;
  activeConsolidations: number;
  supersededMemories: number;
  validLinks: number;
  orphanActiveMemories: number;
  orphanRatio: number;
  derivedFromLinks: number;
  relatedLinks: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [timeframe, setTimeframeState] = useState<Timeframe>("all");

  useEffect(() => {
    const saved = localStorage.getItem("unforgit-dashboard-timeframe") as Timeframe | null;
    if (saved) setTimeframeState(saved);
  }, []);

  const setTimeframe = useCallback((value: Timeframe) => {
    setTimeframeState(value);
    localStorage.setItem("unforgit-dashboard-timeframe", value);
  }, []);
  const [stats, setStats] = useState<{
    local: StoreStats;
    remote: StoreStats;
    remoteAvailable: boolean;
  } | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [topTags, setTopTags] = useState<TagData[]>([]);
  const [consolidationInfo, setConsolidationInfo] = useState<{
    candidateGroups: number;
    totalMemoriesInGroups: number;
  } | null>(null);
  const [graphHealth, setGraphHealth] = useState<GraphHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const timeframeParam = timeframe !== "all" ? `timeframe=${timeframe}` : "";
      const [statsRes, activityRes, tagsRes, consolidationRes, healthRes] = await Promise.all([
        fetch(`/api/stats${timeframeParam ? `?${timeframeParam}` : ""}`),
        fetch(`/api/stats/activity${timeframeParam ? `?${timeframeParam}` : ""}`),
        fetch(`/api/stats/tags?limit=6${timeframeParam ? `&${timeframeParam}` : ""}`),
        fetch("/api/consolidation/candidates?maxGroups=100&threshold=0.4"),
        fetch("/api/health"),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (activityRes.ok) {
        setActivity(await activityRes.json());
      }

      if (tagsRes.ok) {
        const data = await tagsRes.json();
        setTopTags(data.tags);
      }

      if (consolidationRes.ok) {
        const data = await consolidationRes.json();
        const totalMemoriesInGroups = data.candidates?.reduce(
          (sum: number, c: { memories: unknown[] }) => sum + c.memories.length,
          0
        ) ?? 0;
        setConsolidationInfo({
          candidateGroups: data.totalCandidateGroups ?? 0,
          totalMemoriesInGroups,
        });
      }

      if (healthRes.ok) {
        const data = await healthRes.json();
        setGraphHealth(data.graphHealth ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <span className="text-[13px] text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="animate-fade-in space-y-10">
          {/* Hero */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight">
                Dashboard
              </h1>
              <p className="text-[13px] text-muted-foreground">
                Your repository memory at a glance
              </p>
            </div>
            <TimeframeSelector value={timeframe} onChange={setTimeframe} />
          </div>

          {/* Stats */}
          {stats && (
            <StatsCards
              local={stats.local}
              remote={stats.remote}
              remoteAvailable={stats.remoteAvailable}
            />
          )}

          {/* Activity Heatmap */}
          {activity && (
            <ActivityHeatmap dailyCounts={activity.dailyCounts} />
          )}

          {/* Consolidation Card */}
          {consolidationInfo && stats && (
            <div className="rounded-xl border border-border/30 bg-dracula-current p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <GitMerge className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">Memory Consolidation</h3>
                    <p className="text-[13px] text-muted-foreground">
                      {consolidationInfo.candidateGroups > 0 ? (
                        <>
                          <span className="font-medium text-foreground">{consolidationInfo.candidateGroups} groups</span>
                          {" "}with{" "}
                          <span className="font-medium text-foreground">{consolidationInfo.totalMemoriesInGroups} memories</span>
                          {" "}can be consolidated
                        </>
                      ) : stats.local.byStatus.superseded > 0 ? (
                        <>
                          <span className="font-medium text-foreground">{stats.local.byStatus.superseded} memories</span>
                          {" "}already consolidated
                        </>
                      ) : (
                        "No similar memories found to consolidate"
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/consolidation")}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-[13px] font-medium text-foreground hover:bg-white/15 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  {consolidationInfo.candidateGroups > 0 ? "Review & Merge" : "View"}
                </button>
              </div>
            </div>
          )}

          {/* Graph Health Card */}
          {graphHealth && (
            <div className="rounded-xl border border-border/30 bg-dracula-current p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <Network className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">Graph Health</h3>
                    <p className="text-[13px] text-muted-foreground">
                      <span className="font-medium text-foreground">{graphHealth.validLinks}</span>
                      {" "}valid links ·{" "}
                      <span className="font-medium text-foreground">{graphHealth.activeConsolidations}</span>
                      {" "}consolidations ·{" "}
                      <span className={graphHealth.orphanActiveMemories > 0 ? "font-medium text-yellow-300" : "font-medium text-foreground"}>
                        {graphHealth.orphanActiveMemories}
                      </span>
                      {" "}active orphans
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/graph")}
                  className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-[13px] font-medium text-foreground hover:bg-white/15 transition-colors"
                >
                  View Graph
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          {stats && activity && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <MemoryLifecycleChart stats={stats.local} />
              <DailyMemoriesChart 
                dailyCounts={activity.dailyCounts} 
                hourlyCounts={activity.hourlyCounts}
                days={getTimeframeDays(timeframe) ?? 365}
                title={timeframe === "all" ? "All Time" : undefined}
                isIntraday={timeframe === "1d"}
              />
              <TopTagsChart tags={topTags} />
              <MemoryTypeChart stats={stats.local} />
            </div>
          )}

          {/* Memories Card */}
          {stats && (
            <div className="rounded-xl border border-border/30 bg-dracula-current p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <Brain className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">Memories</h3>
                    <p className="text-[13px] text-muted-foreground">
                      <span className="font-medium text-foreground">{stats.local.total}</span>
                      {" "}memories stored locally
                      {stats.remoteAvailable && stats.remote.total > 0 && (
                        <>
                          {" · "}
                          <span className="font-medium text-foreground">{stats.remote.total}</span>
                          {" "}remote
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/memories")}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-[13px] font-medium text-foreground hover:bg-white/15 transition-colors"
                >
                  View All
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

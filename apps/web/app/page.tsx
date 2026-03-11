"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brain, ArrowRight, Sparkles, GitMerge } from "lucide-react";
import { StatsCards } from "@/components/stats-cards";
import { MemoryCard } from "@/components/memory-card";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { MemoryTypeChart, DailyMemoriesChart, TopTagsChart, MemoryLifecycleChart } from "@/components/dashboard-charts";
import { TimeframeSelector, type Timeframe, getTimeframeDays } from "@/components/timeframe-selector";

interface StoreStats {
  total: number;
  byType: { episodic: number; semantic: number; procedural: number };
  byStatus: { active: number; deprecated: number; superseded: number };
  byVisibility: Record<string, number>;
}

interface MemoryItem {
  id: string;
  memoryType: string;
  text: string;
  tags: string[];
  status: string;
  source: "local" | "remote";
  createdAt: string;
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
  const [recentMemories, setRecentMemories] = useState<MemoryItem[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [topTags, setTopTags] = useState<TagData[]>([]);
  const [consolidationInfo, setConsolidationInfo] = useState<{
    candidateGroups: number;
    totalMemoriesInGroups: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const timeframeParam = timeframe !== "all" ? `timeframe=${timeframe}` : "";
      const [statsRes, memoriesRes, activityRes, tagsRes, consolidationRes] = await Promise.all([
        fetch(`/api/stats${timeframeParam ? `?${timeframeParam}` : ""}`),
        fetch("/api/memories?source=local&limit=3&sortBy=createdAt&sortOrder=desc"),
        fetch(`/api/stats/activity${timeframeParam ? `?${timeframeParam}` : ""}`),
        fetch(`/api/stats/tags?limit=6${timeframeParam ? `&${timeframeParam}` : ""}`),
        fetch("/api/consolidation/candidates?maxGroups=100&threshold=0.4"),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (memoriesRes.ok) {
        const data = await memoriesRes.json();
        setRecentMemories(data.memories);
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

          {/* Recent */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold">Recent Memories</h2>
              {recentMemories.length > 0 && (
                <button
                  onClick={() => router.push("/memories")}
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-white/15 transition-colors"
                >
                  View All
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {recentMemories.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/40 py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                  <Brain className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-[13px] text-muted-foreground">
                  No memories yet
                </p>
                <p className="text-[12px] text-muted-foreground/60">
                  Use{" "}
                  <code className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px]">
                    unforgit add
                  </code>{" "}
                  or the Memories page to create some
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMemories.map((m, i) => (
                  <div
                    key={m.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                  >
                    <MemoryCard
                      {...m}
                      onClick={() => router.push(`/memories?detail=${m.id}`)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

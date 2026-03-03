"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brain, ArrowRight } from "lucide-react";
import { StatsCards } from "@/components/stats-cards";
import { MemoryCard } from "@/components/memory-card";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { MemoryTypeChart, DailyMemoriesChart } from "@/components/dashboard-charts";

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
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<{
    local: StoreStats;
    remote: StoreStats;
    remoteAvailable: boolean;
  } | null>(null);
  const [recentMemories, setRecentMemories] = useState<MemoryItem[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, memoriesRes, activityRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/memories?source=local&limit=3&sortBy=createdAt&sortOrder=desc"),
        fetch("/api/stats/activity"),
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
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
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Your repository memory at a glance
            </p>
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
          {activity && <ActivityHeatmap dailyCounts={activity.dailyCounts} />}

          {/* Charts Grid */}
          {stats && activity && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <MemoryTypeChart stats={stats.local} />
              <DailyMemoriesChart dailyCounts={activity.dailyCounts} />
            </div>
          )}

          {/* Recent */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold">Recent Memories</h2>
              {recentMemories.length > 0 && (
                <button
                  onClick={() => router.push("/memories")}
                  className="flex items-center gap-1.5 rounded-lg bg-apple-blue/15 px-3 py-1.5 text-[13px] font-medium text-apple-blue hover:bg-apple-blue/25 transition-colors"
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
                    hippo add
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

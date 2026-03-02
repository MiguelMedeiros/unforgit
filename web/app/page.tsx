"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Brain, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatsCards } from "@/components/stats-cards";
import { MemoryCard } from "@/components/memory-card";

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

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<{
    local: StoreStats;
    remote: StoreStats;
    remoteAvailable: boolean;
  } | null>(null);
  const [recentMemories, setRecentMemories] = useState<MemoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, memoriesRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/memories?source=local&limit=10&sortBy=createdAt&sortOrder=desc"),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (memoriesRes.ok) {
        const data = await memoriesRes.json();
        setRecentMemories(data.memories);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/memories?search=${encodeURIComponent(search.trim())}`);
    }
  }

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
          <div className="space-y-4">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight">
                Dashboard
              </h1>
              <p className="text-[13px] text-muted-foreground">
                Your repository memory at a glance
              </p>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="relative max-w-lg">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                placeholder="Search memories..."
                className="h-11 pl-10 pr-4 rounded-xl bg-white/[0.04] border-border/40"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          </div>

          {/* Stats */}
          {stats && (
            <StatsCards
              local={stats.local}
              remote={stats.remote}
              remoteAvailable={stats.remoteAvailable}
            />
          )}

          {/* Recent */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold">Recent Memories</h2>
              {recentMemories.length > 0 && (
                <button
                  onClick={() => router.push("/memories")}
                  className="flex items-center gap-1 text-[13px] font-medium text-apple-blue hover:text-apple-blue/80 transition-colors"
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

"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FolderGit2,
  ExternalLink,
  Search,
  Loader2,
  RefreshCw,
  LayoutDashboard,
  GitBranch,
  Layers,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { apiFetch } from "@/lib/api";
import { StatsCards } from "@/components/stats-cards";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { MemoryCard } from "@/components/memory-card";
import { MemoryDetailSheet } from "@/components/memory-detail-sheet";
import { FilterBar } from "@/components/filter-bar";
import { MemoryGraph } from "@/components/memory-graph";

interface MemoryItem {
  id: string;
  orgId: string;
  repoId: string;
  memoryType: string;
  text: string;
  tags: string[];
  status: string;
  visibility: string;
  sourceRefs?: Record<string, unknown>;
  confidence?: number;
  authorId?: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  byType: { episodic: number; semantic: number; procedural: number };
  byStatus: { active: number; deprecated: number; superseded: number };
}

interface ActivityData {
  dailyCounts: Array<{ date: string; count: number }>;
}

const PAGE_SIZE = 20;

type ViewMode = "dashboard" | "graph";

export default function RepoDetailPage({
  params,
}: {
  params: Promise<{ org: string; repo: string }>;
}) {
  const { org, repo } = use(params);
  
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("active");
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const fetchStats = useCallback(async () => {
    try {
      const [statsData, activityData] = await Promise.all([
        apiFetch<{ stats: Stats }>(`/api/repo/${org}/${repo}/stats`),
        apiFetch<ActivityData>(`/api/repo/${org}/${repo}/stats/activity`),
      ]);
      setStats(statsData.stats);
      setActivity(activityData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load stats");
    }
  }, [org, repo]);

  const loadMemories = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offsetRef.current;

    if (reset) {
      setLoading(true);
      offsetRef.current = 0;
    } else {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }

    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(currentOffset));
    params.set("sortBy", "createdAt");
    params.set("sortOrder", "desc");

    if (searchQuery) params.set("search", searchQuery);
    if (type !== "all") params.set("types", type);
    if (status !== "all") params.set("status", status);

    try {
      const data = await apiFetch<{ memories: MemoryItem[]; total: number }>(
        `/api/repo/${org}/${repo}/memories?${params.toString()}`
      );
      
      if (reset) {
        setMemories(data.memories);
      } else {
        setMemories((prev) => [...prev, ...data.memories]);
      }
      
      setTotal(data.total);
      offsetRef.current = currentOffset + data.memories.length;
      setHasMore(currentOffset + data.memories.length < data.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load memories");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [org, repo, searchQuery, type, status]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    loadMemories(true);
  }, [loadMemories]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMoreRef.current) {
          loadMemories(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMemories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(search);
  };

  const handleRefresh = () => {
    fetchStats();
    loadMemories(true);
  };

  const handleGraphMemoryClick = useCallback((memory: { id: string; memoryType: string; text: string; tags: string[]; status: string; createdAt: string }) => {
    const fullMemory: MemoryItem = {
      id: memory.id,
      orgId: org,
      repoId: repo,
      memoryType: memory.memoryType,
      text: memory.text,
      tags: memory.tags,
      status: memory.status,
      visibility: "private",
      createdAt: memory.createdAt,
      updatedAt: memory.createdAt,
    };
    setSelectedMemory(fullMemory);
  }, [org, repo]);

  return (
    <AuthGuard>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-10">
          <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-6">
              <Link
                href="/repos"
                className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Repositories
              </Link>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FolderGit2 className="h-6 w-6 text-foreground/70" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-[28px] font-bold tracking-tight font-mono">
                        {org}/{repo}
                      </h1>
                      <a
                        href={`https://github.com/${org}/${repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground/30 hover:text-foreground/70 transition-colors"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      Repository memory dashboard
                    </p>
                  </div>
                </div>
                {viewMode === "dashboard" && (
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl border border-border/50 bg-white/[0.04] px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-dracula-current p-1.5">
              <button
                onClick={() => setViewMode("dashboard")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
                  viewMode === "dashboard"
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setViewMode("graph")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
                  viewMode === "graph"
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <GitBranch className="h-4 w-4" />
                Graph
              </button>
              <Link
                href={`/repos/${org}/${repo}/consolidation`}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <Layers className="h-4 w-4" />
                Consolidation
              </Link>
              <Link
                href={`/repos/${org}/${repo}/keys`}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <Key className="h-4 w-4" />
                API Keys
              </Link>
            </div>

            {viewMode === "dashboard" ? (
              <div ref={scrollContainerRef} className="space-y-8">
                {stats && <StatsCards stats={stats} />}

                {activity && activity.dailyCounts.length > 0 && (
                  <ActivityHeatmap dailyCounts={activity.dailyCounts} />
                )}

                {/* Memories Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold">
                      Memories
                      {total > 0 && (
                        <span className="ml-2 text-muted-foreground font-normal">
                          ({total})
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search memories..."
                          className="w-full rounded-xl border border-border/50 bg-white/[0.04] pl-10 pr-4 py-2.5 text-[13px] placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                        />
                      </div>
                    </form>
                    <FilterBar
                      type={type}
                      status={status}
                      onTypeChange={setType}
                      onStatusChange={setStatus}
                    />
                  </div>

                  {loading && memories.length === 0 ? (
                    <div className="flex h-32 items-center justify-center rounded-xl border border-border/30 bg-dracula-current">
                      <Loader2 className="h-6 w-6 animate-spin text-foreground/50" />
                    </div>
                  ) : memories.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-border/30 bg-dracula-current">
                      <FolderGit2 className="h-8 w-8 text-foreground/20" />
                      <p className="text-[13px] text-muted-foreground">No memories found</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {memories.map((memory) => (
                        <MemoryCard
                          key={memory.id}
                          id={memory.id}
                          memoryType={memory.memoryType}
                          text={memory.text}
                          tags={memory.tags}
                          status={memory.status}
                          createdAt={memory.createdAt}
                          onClick={() => setSelectedMemory(memory)}
                        />
                      ))}
                      
                      <div ref={sentinelRef} className="h-4" />
                      
                      {loadingMore && (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-foreground/50" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/30 bg-dracula-current overflow-hidden" style={{ height: "600px" }}>
                <MemoryGraph
                  org={org}
                  repo={repo}
                  onMemoryClick={handleGraphMemoryClick}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <MemoryDetailSheet
        memory={selectedMemory}
        onClose={() => setSelectedMemory(null)}
      />
    </AuthGuard>
  );
}

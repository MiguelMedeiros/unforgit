"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/filter-bar";
import { MemoryCard } from "@/components/memory-card";
import { MemoryDetailSheet } from "@/components/memory-detail-sheet";
import { CreateMemoryDialog } from "@/components/create-memory-dialog";
import { ScrollToTop } from "@/components/scroll-to-top";

interface MemoryItem {
  id: string;
  memoryType: string;
  text: string;
  tags: string[];
  status: string;
  source: "local" | "remote";
  visibility?: string;
  createdAt: string;
}

const PAGE_SIZE = 20;

function MemoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") ?? "";
  const initialDetail = searchParams.get("detail") ?? null;

  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const [search, setSearch] = useState(initialSearch);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [source, setSource] = useState("local");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("active");

  const [detailId, setDetailId] = useState<string | null>(initialDetail);
  const [createOpen, setCreateOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);

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
    params.set("source", source);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(currentOffset));
    params.set("sortBy", "createdAt");
    params.set("sortOrder", "desc");

    if (searchQuery) params.set("search", searchQuery);
    if (type !== "all") params.set("types", type);
    if (status !== "all") params.set("status", status);

    try {
      const res = await fetch(`/api/memories?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (reset) {
          setMemories(data.memories);
        } else {
          setMemories((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMemories = data.memories.filter(
              (m: MemoryItem) => !existingIds.has(m.id)
            );
            return [...prev, ...newMemories];
          });
        }
        setTotal(data.total);
        setHasMore(currentOffset + PAGE_SIZE < data.total);
        offsetRef.current = currentOffset + PAGE_SIZE;
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [source, type, status, searchQuery]);

  useEffect(() => {
    loadMemories(true);
  }, [loadMemories]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!sentinel || !scrollContainer || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !loadingMoreRef.current) {
          loadMemories(false);
        }
      },
      {
        root: scrollContainer,
        rootMargin: "400px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMemories]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(search);
  }

  function openDetail(id: string) {
    setDetailId(id);
    const params = new URLSearchParams(window.location.search);
    params.set("detail", id);
    router.replace(`/memories?${params.toString()}`, { scroll: false });
  }

  function closeDetail() {
    setDetailId(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("detail");
    const q = params.toString();
    router.replace(q ? `/memories?${q}` : "/memories", { scroll: false });
  }

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="animate-fade-in space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight">
                Memories
              </h1>
              <p className="text-[13px] text-muted-foreground">
                Browse, search, and manage
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="mr-1 h-3.5 w-3.5" />
              New Memory
            </Button>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSearch} className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                placeholder="Search memories..."
                className="pl-10 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
            <FilterBar
              source={source}
              type={type}
              status={status}
              onSourceChange={setSource}
              onTypeChange={setType}
              onStatusChange={setStatus}
            />
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                <span className="text-[13px] text-muted-foreground">Loading...</span>
              </div>
            </div>
          ) : memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/40 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                <Database className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-[13px] text-muted-foreground">No memories found</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                Create your first memory
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {memories.map((m) => (
                  <MemoryCard
                    key={`${m.source}-${m.id}`}
                    {...m}
                    onClick={() => openDetail(m.id)}
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-px" />

              {/* Loading indicator */}
              {loadingMore && (
                <div className="flex justify-center py-6">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                    <span className="text-[12px] text-muted-foreground">
                      Loading more...
                    </span>
                  </div>
                </div>
              )}

              {/* End of list */}
              {!hasMore && memories.length > 0 && (
                <div className="flex justify-center py-6">
                  <span className="text-[11px] text-muted-foreground/50">
                    {total} {total === 1 ? "memory" : "memories"} total
                  </span>
                </div>
              )}
            </>
          )}

          <MemoryDetailSheet
            memoryId={detailId}
            onClose={closeDetail}
            onAction={() => loadMemories(true)}
            onNavigate={setDetailId}
          />

          <CreateMemoryDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={() => loadMemories(true)}
          />
        </div>
      </div>

      <ScrollToTop scrollContainerRef={scrollContainerRef} />
    </div>
  );
}

export default function MemoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <span className="text-[13px] text-muted-foreground">Loading...</span>
          </div>
        </div>
      }
    >
      <MemoriesContent />
    </Suspense>
  );
}

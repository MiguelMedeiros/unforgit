"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, ChevronLeft, ChevronRight, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/filter-bar";
import { MemoryCard } from "@/components/memory-card";
import { MemoryDetailSheet } from "@/components/memory-detail-sheet";
import { CreateMemoryDialog } from "@/components/create-memory-dialog";

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

  const [search, setSearch] = useState(initialSearch);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [source, setSource] = useState("local");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(0);

  const [detailId, setDetailId] = useState<string | null>(initialDetail);
  const [createOpen, setCreateOpen] = useState(false);

  const loadMemories = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("source", source);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));
    params.set("sortBy", "createdAt");
    params.set("sortOrder", "desc");

    if (searchQuery) params.set("search", searchQuery);
    if (type !== "all") params.set("types", type);
    if (status !== "all") params.set("status", status);

    try {
      const res = await fetch(`/api/memories?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [source, type, status, page, searchQuery]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(search);
    setPage(0);
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="h-full overflow-y-auto">
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
              onSourceChange={(v) => { setSource(v); setPage(0); }}
              onTypeChange={(v) => { setType(v); setPage(0); }}
              onStatusChange={(v) => { setStatus(v); setPage(0); }}
            />
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[12px] text-muted-foreground/60">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                      className="h-7 px-2"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(page + 1)}
                      className="h-7 px-2"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          <MemoryDetailSheet
            memoryId={detailId}
            onClose={closeDetail}
            onAction={loadMemories}
          />

          <CreateMemoryDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={loadMemories}
          />
        </div>
      </div>
    </div>
  );
}

export default function MemoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
            <span className="text-[13px] text-muted-foreground">Loading...</span>
          </div>
        </div>
      }
    >
      <MemoriesContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { History, Calendar } from "lucide-react";
import { TimelineEvent } from "@/components/timeline-event";
import { MemoryDetailSheet } from "@/components/memory-detail-sheet";
import { ScrollToTop } from "@/components/scroll-to-top";

interface Memory {
  id: string;
  memoryType: string;
  text: string;
  tags: string[];
  status: string;
  visibility?: string;
  source: "local" | "remote";
}

interface TimelineEventData {
  id: string;
  type: "created" | "deprecated" | "superseded";
  memory: Memory;
  relatedMemoryId?: string;
  date: string;
}

interface TimelineGroup {
  date: string;
  events: TimelineEventData[];
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialDetail = searchParams.get("detail") ?? null;

  const [groups, setGroups] = useState<TimelineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalMemories, setTotalMemories] = useState(0);

  const [detailId, setDetailId] = useState<string | null>(initialDetail);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const PAGE_SIZE = 50;

  const loadTimeline = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offsetRef.current;
    
    if (reset) {
      setLoading(true);
      offsetRef.current = 0;
    } else {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(currentOffset));
      params.set("source", "local");

      const res = await fetch(`/api/timeline?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (reset) {
          setGroups(data.groups);
        } else {
          setGroups((prev) => {
            const existingDates = new Set(prev.map((g) => g.date));
            const newGroups = [...prev];

            for (const group of data.groups) {
              if (existingDates.has(group.date)) {
                const idx = newGroups.findIndex((g) => g.date === group.date);
                if (idx !== -1) {
                  const existingIds = new Set(
                    newGroups[idx].events.map((e) => e.id)
                  );
                  const newEvents = group.events.filter(
                    (e: TimelineEventData) => !existingIds.has(e.id)
                  );
                  newGroups[idx].events.push(...newEvents);
                }
              } else {
                newGroups.push(group);
              }
            }

            return newGroups.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          });
        }
        setHasMore(data.hasMore);
        setTotalEvents(data.total);
        setTotalMemories(data.totalMemories ?? 0);
        offsetRef.current = currentOffset + PAGE_SIZE;
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadTimeline(true);
  }, [loadTimeline]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!sentinel || !scrollContainer || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !loadingMoreRef.current) {
          loadTimeline(false);
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
  }, [hasMore, loading, loadTimeline]);

  function openDetail(id: string) {
    setDetailId(id);
    const params = new URLSearchParams(window.location.search);
    params.set("detail", id);
    router.replace(`/history?${params.toString()}`, { scroll: false });
  }

  function closeDetail() {
    setDetailId(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("detail");
    const q = params.toString();
    router.replace(q ? `/history?${q}` : "/history", { scroll: false });
  }

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="animate-fade-in space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight">History</h1>
              <p className="text-[13px] text-muted-foreground">
                Timeline of all memory events
              </p>
            </div>
            {!loading && totalEvents > 0 && (
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-[20px] font-semibold">{totalEvents}</p>
                  <p className="text-[11px] text-muted-foreground">events</p>
                </div>
                <div>
                  <p className="text-[20px] font-semibold">{totalMemories}</p>
                  <p className="text-[11px] text-muted-foreground">memories</p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                <span className="text-[13px] text-muted-foreground">
                  Loading timeline...
                </span>
              </div>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/40 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                <History className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-[13px] text-muted-foreground">
                No history yet
              </p>
              <p className="text-[12px] text-muted-foreground/60">
                Create some memories to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {groups.map((group, groupIdx) => (
                <div key={group.date} className="space-y-0">
                  {/* Date header */}
                  <div className="sticky top-0 z-10 mb-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm py-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.06]">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-[13px] font-semibold text-foreground/90">
                      {formatDateHeader(group.date)}
                    </span>
                    <span className="text-[11px] text-muted-foreground/50">
                      {group.events.length} event
                      {group.events.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="pl-1">
                    {group.events.map((event, eventIdx) => {
                      const isLastInGroup = eventIdx === group.events.length - 1;
                      const isLastOverall =
                        groupIdx === groups.length - 1 && isLastInGroup;

                      return (
                        <TimelineEvent
                          key={event.id}
                          type={event.type}
                          memory={event.memory}
                          date={event.date}
                          relatedMemoryId={event.relatedMemoryId}
                          onClick={() => openDetail(event.memory.id)}
                          isLast={isLastOverall && !hasMore}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}

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

              {/* End of timeline */}
              {!hasMore && groups.length > 0 && (
                <div className="flex justify-center py-8">
                  <span className="text-[11px] text-muted-foreground/50">
                    End of timeline
                  </span>
                </div>
              )}
            </div>
          )}

          <MemoryDetailSheet
            memoryId={detailId}
            onClose={closeDetail}
            onAction={() => loadTimeline(true)}
            onNavigate={setDetailId}
          />
        </div>
      </div>

      <ScrollToTop scrollContainerRef={scrollContainerRef} />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <span className="text-[13px] text-muted-foreground">
              Loading...
            </span>
          </div>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}

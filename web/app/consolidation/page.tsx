"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  History,
  Undo2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Memory {
  id: string;
  memoryType: string;
  text: string;
  tags: string[];
  createdAt: string;
}

interface ConsolidationCandidate {
  memories: Memory[];
  reason: string;
  suggestedTags: string[];
  averageScore: number;
}

interface CandidatesResponse {
  candidates: ConsolidationCandidate[];
  totalMemoriesScanned: number;
  totalCandidateGroups: number;
}

interface ConsolidationHistoryItem {
  id: string;
  text: string;
  memoryType: string;
  tags: string[];
  status: string;
  consolidationVersion: number;
  createdAt: string;
  sourceCount: number;
  sourceIds: string[];
}

type ConsolidationStatus = "idle" | "loading" | "success" | "error";

const PAGE_SIZE = 10;

export default function ConsolidationPage() {
  const [activeTab, setActiveTab] = useState("suggestions");

  const [candidates, setCandidates] = useState<ConsolidationCandidate[]>([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [threshold, setThreshold] = useState("0.6");
  const [offset, setOffset] = useState(0);
  const loaderRef = useRef<HTMLDivElement>(null);

  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [consolidatingGroups, setConsolidatingGroups] = useState<Map<number, ConsolidationStatus>>(
    new Map()
  );
  const [consolidatedResults, setConsolidatedResults] = useState<
    Map<number, { id: string; text: string }>
  >(new Map());
  const [consolidatingAll, setConsolidatingAll] = useState(false);

  const [historyItems, setHistoryItems] = useState<ConsolidationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [revertingIds, setRevertingIds] = useState<Set<string>>(new Set());

  const hasMore = candidates.length < totalGroups;

  const loadCandidates = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("threshold", threshold);
      params.set("maxGroups", String(PAGE_SIZE));
      params.set("offset", String(reset ? 0 : offset));

      const res = await fetch(`/api/consolidation/candidates?${params.toString()}`);
      if (res.ok) {
        const data: CandidatesResponse = await res.json();
        if (reset) {
          setCandidates(data.candidates);
          setExpandedGroups(new Set());
          setConsolidatingGroups(new Map());
          setConsolidatedResults(new Map());
        } else {
          setCandidates((prev) => [...prev, ...data.candidates]);
        }
        setTotalScanned(data.totalMemoriesScanned);
        setTotalGroups(data.totalCandidateGroups);
        if (!reset) {
          setOffset((prev) => prev + data.candidates.length);
        } else {
          setOffset(data.candidates.length);
        }
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [threshold, offset]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/consolidation/history?limit=50&includeDeleted=false");
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.consolidations);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "suggestions") {
      loadCandidates(true);
    } else {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, threshold]);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader || activeTab !== "suggestions") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadCandidates(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadCandidates, activeTab]);

  const toggleExpanded = (index: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleHistoryExpanded = (id: string) => {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const consolidateGroup = async (index: number, candidate: ConsolidationCandidate) => {
    setConsolidatingGroups((prev) => new Map(prev).set(index, "loading"));

    try {
      const res = await fetch("/api/consolidation/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceIds: candidate.memories.map((m) => m.id),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConsolidatingGroups((prev) => new Map(prev).set(index, "success"));
        setConsolidatedResults((prev) =>
          new Map(prev).set(index, { id: data.consolidatedId, text: data.generatedText })
        );
        toast.success("Consolidation complete", {
          description: `Created memory ${data.consolidatedId.slice(0, 8)}`,
        });
      } else {
        const error = await res.json();
        setConsolidatingGroups((prev) => new Map(prev).set(index, "error"));
        toast.error("Consolidation failed", {
          description: error.error || "Unknown error",
        });
      }
    } catch {
      setConsolidatingGroups((prev) => new Map(prev).set(index, "error"));
      toast.error("Consolidation failed", {
        description: "Network error",
      });
    }
  };

  const consolidateAll = async () => {
    const pendingGroups = candidates
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ index }) => {
        const status = consolidatingGroups.get(index);
        return status !== "success" && status !== "loading";
      });

    if (pendingGroups.length === 0) {
      toast.info("No groups to consolidate", {
        description: "All groups have already been processed",
      });
      return;
    }

    setConsolidatingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const { candidate, index } of pendingGroups) {
      setConsolidatingGroups((prev) => new Map(prev).set(index, "loading"));

      try {
        const res = await fetch("/api/consolidation/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceIds: candidate.memories.map((m) => m.id),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setConsolidatingGroups((prev) => new Map(prev).set(index, "success"));
          setConsolidatedResults((prev) =>
            new Map(prev).set(index, { id: data.consolidatedId, text: data.generatedText })
          );
          successCount++;
        } else {
          setConsolidatingGroups((prev) => new Map(prev).set(index, "error"));
          errorCount++;
        }
      } catch {
        setConsolidatingGroups((prev) => new Map(prev).set(index, "error"));
        errorCount++;
      }
    }

    setConsolidatingAll(false);

    if (errorCount === 0) {
      toast.success("All consolidations complete", {
        description: `Successfully consolidated ${successCount} groups`,
      });
    } else {
      toast.warning("Consolidation finished with errors", {
        description: `${successCount} succeeded, ${errorCount} failed`,
      });
    }
  };

  const revertConsolidation = async (id: string) => {
    setRevertingIds((prev) => new Set(prev).add(id));

    try {
      const res = await fetch("/api/consolidation/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consolidationId: id }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Consolidation reverted", {
          description: `Restored ${data.restoredIds?.length || 0} memories`,
        });
        loadHistory();
      } else {
        const error = await res.json();
        toast.error("Revert failed", {
          description: error.error || "Unknown error",
        });
      }
    } catch {
      toast.error("Revert failed", {
        description: "Network error",
      });
    } finally {
      setRevertingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "episodic":
        return "bg-dracula-purple/20 text-dracula-purple border-dracula-purple/30";
      case "semantic":
        return "bg-dracula-cyan/20 text-dracula-cyan border-dracula-cyan/30";
      case "procedural":
        return "bg-dracula-green/20 text-dracula-green border-dracula-green/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Consolidation</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Merge similar memories and manage consolidation history
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="suggestions" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
              {historyItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                  {historyItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="mt-0">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">Threshold:</span>
                <Select value={threshold} onValueChange={setThreshold}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.3">0.3</SelectItem>
                    <SelectItem value="0.4">0.4</SelectItem>
                    <SelectItem value="0.5">0.5</SelectItem>
                    <SelectItem value="0.6">0.6</SelectItem>
                    <SelectItem value="0.7">0.7</SelectItem>
                    <SelectItem value="0.8">0.8</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadCandidates(true)}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <div className="ml-auto flex items-center gap-4 text-[13px] text-muted-foreground">
                <span>Scanned: {totalScanned} memories</span>
                <span>
                  Showing: {candidates.length}
                  {totalGroups > candidates.length && ` of ${totalGroups}`} groups
                </span>
              </div>
              {candidates.length > 0 && (
                <Button
                  size="sm"
                  onClick={consolidateAll}
                  disabled={consolidatingAll || loading}
                  className="gap-2 bg-dracula-purple hover:bg-dracula-purple/80"
                >
                  {consolidatingAll ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Consolidate All
                    </>
                  )}
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-dracula-purple border-t-transparent" />
                  <span className="text-[13px] text-muted-foreground">Scanning memories...</span>
                </div>
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/40 py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                  <Layers className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-[13px] text-muted-foreground">No consolidation candidates found</p>
                <p className="text-[12px] text-muted-foreground/60">
                  Try lowering the threshold to find more similar memories
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {candidates.map((candidate, index) => {
                  const isExpanded = expandedGroups.has(index);
                  const status = consolidatingGroups.get(index) ?? "idle";
                  const result = consolidatedResults.get(index);
                  const groupKey = candidate.memories.map((m) => m.id).join("-");

                  return (
                    <Card
                      key={groupKey}
                      className={`transition-all ${
                        status === "success"
                          ? "border-dracula-green/50 bg-dracula-green/5"
                          : status === "error"
                            ? "border-dracula-red/50 bg-dracula-red/5"
                            : ""
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2 text-base font-medium">
                              <Layers className="h-4 w-4 text-dracula-purple" />
                              Group {index + 1}
                              <Badge variant="outline" className="ml-2 text-[11px]">
                                {candidate.memories.length} memories
                              </Badge>
                              <Badge variant="outline" className="text-[11px]">
                                {(candidate.averageScore * 100).toFixed(0)}% similar
                              </Badge>
                            </CardTitle>
                            <p className="mt-1 text-[13px] text-muted-foreground">
                              {candidate.reason}
                            </p>
                            {candidate.suggestedTags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {candidate.suggestedTags.slice(0, 8).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {candidate.suggestedTags.length > 8 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    +{candidate.suggestedTags.length - 8}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {status === "idle" && (
                              <Button
                                size="sm"
                                onClick={() => consolidateGroup(index, candidate)}
                                className="gap-2 bg-dracula-purple hover:bg-dracula-purple/80"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                Consolidate
                              </Button>
                            )}
                            {status === "loading" && (
                              <Button size="sm" disabled className="gap-2">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Processing...
                              </Button>
                            )}
                            {status === "success" && (
                              <Button size="sm" variant="outline" disabled className="gap-2 text-dracula-green border-dracula-green/50">
                                <Check className="h-3.5 w-3.5" />
                                Done
                              </Button>
                            )}
                            {status === "error" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => consolidateGroup(index, candidate)}
                                className="gap-2 text-dracula-red border-dracula-red/50"
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                                Retry
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleExpanded(index)}
                              className="h-8 w-8 p-0"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="pt-0">
                          <div className="space-y-3 border-t border-border/40 pt-4">
                            {result && (
                              <div className="mb-4 rounded-lg border border-dracula-green/30 bg-dracula-green/10 p-4">
                                <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-dracula-green">
                                  <Check className="h-3.5 w-3.5" />
                                  Consolidated Memory ({result.id.slice(0, 8)})
                                </div>
                                <p className="text-[13px] text-foreground/90">{result.text}</p>
                              </div>
                            )}
                            <div className="text-[12px] font-medium text-muted-foreground mb-2">
                              Source Memories:
                            </div>
                            {candidate.memories.map((memory) => (
                              <div
                                key={memory.id}
                                className="rounded-lg border border-border/40 bg-white/[0.02] p-3"
                              >
                                <div className="flex items-start gap-2">
                                  <Badge className={`shrink-0 text-[10px] ${getTypeColor(memory.memoryType)}`}>
                                    {memory.memoryType}
                                  </Badge>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-foreground/90 leading-relaxed">
                                      {memory.text.length > 200
                                        ? memory.text.slice(0, 200) + "..."
                                        : memory.text}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                                      <span className="font-mono">{memory.id.slice(0, 8)}</span>
                                      <span>•</span>
                                      <span>
                                        {new Date(memory.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}

                {hasMore && (
                  <div
                    ref={loaderRef}
                    className="flex items-center justify-center py-8"
                  >
                    {loadingMore && (
                      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading more groups...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <div className="mb-6 flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadHistory}
                disabled={historyLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${historyLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <div className="ml-auto text-[13px] text-muted-foreground">
                {historyItems.length} consolidations
              </div>
            </div>

            {historyLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-dracula-cyan border-t-transparent" />
                  <span className="text-[13px] text-muted-foreground">Loading history...</span>
                </div>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/40 py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                  <History className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-[13px] text-muted-foreground">No consolidations yet</p>
                <p className="text-[12px] text-muted-foreground/60">
                  Go to Suggestions tab to consolidate similar memories
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyItems.map((item) => {
                  const isExpanded = expandedHistory.has(item.id);
                  const isReverting = revertingIds.has(item.id);

                  return (
                    <Card key={item.id} className="transition-all hover:border-border/60">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-dracula-cyan/20 text-dracula-cyan border-0 gap-1">
                                <Layers className="h-3 w-3" />
                                v{item.consolidationVersion}
                              </Badge>
                              <Badge className={`text-[10px] ${getTypeColor(item.memoryType)}`}>
                                {item.memoryType}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {item.sourceCount} sources
                              </Badge>
                            </div>
                            <p className="text-[13px] text-foreground/90 leading-relaxed line-clamp-2">
                              {item.text}
                            </p>
                            <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="font-mono">{item.id.slice(0, 8)}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(item.createdAt)}
                              </span>
                              {item.tags.length > 0 && (
                                <span className="flex items-center gap-1">
                                  {item.tags.slice(0, 3).join(", ")}
                                  {item.tags.length > 3 && ` +${item.tags.length - 3}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isReverting}
                                  className="gap-2 border-dracula-orange/30 text-dracula-orange hover:bg-dracula-orange/10"
                                >
                                  {isReverting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Undo2 className="h-3.5 w-3.5" />
                                  )}
                                  Revert
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Revert Consolidation</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will restore {item.sourceCount} original memories to active status
                                    and delete this consolidated memory.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-4 space-y-2">
                                  <p className="text-[13px] text-foreground/80">
                                    The following will happen:
                                  </p>
                                  <ul className="text-[13px] text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Original {item.sourceCount} memories will be restored</li>
                                    <li>This consolidated memory will be soft-deleted</li>
                                    <li>You can restore this consolidation later if needed</li>
                                  </ul>
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => revertConsolidation(item.id)}
                                    className="bg-dracula-orange hover:bg-dracula-orange/80"
                                  >
                                    <Undo2 className="mr-1 h-3.5 w-3.5" />
                                    Revert
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleHistoryExpanded(item.id)}
                              className="h-8 w-8 p-0"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="pt-0">
                          <div className="border-t border-border/40 pt-4">
                            <div className="rounded-lg bg-white/[0.02] p-4">
                              <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                {item.text}
                              </p>
                            </div>
                            {item.sourceIds.length > 0 && (
                              <div className="mt-4">
                                <div className="text-[12px] font-medium text-muted-foreground mb-2">
                                  Source Memory IDs:
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.sourceIds.map((id) => (
                                    <span
                                      key={id}
                                      className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-mono text-muted-foreground"
                                    >
                                      {id.slice(0, 8)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

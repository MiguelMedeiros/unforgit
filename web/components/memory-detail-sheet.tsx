"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HardDrive,
  Cloud,
  Archive,
  ArrowUpRight,
  Copy,
  Check,
  Link2,
} from "lucide-react";

interface MemoryDetail {
  id: string;
  orgId: string;
  repoId: string;
  memoryType: string;
  visibility: string;
  status: string;
  text: string;
  summary?: string;
  tags: string[];
  sourceRefs?: Record<string, unknown>;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

interface LinkedMemoryItem {
  memory: {
    id: string;
    memoryType: string;
    text: string;
    status: string;
  };
  link: {
    id: string;
    sourceId: string;
    targetId: string;
    linkType: string;
  };
}

interface MemoryDetailSheetProps {
  memoryId: string | null;
  onClose: () => void;
  onAction: () => void;
  onNavigate?: (id: string) => void;
}

const typeConfig: Record<string, { bg: string; text: string }> = {
  episodic: { bg: "bg-apple-orange/10", text: "text-apple-orange" },
  semantic: { bg: "bg-apple-purple/10", text: "text-apple-purple" },
  procedural: { bg: "bg-apple-green/10", text: "text-apple-green" },
};

const linkTypeConfig: Record<string, { bg: string; text: string }> = {
  related_to: { bg: "bg-apple-purple/10", text: "text-apple-purple" },
  derived_from: { bg: "bg-apple-cyan/10", text: "text-apple-cyan" },
  contradicts: { bg: "bg-apple-red/10", text: "text-apple-red" },
  depends_on: { bg: "bg-apple-orange/10", text: "text-apple-orange" },
};

export function MemoryDetailSheet({
  memoryId,
  onClose,
  onAction,
  onNavigate,
}: MemoryDetailSheetProps) {
  const [memory, setMemory] = useState<MemoryDetail | null>(null);
  const [source, setSource] = useState<"local" | "remote">("local");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkedMemories, setLinkedMemories] = useState<LinkedMemoryItem[]>([]);

  useEffect(() => {
    if (!memoryId) {
      setMemory(null);
      setLinkedMemories([]);
      return;
    }

    setLoading(true);
    fetch(`/api/memories/${memoryId}`)
      .then((r) => r.json())
      .then((data) => {
        setMemory(data.memory);
        setSource(data.source);
      })
      .finally(() => setLoading(false));

    fetch(`/api/memories/${memoryId}/links`)
      .then((r) => r.json())
      .then((data) => {
        setLinkedMemories(data.linked ?? []);
      })
      .catch(() => setLinkedMemories([]));
  }, [memoryId]);

  async function handleDeprecate() {
    if (!memory) return;
    await fetch(`/api/memories/${memory.id}/deprecate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
    onAction();
    onClose();
  }

  async function handlePromote() {
    if (!memory || source !== "local") return;
    await fetch(`/api/memories/${memory.id}/promote`, {
      method: "POST",
    });
    onAction();
    onClose();
  }

  function handleCopyId() {
    if (!memory) return;
    navigator.clipboard.writeText(memory.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Dialog open={!!memoryId} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {loading && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
          </div>
        )}
        {memory && !loading && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-[17px]">
                Memory Detail
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.06]">
                  {source === "local" ? (
                    <HardDrive className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Cloud className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </DialogTitle>
              <DialogDescription>
                <button
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] transition-colors hover:text-foreground"
                >
                  {memory.id.slice(0, 12)}...
                  {copied ? (
                    <Check className="h-3 w-3 text-apple-green" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const tc = typeConfig[memory.memoryType] ?? { bg: "bg-white/5", text: "text-muted-foreground" };
                  return (
                    <Badge className={`${tc.bg} ${tc.text} border-0`} variant="secondary">
                      {memory.memoryType}
                    </Badge>
                  );
                })()}
                <Badge variant="outline">{memory.status}</Badge>
                <Badge variant="outline">{memory.visibility}</Badge>
              </div>

              {/* Text */}
              <div className="rounded-xl bg-white/[0.03] p-4">
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                  {memory.text}
                </p>
              </div>

              {memory.summary && (
                <div>
                  <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Summary
                  </h4>
                  <p className="text-[13px] text-foreground/80">{memory.summary}</p>
                </div>
              )}

              {memory.tags.length > 0 && (
                <div>
                  <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {memory.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {memory.confidence !== undefined && (
                <div>
                  <h4 className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Confidence
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-white/[0.06]">
                      <div
                        className="h-1.5 rounded-full bg-apple-blue"
                        style={{ width: `${memory.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-[12px] text-muted-foreground">
                      {(memory.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {memory.sourceRefs &&
                Object.keys(memory.sourceRefs).length > 0 && (
                  <div>
                    <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      Source References
                    </h4>
                    <pre className="rounded-xl bg-white/[0.03] p-3 text-[11px] overflow-x-auto font-mono text-muted-foreground">
                      {JSON.stringify(memory.sourceRefs, null, 2)}
                    </pre>
                  </div>
                )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-white/[0.02] p-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Created</span>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{formatDate(memory.createdAt)}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Updated</span>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{formatDate(memory.updatedAt)}</p>
                </div>
              </div>

              {/* Linked memories */}
              {linkedMemories.length > 0 && (
                <div>
                  <h4 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    <Link2 className="h-3 w-3" />
                    Linked Memories ({linkedMemories.length})
                  </h4>
                  <div className="space-y-1.5">
                    {linkedMemories.map(({ memory: linked, link }) => {
                      const direction =
                        link.sourceId === memory.id ? "\u2192" : "\u2190";
                      const ltc = linkTypeConfig[link.linkType] ?? { bg: "bg-white/5", text: "text-muted-foreground" };
                      const tc = typeConfig[linked.memoryType] ?? { bg: "bg-white/5", text: "text-muted-foreground" };
                      return (
                        <button
                          key={link.id}
                          onClick={() => onNavigate?.(linked.id)}
                          className="w-full rounded-xl border border-border/20 bg-white/[0.02] p-3 text-left transition-all hover:bg-white/[0.05] hover:border-border/40"
                        >
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <Badge
                              className={`${ltc.bg} ${ltc.text} border-0`}
                              variant="secondary"
                            >
                              {direction} {link.linkType.replace(/_/g, " ")}
                            </Badge>
                            <Badge
                              className={`${tc.bg} ${tc.text} border-0`}
                              variant="secondary"
                            >
                              {linked.memoryType}
                            </Badge>
                          </div>
                          <p className="line-clamp-2 text-[12px] leading-relaxed text-foreground/70">
                            {linked.text}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                {memory.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeprecate}
                  >
                    <Archive className="mr-1 h-3.5 w-3.5" />
                    Deprecate
                  </Button>
                )}
                {source === "local" && memory.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePromote}
                  >
                    <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                    Promote to Remote
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

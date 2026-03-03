"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  CloudCheck,
  Archive,
  ArrowUpRight,
  Copy,
  Check,
  Link2,
  ExternalLink,
  GitPullRequest,
  GitCommit,
  FileText,
  Bug,
  User,
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
  authorId?: string;
  authorName?: string;
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
  episodic: { bg: "bg-dracula-orange/10", text: "text-dracula-orange" },
  semantic: { bg: "bg-dracula-purple/10", text: "text-dracula-purple" },
  procedural: { bg: "bg-dracula-green/10", text: "text-dracula-green" },
};

const linkTypeConfig: Record<string, { bg: string; text: string }> = {
  related_to: { bg: "bg-dracula-purple/10", text: "text-dracula-purple" },
  derived_from: { bg: "bg-dracula-cyan/10", text: "text-dracula-cyan" },
  contradicts: { bg: "bg-dracula-red/10", text: "text-dracula-red" },
  depends_on: { bg: "bg-dracula-orange/10", text: "text-dracula-orange" },
};


const sourceRefIcons: Record<string, React.ReactNode> = {
  pr_url: <GitPullRequest className="h-3.5 w-3.5" />,
  pull_request: <GitPullRequest className="h-3.5 w-3.5" />,
  issue_url: <Bug className="h-3.5 w-3.5" />,
  issue: <Bug className="h-3.5 w-3.5" />,
  commit: <GitCommit className="h-3.5 w-3.5" />,
  commit_sha: <GitCommit className="h-3.5 w-3.5" />,
  file: <FileText className="h-3.5 w-3.5" />,
  file_path: <FileText className="h-3.5 w-3.5" />,
};

const sourceRefLabels: Record<string, string> = {
  pr_url: "Pull Request",
  pull_request: "Pull Request",
  issue_url: "Issue",
  issue: "Issue",
  commit: "Commit",
  commit_sha: "Commit",
  file: "File",
  file_path: "File Path",
  branch: "Branch",
  repo: "Repository",
  author: "Author",
};

function isUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return value.startsWith("http://") || value.startsWith("https://");
}

function formatRefLabel(key: string): string {
  return sourceRefLabels[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractLinkDisplay(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "github.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 4 && parts[2] === "pull") {
        return `#${parts[3]}`;
      }
      if (parts.length >= 4 && parts[2] === "issues") {
        return `#${parts[3]}`;
      }
      if (parts.length >= 4 && parts[2] === "commit") {
        return parts[3].slice(0, 7);
      }
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
    }
    return u.hostname + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url;
  }
}

function SourceRefItem({ refKey, value }: { refKey: string; value: unknown }) {
  const icon = sourceRefIcons[refKey] ?? <ExternalLink className="h-3.5 w-3.5" />;
  const label = formatRefLabel(refKey);

  if (isUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] transition-colors hover:bg-white/[0.06] group"
      >
        <span className="text-dracula-cyan">{icon}</span>
        <span className="text-muted-foreground">{label}:</span>
        <span className="text-foreground/80 group-hover:text-dracula-cyan transition-colors truncate">
          {extractLinkDisplay(value)}
        </span>
        <ExternalLink className="h-3 w-3 text-muted-foreground/50 ml-auto shrink-0" />
      </a>
    );
  }

  const displayValue = typeof value === "object" ? JSON.stringify(value) : String(value);

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2 text-[12px]">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground/80 truncate font-mono">{displayValue}</span>
    </div>
  );
}

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
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        if (data.memory) {
          setMemory(data.memory);
          setSource(data.source ?? "local");
        } else {
          setMemory(null);
        }
      })
      .catch(() => setMemory(null))
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
    const res = await fetch(`/api/memories/${memory.id}/deprecate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
    if (res.ok) {
      toast.success("Memory deprecated");
    } else {
      toast.error("Failed to deprecate memory");
    }
    onAction();
    onClose();
  }

  async function handlePromote(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!memory || source !== "local") return;
    try {
      const res = await fetch(`/api/memories/${memory.id}/promote`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data.error || `Failed to promote (${res.status})`;
        toast.error(errorMsg);
        return;
      }
      toast.success("Memory synced to remote");
      onAction();
      onClose();
    } catch {
      toast.error("Could not connect to server");
    }
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
          <>
            <DialogTitle className="sr-only">Loading memory details</DialogTitle>
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-dracula-purple border-t-transparent" />
            </div>
          </>
        )}
        {!memory && !loading && (
          <>
            <DialogTitle className="sr-only">Memory not found</DialogTitle>
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <p className="text-sm text-muted-foreground">Memory not found</p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
        {memory && !loading && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-[17px]">
                Memory Detail
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.06]" title={
                  source === "remote" 
                    ? "Remote" 
                    : memory.visibility === "repo" 
                      ? "Local (synced to remote)" 
                      : "Local only"
                }>
                  {source === "remote" ? (
                    <Cloud className="h-3 w-3 text-muted-foreground" />
                  ) : memory.visibility === "repo" ? (
                    <CloudCheck className="h-3 w-3 text-dracula-green" />
                  ) : (
                    <HardDrive className="h-3 w-3 text-muted-foreground" />
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
                    <Check className="h-3 w-3 text-dracula-green" />
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
                        className="h-1.5 rounded-full bg-dracula-purple"
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
                    <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      Source References
                    </h4>
                    <div className="space-y-1.5">
                      {Object.entries(memory.sourceRefs).map(([key, value]) => (
                        <SourceRefItem key={key} refKey={key} value={value} />
                      ))}
                    </div>
                  </div>
                )}

              {/* Author & Dates */}
              <div className="rounded-xl bg-white/[0.02] p-3 space-y-3">
                {(memory.authorName || memory.authorId) && (
                  <div className="flex items-center gap-2.5 pb-3 border-b border-border/10">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-dracula-purple/10">
                      <User className="h-3.5 w-3.5 text-dracula-purple" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground/90 truncate">
                        {memory.authorName || "Unknown"}
                      </p>
                      {memory.authorId && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {memory.authorId}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Created</span>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{formatDate(memory.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Updated</span>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{formatDate(memory.updatedAt)}</p>
                  </div>
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
                          className="group w-full rounded-xl border border-border/20 bg-white/[0.02] p-3 text-left transition-all hover:bg-white/[0.05] hover:border-dracula-purple/40 cursor-pointer"
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
                            <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/30 transition-all group-hover:text-dracula-purple group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </div>
                          <p className="line-clamp-2 text-[12px] leading-relaxed text-foreground/70 group-hover:text-foreground/90 transition-colors">
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
                {source === "local" && memory.status === "active" && memory.visibility !== "repo" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePromote}
                  >
                    <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                    Promote to Remote
                  </Button>
                )}
                {source === "local" && memory.visibility === "repo" && (
                  <div className="flex items-center gap-1.5 text-[12px] text-dracula-green">
                    <CloudCheck className="h-3.5 w-3.5" />
                    Synced to remote
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

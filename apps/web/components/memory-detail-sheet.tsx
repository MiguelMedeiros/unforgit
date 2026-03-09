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
  Trash2,
  RotateCcw,
  AlertTriangle,
  Undo2,
  Layers,
} from "lucide-react";
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
  version?: number;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
  isConsolidation?: boolean;
  consolidationVersion?: number;
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
  consolidated_from: <Link2 className="h-3.5 w-3.5" />,
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
  consolidated_from: "Consolidated From",
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

function isUuidArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return value.length > 0 && value.every((item) => typeof item === "string" && uuidRegex.test(item));
}

function truncateUuid(uuid: string): string {
  return uuid.slice(0, 8);
}

function SourceRefItem({
  refKey,
  value,
  onNavigate,
}: {
  refKey: string;
  value: unknown;
  onNavigate?: (id: string) => void;
}) {
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

  if (isUuidArray(value)) {
    return (
      <div className="rounded-lg bg-white/[0.03] px-3 py-2.5 text-[12px]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-dracula-cyan shrink-0">{icon}</span>
          <span className="text-muted-foreground shrink-0">{label}</span>
          <span className="text-muted-foreground/50 text-[11px]">({value.length})</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {value.map((uuid) => (
            <button
              key={uuid}
              onClick={() => onNavigate?.(uuid)}
              className="inline-flex items-center gap-1 rounded-md bg-dracula-purple/10 px-2 py-1 text-[11px] font-mono text-dracula-purple hover:bg-dracula-purple/20 transition-colors cursor-pointer"
              title={uuid}
            >
              <span>{truncateUuid(uuid)}</span>
              <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const displayValue = typeof value === "object" ? JSON.stringify(value) : String(value);

  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] overflow-hidden">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span className="text-muted-foreground shrink-0">{label}:</span>
      </div>
      <p className="text-foreground/80 font-mono text-[11px] break-all">{displayValue}</p>
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

  async function handleDelete(hardDelete: boolean = false) {
    if (!memory) return;
    try {
      const res = await fetch(`/api/memories/${memory.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hardDelete }),
      });
      if (res.ok) {
        toast.success(hardDelete ? "Memory permanently deleted" : "Memory deleted (can be restored)");
        onAction();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete memory");
      }
    } catch {
      toast.error("Could not connect to server");
    }
  }

  async function handleRestore() {
    if (!memory) return;
    try {
      const res = await fetch(`/api/memories/${memory.id}/restore`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Memory restored");
        onAction();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to restore memory");
      }
    } catch {
      toast.error("Could not connect to server");
    }
  }

  async function handleUnconsolidate() {
    if (!memory) return;
    try {
      const res = await fetch("/api/consolidation/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consolidationId: memory.id }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Unconsolidation complete`, {
          description: `Restored ${data.restoredIds?.length || 0} memories`,
        });
        onAction();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to revert consolidation");
      }
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg overflow-x-hidden">
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

            <div className="space-y-5 overflow-hidden">
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
                {memory.isConsolidation && (
                  <Badge className="bg-dracula-cyan/10 text-dracula-cyan border-0 gap-1" variant="secondary">
                    <Layers className="h-3 w-3" />
                    Consolidated v{memory.consolidationVersion ?? 1}
                  </Badge>
                )}
              </div>

              {/* Text */}
              <div className="rounded-xl bg-white/[0.03] p-4 overflow-hidden">
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed break-words">
                  {memory.text}
                </p>
              </div>

              {memory.summary && (
                <div className="overflow-hidden">
                  <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Summary
                  </h4>
                  <p className="text-[13px] text-foreground/80 break-words">{memory.summary}</p>
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
                        <SourceRefItem key={key} refKey={key} value={value} onNavigate={onNavigate} />
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

              {/* Deleted banner */}
              {memory.status === "deleted" && (
                <div className="flex items-center gap-3 rounded-xl bg-dracula-red/10 border border-dracula-red/20 p-3">
                  <AlertTriangle className="h-4 w-4 text-dracula-red shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-dracula-red">This memory has been deleted</p>
                    {memory.deletedAt && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Deleted {formatDate(memory.deletedAt)}
                        {memory.deletedBy && ` by ${memory.deletedBy}`}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRestore}
                    className="shrink-0 border-dracula-green/30 text-dracula-green hover:bg-dracula-green/10"
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Restore
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                {memory.status === "active" && (
                  <>
                    {memory.isConsolidation && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-dracula-cyan/30 text-dracula-cyan hover:bg-dracula-cyan/10"
                          >
                            <Undo2 className="mr-1 h-3.5 w-3.5" />
                            Revert Consolidation
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revert Consolidation</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will restore the original memories to active status and soft-delete this consolidated memory.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-4 space-y-2">
                            <p className="text-[13px] text-foreground/80">
                              The following will happen:
                            </p>
                            <ul className="text-[13px] text-muted-foreground space-y-1 list-disc list-inside">
                              <li>Original memories will be restored to &quot;active&quot; status</li>
                              <li>This consolidated memory will be soft-deleted</li>
                              <li>You can restore this consolidation later if needed</li>
                            </ul>
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleUnconsolidate}
                              className="bg-dracula-cyan hover:bg-dracula-cyan/80"
                            >
                              <Undo2 className="mr-1 h-3.5 w-3.5" />
                              Revert
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeprecate}
                    >
                      <Archive className="mr-1 h-3.5 w-3.5" />
                      Deprecate
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-dracula-red/30 text-dracula-red hover:bg-dracula-red/10"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Memory</AlertDialogTitle>
                          <AlertDialogDescription>
                            Choose how to delete this memory:
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-3 py-4">
                          <button
                            onClick={() => handleDelete(false)}
                            className="w-full rounded-lg border border-border/30 p-4 text-left transition-colors hover:bg-white/[0.03] hover:border-dracula-orange/30"
                          >
                            <div className="flex items-center gap-2 text-[14px] font-medium">
                              <Trash2 className="h-4 w-4 text-dracula-orange" />
                              Soft Delete
                            </div>
                            <p className="mt-1 text-[12px] text-muted-foreground">
                              Memory can be restored later. Creates a tombstone for sync.
                            </p>
                          </button>
                          <button
                            onClick={() => handleDelete(true)}
                            className="w-full rounded-lg border border-border/30 p-4 text-left transition-colors hover:bg-white/[0.03] hover:border-dracula-red/30"
                          >
                            <div className="flex items-center gap-2 text-[14px] font-medium">
                              <AlertTriangle className="h-4 w-4 text-dracula-red" />
                              Hard Delete
                            </div>
                            <p className="mt-1 text-[12px] text-muted-foreground">
                              Permanently remove. Cannot be restored.
                            </p>
                          </button>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
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

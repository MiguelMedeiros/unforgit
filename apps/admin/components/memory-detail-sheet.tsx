"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  ExternalLink,
  GitPullRequest,
  GitCommit,
  FileText,
  Bug,
  User,
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
  authorId?: string;
  authorName?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

interface MemoryDetailSheetProps {
  memory: MemoryDetail | null;
  onClose: () => void;
}

const typeConfig: Record<string, { bg: string; text: string }> = {
  episodic: { bg: "bg-white/[0.06]", text: "text-muted-foreground" },
  semantic: { bg: "bg-white/[0.06]", text: "text-muted-foreground" },
  procedural: { bg: "bg-white/[0.06]", text: "text-muted-foreground" },
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
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-muted-foreground">{label}:</span>
        <span className="text-foreground/80 group-hover:text-foreground transition-colors truncate">
          {extractLinkDisplay(value)}
        </span>
        <ExternalLink className="h-3 w-3 text-muted-foreground/50 ml-auto shrink-0" />
      </a>
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

export function MemoryDetailSheet({ memory, onClose }: MemoryDetailSheetProps) {
  const [copied, setCopied] = useState(false);

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
    <Dialog open={!!memory} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg overflow-x-hidden">
        {!memory && (
          <>
            <DialogTitle className="sr-only">Memory not found</DialogTitle>
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <p className="text-sm text-muted-foreground">Memory not found</p>
            </div>
          </>
        )}
        {memory && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-[17px]">
                Memory Detail
              </DialogTitle>
              <DialogDescription>
                <button
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] transition-colors hover:text-foreground"
                >
                  {memory.id.slice(0, 12)}...
                  {copied ? (
                    <Check className="h-3 w-3 text-foreground" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 overflow-hidden">
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
                        className="h-1.5 rounded-full bg-foreground"
                        style={{ width: `${memory.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-[12px] text-muted-foreground">
                      {(memory.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {memory.sourceRefs && Object.keys(memory.sourceRefs).length > 0 && (
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

              <div className="rounded-xl bg-white/[0.02] p-3 space-y-3">
                {(memory.authorName || memory.authorId) && (
                  <div className="flex items-center gap-2.5 pb-3 border-b border-border/10">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
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
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

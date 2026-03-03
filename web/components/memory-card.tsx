"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { HardDrive, Cloud, CloudCheck, Copy, Check } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";

interface MemoryCardProps {
  id: string;
  memoryType: string;
  text: string;
  tags: string[];
  status: string;
  source: "local" | "remote";
  visibility?: string;
  createdAt: string;
  onClick?: () => void;
}

const typeConfig: Record<string, { bg: string; text: string; dot: string }> = {
  episodic: {
    bg: "bg-apple-orange/10",
    text: "text-apple-orange",
    dot: "bg-apple-orange",
  },
  semantic: {
    bg: "bg-apple-purple/10",
    text: "text-apple-purple",
    dot: "bg-apple-purple",
  },
  procedural: {
    bg: "bg-apple-green/10",
    text: "text-apple-green",
    dot: "bg-apple-green",
  },
};

const statusConfig: Record<string, { dot: string }> = {
  active: { dot: "bg-apple-green" },
  deprecated: { dot: "bg-apple-yellow" },
  superseded: { dot: "bg-[#98989d]" },
};

export function MemoryCard({
  id,
  memoryType,
  text,
  tags,
  status,
  source,
  visibility,
  createdAt,
  onClick,
}: MemoryCardProps) {
  const [copied, setCopied] = useState(false);
  
  const date = new Date(createdAt);
  const relativeTime = formatRelativeTime(date);
  const shortId = id.slice(0, 7);

  const copyId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tc = typeConfig[memoryType] ?? { bg: "bg-white/5", text: "text-[#98989d]", dot: "bg-[#98989d]" };
  const sc = statusConfig[status] ?? { dot: "bg-[#98989d]" };

  return (
    <div
      className="group cursor-pointer rounded-xl border border-border/50 bg-white/[0.04] p-4 transition-all duration-200 hover:bg-white/[0.08] hover:border-border/70 active:scale-[0.995]"
      onClick={onClick}
    >
      <div className="flex flex-col gap-3">
        {/* Top row: badges and actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${tc.bg} ${tc.text} border-0`} variant="secondary">
              {memoryType}
            </Badge>
            <div className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
              <span className="text-[11px] text-muted-foreground/70">{status}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px]",
                source === "remote"
                  ? "bg-white/[0.06] text-muted-foreground"
                  : visibility === "repo"
                    ? "bg-apple-green/10 text-apple-green"
                    : "bg-white/[0.06] text-muted-foreground"
              )}
            >
              {source === "remote" ? (
                <>
                  <Cloud className="h-3 w-3" />
                  Remote
                </>
              ) : visibility === "repo" ? (
                <>
                  <CloudCheck className="h-3 w-3" />
                  Synced
                </>
              ) : (
                <>
                  <HardDrive className="h-3 w-3" />
                  Local
                </>
              )}
            </div>
            <button
              onClick={copyId}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] transition-all",
                "bg-white/[0.06] hover:bg-white/[0.12] text-apple-blue",
                copied && "bg-apple-green/20 text-apple-green"
              )}
              title="Copy memory ID"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3 opacity-60" />
              )}
              {shortId}
            </button>
          </div>
        </div>

        {/* Content */}
        <p className="line-clamp-2 text-[13px] leading-relaxed text-foreground/90">
          {text}
        </p>

        {/* Bottom row: tags and timestamp */}
        <div className="flex items-end justify-between gap-4">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-muted-foreground/70"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 4 && (
                <span className="text-[11px] text-muted-foreground/50">
                  +{tags.length - 4}
                </span>
              )}
            </div>
          ) : (
            <div />
          )}
          <span 
            className="shrink-0 text-[11px] text-muted-foreground/50"
            title={date.toLocaleString()}
          >
            {relativeTime}
          </span>
        </div>
      </div>
    </div>
  );
}

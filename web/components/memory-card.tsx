"use client";

import { Badge } from "@/components/ui/badge";
import { HardDrive, Cloud, CloudCheck } from "lucide-react";

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
  memoryType,
  text,
  tags,
  status,
  source,
  visibility,
  createdAt,
  onClick,
}: MemoryCardProps) {
  const date = new Date(createdAt);
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const tc = typeConfig[memoryType] ?? { bg: "bg-white/5", text: "text-[#98989d]", dot: "bg-[#98989d]" };
  const sc = statusConfig[status] ?? { dot: "bg-[#98989d]" };

  return (
    <div
      className="group cursor-pointer rounded-xl border border-border/50 bg-white/[0.04] p-4 transition-all duration-200 hover:bg-white/[0.08] hover:border-border/70 active:scale-[0.995]"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex items-center gap-2">
            <Badge className={`${tc.bg} ${tc.text} border-0`} variant="secondary">
              {memoryType}
            </Badge>
            <div className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
              <span className="text-[11px] text-muted-foreground/70">{status}</span>
            </div>
            <div 
              className="ml-auto flex items-center gap-1"
              title={
                source === "remote" 
                  ? "Remote" 
                  : visibility === "repo" 
                    ? "Local (synced)" 
                    : "Local only"
              }
            >
              {source === "remote" ? (
                <Cloud className="h-3 w-3 text-muted-foreground/40" />
              ) : visibility === "repo" ? (
                <CloudCheck className="h-3 w-3 text-apple-green/70" />
              ) : (
                <HardDrive className="h-3 w-3 text-muted-foreground/40" />
              )}
            </div>
          </div>
          <p className="line-clamp-2 text-[13px] leading-relaxed text-foreground/90">
            {text}
          </p>
          {tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
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
          )}
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground/50 pt-0.5">
          {formatted}
        </span>
      </div>
    </div>
  );
}

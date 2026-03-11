"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Archive,
  GitMerge,
  HardDrive,
  Cloud,
  CloudCheck,
  Copy,
  Check,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { typeConfig, typeConfigDefault } from "./memory-styles";

interface Memory {
  id: string;
  memoryType: string;
  text: string;
  tags: string[];
  status: string;
  visibility?: string;
}

interface TimelineEventProps {
  type: "created" | "deprecated" | "superseded";
  memory: Memory & { source: "local" | "remote" };
  date: string;
  relatedMemoryId?: string;
  onClick?: () => void;
  isLast?: boolean;
}

const eventConfig = {
  created: {
    icon: Plus,
    label: "Created",
    color: "bg-foreground",
    iconColor: "text-foreground",
    borderColor: "border-foreground/30",
  },
  deprecated: {
    icon: Archive,
    label: "Deprecated",
    color: "bg-muted-foreground",
    iconColor: "text-muted-foreground",
    borderColor: "border-muted-foreground/30",
  },
  superseded: {
    icon: GitMerge,
    label: "Superseded",
    color: "bg-muted-foreground/60",
    iconColor: "text-muted-foreground/60",
    borderColor: "border-muted-foreground/20",
  },
};

export function TimelineEvent({
  type,
  memory,
  date,
  onClick,
  isLast,
}: TimelineEventProps) {
  const [copied, setCopied] = useState(false);
  
  const eventDate = new Date(date);
  const relativeTime = formatRelativeTime(eventDate);

  const shortId = memory.id.slice(0, 7);

  const copyId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(memory.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tc = typeConfig[memory.memoryType] ?? typeConfigDefault;
  const ec = eventConfig[type];
  const EventIcon = ec.icon;

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2",
            ec.borderColor,
            "bg-[#1c1c1e]"
          )}
        >
          <EventIcon className={cn("h-4 w-4", ec.iconColor)} />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-border/50 to-transparent min-h-[24px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div
          className={cn(
            "group cursor-pointer rounded-xl border border-border/30 bg-dracula-current p-4 transition-colors duration-150",
            "hover:bg-dracula-current/35 active:scale-[0.995]"
          )}
          onClick={onClick}
        >
          <div className="flex flex-col gap-3">
            {/* Top row: badges and actions */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium",
                    ec.color + "/10",
                    ec.iconColor
                  )}
                >
                  <EventIcon className="h-3 w-3" />
                  {ec.label}
                </span>
                <Badge
                  className={`${tc.bg} ${tc.text} border-0`}
                  variant="secondary"
                >
                  {memory.memoryType}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px]",
                    memory.source === "remote"
                      ? "bg-white/[0.06] text-muted-foreground"
                      : memory.visibility === "repo"
                        ? "bg-white/[0.08] text-foreground"
                        : "bg-white/[0.06] text-muted-foreground"
                  )}
                >
                  {memory.source === "remote" ? (
                    <>
                      <Cloud className="h-3 w-3" />
                      Remote
                    </>
                  ) : memory.visibility === "repo" ? (
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
                    "bg-white/[0.06] hover:bg-white/[0.12] text-muted-foreground",
                    copied && "bg-foreground/20 text-foreground"
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
              {memory.text}
            </p>

            {/* Bottom row: tags and timestamp */}
            <div className="flex items-end justify-between gap-4">
              {memory.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {memory.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-muted-foreground/70"
                    >
                      {tag}
                    </span>
                  ))}
                  {memory.tags.length > 3 && (
                    <span className="text-[11px] text-muted-foreground/50">
                      +{memory.tags.length - 3}
                    </span>
                  )}
                </div>
              ) : (
                <div />
              )}
              <span 
                className="shrink-0 text-[11px] text-muted-foreground/50"
                title={eventDate.toLocaleString()}
              >
                {relativeTime}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

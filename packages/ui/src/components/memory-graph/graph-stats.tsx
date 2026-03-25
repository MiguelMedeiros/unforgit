"use client";

import * as React from "react";
import { HardDrive, Cloud } from "lucide-react";

interface GraphStatsProps {
  linkedCount: number;
  orphanCount: number;
  linkCount: number;
  showSource?: boolean;
  source?: "local" | "remote";
  renderExtra?: () => React.ReactNode;
}

export function GraphStats({
  linkedCount,
  orphanCount,
  linkCount,
  showSource = false,
  source = "local",
  renderExtra,
}: GraphStatsProps) {
  return (
    <div className="rounded-xl border border-border/30 bg-[rgba(28,28,30,0.85)] glass px-3 py-2">
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        {showSource && (
          <span
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md ${
              source === "local"
                ? "bg-white/[0.08] text-foreground"
                : "bg-white/[0.06] text-muted-foreground"
            }`}
          >
            {source === "local" ? (
              <HardDrive className="h-3 w-3" />
            ) : (
              <Cloud className="h-3 w-3" />
            )}
            {source}
          </span>
        )}
        <span>
          <strong className="text-foreground font-semibold">{linkedCount}</strong>{" "}
          linked
        </span>
        <span>
          <strong className="text-foreground font-semibold">{orphanCount}</strong>{" "}
          orphan
        </span>
        <span>
          <strong className="text-foreground font-semibold">{linkCount}</strong>{" "}
          links
        </span>
        {renderExtra?.()}
      </div>
    </div>
  );
}

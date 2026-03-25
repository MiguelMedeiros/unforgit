"use client";

import * as React from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Eye,
  EyeOff,
  HardDrive,
  Cloud,
} from "lucide-react";

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onReset: () => void;
  showOrphans: boolean;
  onToggleOrphans: () => void;
  showSourceToggle?: boolean;
  source?: "local" | "remote";
  onSourceChange?: (source: "local" | "remote") => void;
}

export function GraphControls({
  onZoomIn,
  onZoomOut,
  onFitView,
  onReset,
  showOrphans,
  onToggleOrphans,
  showSourceToggle = false,
  source = "local",
  onSourceChange,
}: GraphControlsProps) {
  const controls = [
    { icon: ZoomIn, action: onZoomIn, title: "Zoom in" },
    { icon: ZoomOut, action: onZoomOut, title: "Zoom out" },
    { icon: Maximize2, action: onFitView, title: "Fit view" },
    { icon: RotateCcw, action: onReset, title: "Reset" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-[rgba(28,28,30,0.85)] glass p-1">
      {controls.map(({ icon: Icon, action, title }) => (
        <button
          key={title}
          onClick={action}
          className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-white/[0.08]"
          title={title}
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
        </button>
      ))}

      <div className="w-px h-5 bg-border/30 mx-1" />

      <button
        onClick={onToggleOrphans}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition-colors ${
          showOrphans
            ? "bg-white/10 text-white"
            : "text-muted-foreground hover:text-foreground hover:bg-white/[0.08]"
        }`}
        title={showOrphans ? "Hide orphan nodes" : "Show orphan nodes"}
      >
        {showOrphans ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
        <span className="text-[11px]">
          {showOrphans ? "Hide orphans" : "Show orphans"}
        </span>
      </button>

      {showSourceToggle && onSourceChange && (
        <>
          <div className="w-px h-5 bg-border/30 mx-1" />
          <button
            onClick={() =>
              onSourceChange(source === "local" ? "remote" : "local")
            }
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition-colors ${
              source === "local"
                ? "bg-white/10 text-foreground"
                : "bg-white/[0.06] text-muted-foreground"
            }`}
            title={
              source === "local"
                ? "Showing local data - Click to show remote"
                : "Showing remote data - Click to show local"
            }
          >
            {source === "local" ? (
              <HardDrive className="h-4 w-4" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
            <span className="text-[11px]">
              {source === "local" ? "Local" : "Remote"}
            </span>
          </button>
        </>
      )}
    </div>
  );
}

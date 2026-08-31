"use client";

import { cn } from "@/lib/utils";
import { TIMEFRAME_OPTIONS, type Timeframe } from "@/lib/timeframe";

interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (value: Timeframe) => void;
  className?: string;
}


export function TimeframeSelector({ value, onChange, className }: TimeframeSelectorProps) {
  return (
    <div className={cn("flex items-center gap-1 rounded-lg bg-dracula-current/30 p-1", className)}>
      {TIMEFRAME_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-[12px] font-medium transition-all",
            value === option.value
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/6"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

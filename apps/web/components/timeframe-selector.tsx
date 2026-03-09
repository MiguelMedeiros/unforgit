"use client";

import { cn } from "@/lib/utils";

export type Timeframe = "all" | "1d" | "1w" | "1m" | "3m" | "6m" | "1y";

interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (value: Timeframe) => void;
  className?: string;
}

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: "all", label: "All" },
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
  { value: "1m", label: "1 Month" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "1y", label: "1 Year" },
];

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
              ? "bg-dracula-purple text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/6"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function getTimeframeLabel(timeframe: Timeframe): string {
  const option = TIMEFRAME_OPTIONS.find((o) => o.value === timeframe);
  return option?.label ?? "All";
}

export function getTimeframeDays(timeframe: Timeframe): number | null {
  switch (timeframe) {
    case "1d": return 1;
    case "1w": return 7;
    case "1m": return 30;
    case "3m": return 90;
    case "6m": return 180;
    case "1y": return 365;
    default: return null;
  }
}

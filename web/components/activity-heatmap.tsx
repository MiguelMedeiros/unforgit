"use client";

import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ActivityHeatmapProps {
  dailyCounts: Array<{ date: string; count: number }>;
}

export function ActivityHeatmap({ dailyCounts }: ActivityHeatmapProps) {
  const { weeks, maxCount, totalMemories, totalDays } = useMemo(() => {
    const countMap = new Map(dailyCounts.map((d) => [d.date, d.count]));
    const maxCount = Math.max(...dailyCounts.map((d) => d.count), 1);

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - endDate.getDay() + 6);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 52 * 7 + 1);

    const weeks: Array<Array<{ date: string; count: number; dayOfWeek: number }>> = [];
    let currentWeek: Array<{ date: string; count: number; dayOfWeek: number }> = [];

    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split("T")[0];
      const dayOfWeek = current.getDay();

      currentWeek.push({
        date: dateStr,
        count: countMap.get(dateStr) ?? 0,
        dayOfWeek,
      });

      if (dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      current.setDate(current.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    const totalMemories = dailyCounts.reduce((sum, d) => sum + d.count, 0);
    const totalDays = dailyCounts.length;

    return { weeks, maxCount, totalMemories, totalDays };
  }, [dailyCounts]);

  function getColorClass(count: number): string {
    if (count === 0) return "bg-white/[0.04]";
    const intensity = count / maxCount;
    if (intensity <= 0.25) return "bg-apple-green/30";
    if (intensity <= 0.5) return "bg-apple-green/50";
    if (intensity <= 0.75) return "bg-apple-green/70";
    return "bg-apple-green";
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const months = useMemo(() => {
    const result: Array<{ label: string; colStart: number }> = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDay = week[0];
      if (firstDay) {
        const date = new Date(firstDay.date);
        const month = date.getMonth();
        if (month !== lastMonth) {
          result.push({
            label: date.toLocaleDateString("en-US", { month: "short" }),
            colStart: weekIndex,
          });
          lastMonth = month;
        }
      }
    });

    return result;
  }, [weeks]);

  const cellSize = 10;
  const cellGap = 3;
  const cellTotal = cellSize + cellGap;
  const labelWidth = 28;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">Activity</h3>
        <p className="text-[12px] text-muted-foreground">
          {totalMemories} memories in {totalDays} days
        </p>
      </div>

      <div className="rounded-xl border border-border/40 bg-white/[0.02] p-4 overflow-x-auto">
        <div className="relative" style={{ minWidth: `${labelWidth + weeks.length * cellTotal}px` }}>
          <div 
            className="relative h-4 mb-1"
            style={{ marginLeft: `${labelWidth}px` }}
          >
            {months.map((m, i) => (
              <span
                key={i}
                className="absolute text-[10px] text-muted-foreground/60"
                style={{ left: `${m.colStart * cellTotal}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex">
            <div 
              className="flex flex-col justify-between text-[10px] text-muted-foreground/60 pr-1"
              style={{ width: `${labelWidth}px`, height: `${7 * cellTotal - cellGap}px` }}
            >
              <span></span>
              <span>Mon</span>
              <span></span>
              <span>Wed</span>
              <span></span>
              <span>Fri</span>
              <span></span>
            </div>

            <TooltipProvider delayDuration={100}>
              <div className="flex gap-[3px]">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((day) => (
                      <Tooltip key={day.date}>
                        <TooltipTrigger asChild>
                          <div
                            className={`h-[10px] w-[10px] rounded-[2px] transition-colors ${getColorClass(day.count)}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="bg-[rgba(28,28,30,0.95)] border-border/50 text-[12px]"
                        >
                          <p className="font-medium">
                            {day.count} {day.count === 1 ? "memory" : "memories"}
                          </p>
                          <p className="text-muted-foreground">{formatDate(day.date)}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>

          <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground/60">
            <span>Less</span>
            <div className="flex gap-[2px]">
              <div className="h-[10px] w-[10px] rounded-[2px] bg-white/[0.04]" />
              <div className="h-[10px] w-[10px] rounded-[2px] bg-apple-green/30" />
              <div className="h-[10px] w-[10px] rounded-[2px] bg-apple-green/50" />
              <div className="h-[10px] w-[10px] rounded-[2px] bg-apple-green/70" />
              <div className="h-[10px] w-[10px] rounded-[2px] bg-apple-green" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

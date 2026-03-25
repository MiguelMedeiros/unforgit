"use client";

import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../primitives/tooltip";

export interface ActivityHeatmapProps {
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

    const weeks: Array<
      Array<{ date: string; count: number; dayOfWeek: number }>
    > = [];
    let currentWeek: Array<{
      date: string;
      count: number;
      dayOfWeek: number;
    }> = [];

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
    if (intensity <= 0.25) return "bg-green-500/30";
    if (intensity <= 0.5) return "bg-green-500/50";
    if (intensity <= 0.75) return "bg-green-500/70";
    return "bg-green-500";
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

  const labelWidth = 28;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">Activity</h3>
        <p className="text-[12px] text-muted-foreground">
          {totalMemories} memories in {totalDays} days
        </p>
      </div>

      <div className="w-full rounded-xl border border-border/30 bg-dracula-current p-4">
        <div className="w-full">
          <div
            className="relative h-4 mb-1 flex"
            style={{ paddingLeft: `${labelWidth}px` }}
          >
            <div className="flex-1 flex justify-between">
              {months.map((m, i) => (
                <span
                  key={i}
                  className="text-[10px] text-muted-foreground/60"
                  style={{
                    position: "absolute",
                    left: `calc(${labelWidth}px + ${(m.colStart / weeks.length) * 100}% * (1 - ${labelWidth}px / 100%))`,
                    transform: "translateX(0)",
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex w-full">
            <div
              className="flex flex-col justify-between text-[10px] text-muted-foreground/60 pr-1 shrink-0"
              style={{ width: `${labelWidth}px` }}
            >
              <span className="h-[10px]"></span>
              <span className="h-[10px] flex items-center">Mon</span>
              <span className="h-[10px]"></span>
              <span className="h-[10px] flex items-center">Wed</span>
              <span className="h-[10px]"></span>
              <span className="h-[10px] flex items-center">Fri</span>
              <span className="h-[10px]"></span>
            </div>

            <TooltipProvider delayDuration={100}>
              <div
                className="flex-1 grid gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}
              >
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((day) => (
                      <Tooltip key={day.date}>
                        <TooltipTrigger asChild>
                          <div
                            className={`aspect-square w-full max-w-[14px] rounded-[2px] transition-colors ${getColorClass(day.count)}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="bg-dracula-current border border-dracula-comment/30 px-3 py-2 shadow-lg"
                        >
                          <p className="text-[13px] font-semibold text-dracula-foreground">
                            {day.count} {day.count === 1 ? "memory" : "memories"}
                          </p>
                          <p className="text-[12px] text-dracula-comment">
                            {formatDate(day.date)}
                          </p>
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
              <div className="h-[10px] w-[10px] rounded-[2px] bg-green-500/30" />
              <div className="h-[10px] w-[10px] rounded-[2px] bg-green-500/50" />
              <div className="h-[10px] w-[10px] rounded-[2px] bg-green-500/70" />
              <div className="h-[10px] w-[10px] rounded-[2px] bg-green-500" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

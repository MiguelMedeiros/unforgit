export type Timeframe = "all" | "1d" | "1w" | "1m" | "3m" | "6m" | "1y";

export const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: "all", label: "All" },
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
  { value: "1m", label: "1 Month" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "1y", label: "1 Year" },
];

export function getTimeframeLabel(timeframe: Timeframe): string {
  const option = TIMEFRAME_OPTIONS.find((candidate) => candidate.value === timeframe);
  return option?.label ?? "All";
}

export function getTimeframeDays(timeframe: Timeframe): number | null {
  switch (timeframe) {
    case "1d":
      return 1;
    case "1w":
      return 7;
    case "1m":
      return 30;
    case "3m":
      return 90;
    case "6m":
      return 180;
    case "1y":
      return 365;
    default:
      return null;
  }
}

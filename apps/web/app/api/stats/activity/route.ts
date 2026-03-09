import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

function getTimeframeDate(timeframe: string | null): Date | undefined {
  if (!timeframe || timeframe === "all") return undefined;
  
  const now = new Date();
  switch (timeframe) {
    case "1d":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "1w":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "1m":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "3m":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "6m":
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    case "1y":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return undefined;
  }
}

function getTimeframeDays(timeframe: string | null): number {
  switch (timeframe) {
    case "1d": return 1;
    case "1w": return 7;
    case "1m": return 30;
    case "3m": return 90;
    case "6m": return 180;
    case "1y": return 365;
    default: return 365;
  }
}

export async function GET(request: NextRequest) {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Unforgit not initialized" },
      { status: 500 }
    );
  }

  const params = request.nextUrl.searchParams;
  const timeframe = params.get("timeframe");
  const days = params.get("days") 
    ? parseInt(params.get("days")!, 10) 
    : getTimeframeDays(timeframe);
  const sinceDate = getTimeframeDate(timeframe);

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json({ dailyCounts: [], weeklyTrend: [], hourlyCounts: [] });
  }

  const dailyCounts = local.dailyCounts(
    config.remote.orgId,
    config.remote.repoId,
    days,
    sinceDate
  );
  
  const weeklyTrend = local.weeklyTrend(
    config.remote.orgId,
    config.remote.repoId,
    Math.ceil(days / 7)
  );

  const hourlyCounts = timeframe === "1d" 
    ? local.hourlyCounts(config.remote.orgId, config.remote.repoId)
    : [];

  return NextResponse.json({ dailyCounts, weeklyTrend, hourlyCounts });
}

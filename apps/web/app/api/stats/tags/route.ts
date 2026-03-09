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

export async function GET(request: NextRequest) {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Unforgit not initialized" },
      { status: 500 },
    );
  }

  const params = request.nextUrl.searchParams;
  const limit = parseInt(params.get("limit") ?? "10", 10);
  const timeframe = params.get("timeframe");
  const sinceDate = getTimeframeDate(timeframe);

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json({ tags: [] });
  }

  const tags = local.topTags(config.remote.orgId, config.remote.repoId, limit, sinceDate);

  return NextResponse.json({ tags });
}

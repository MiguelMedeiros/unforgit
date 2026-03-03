import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";
import type { StoreStats } from "@/lib/types";

const emptyStats: StoreStats = {
  total: 0,
  byType: { episodic: 0, semantic: 0, procedural: 0 },
  byStatus: { active: 0, deprecated: 0, superseded: 0, deleted: 0 },
  byVisibility: { private: 0, repo: 0 },
};

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
      { error: "Hippocampus not initialized" },
      { status: 500 },
    );
  }

  const params = request.nextUrl.searchParams;
  const timeframe = params.get("timeframe");
  const sinceDate = getTimeframeDate(timeframe);

  let localStats: StoreStats = { ...emptyStats };
  const remoteStats: StoreStats = { ...emptyStats };
  let remoteAvailable = false;
  let syncSummary = { synced: 0, pendingPush: 0, pendingPull: 0, conflicts: 0, notTracked: 0 };

  const local = getLocalStore();
  if (local) {
    localStats = local.stats(config.remote.orgId, config.remote.repoId, sinceDate);
    syncSummary = local.getSyncSummary(config.remote.orgId, config.remote.repoId);
  }

  if (config.remote.url) {
    try {
      const res = await fetch(`${config.remote.url}/health`);
      if (res.ok) remoteAvailable = true;
    } catch {
      /* remote not available */
    }
  }

  return NextResponse.json({
    local: localStats,
    remote: remoteStats,
    remoteAvailable,
    syncSummary,
  });
}

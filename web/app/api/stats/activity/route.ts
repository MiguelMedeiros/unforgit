import { NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

export async function GET(request: Request) {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Hippocampus not initialized" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "365", 10);

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json({ dailyCounts: [], weeklyTrend: [] });
  }

  const dailyCounts = local.dailyCounts(
    config.remote.orgId,
    config.remote.repoId,
    days
  );
  
  const weeklyTrend = local.weeklyTrend(
    config.remote.orgId,
    config.remote.repoId,
    Math.ceil(days / 7)
  );

  return NextResponse.json({ dailyCounts, weeklyTrend });
}

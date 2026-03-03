import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

export async function GET(request: NextRequest) {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Hippocampus not initialized" },
      { status: 500 },
    );
  }

  const params = request.nextUrl.searchParams;
  const limit = parseInt(params.get("limit") ?? "10", 10);

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json({ tags: [] });
  }

  const tags = local.topTags(config.remote.orgId, config.remote.repoId, limit);

  return NextResponse.json({ tags });
}

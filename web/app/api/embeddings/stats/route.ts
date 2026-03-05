import { NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

export async function GET() {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Hippocampus not initialized" },
      { status: 500 },
    );
  }

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 500 },
    );
  }

  try {
    const stats = local.getEmbeddingStats(
      config.remote.orgId,
      config.remote.repoId
    );

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to get embedding stats:", error);
    return NextResponse.json(
      { error: "Failed to get embedding stats" },
      { status: 500 },
    );
  }
}

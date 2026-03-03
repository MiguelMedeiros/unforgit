import { NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";
import type { StoreStats } from "@/lib/types";

const emptyStats: StoreStats = {
  total: 0,
  byType: { episodic: 0, semantic: 0, procedural: 0 },
  byStatus: { active: 0, deprecated: 0, superseded: 0, deleted: 0 },
  byVisibility: { private: 0, repo: 0 },
};

export async function GET() {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Hippocampus not initialized" },
      { status: 500 },
    );
  }

  let localStats: StoreStats = { ...emptyStats };
  const remoteStats: StoreStats = { ...emptyStats };
  let remoteAvailable = false;

  const local = getLocalStore();
  if (local) {
    localStats = local.stats(config.remote.orgId, config.remote.repoId);
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
  });
}

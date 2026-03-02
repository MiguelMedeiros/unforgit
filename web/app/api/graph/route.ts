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
      { error: "Store not available" },
      { status: 503 },
    );
  }

  const memories = local.list({
    orgId: config.remote.orgId,
    repoId: config.remote.repoId,
    limit: 1000,
    offset: 0,
  });

  const links = local.getAllLinks();

  const memoryIds = new Set(memories.map((m) => m.id));
  const validLinks = links.filter(
    (l) => memoryIds.has(l.sourceId) && memoryIds.has(l.targetId),
  );

  return NextResponse.json({ memories, links: validLinks });
}

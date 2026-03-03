import { NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

export async function POST() {
  const config = getConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Hippocampus not initialized" },
      { status: 500 },
    );
  }

  const store = getLocalStore();
  if (!store) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 },
    );
  }

  const orphanLinksRemoved = store.cleanupOrphanLinks();

  return NextResponse.json({
    success: true,
    orphanLinksRemoved,
  });
}

export async function GET() {
  const config = getConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Hippocampus not initialized" },
      { status: 500 },
    );
  }

  const store = getLocalStore();
  if (!store) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 },
    );
  }

  // Count orphan links without deleting
  const allLinks = store.getAllLinks();
  let orphanCount = 0;

  for (const link of allLinks) {
    const source = store.getById(link.sourceId);
    const target = store.getById(link.targetId);
    if (!source || !target || source.status === "deleted" || target.status === "deleted") {
      orphanCount++;
    }
  }

  return NextResponse.json({
    orphanLinks: orphanCount,
    totalLinks: allLinks.length,
  });
}

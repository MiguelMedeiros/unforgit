import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const { consolidationId } = body;

  if (!consolidationId || typeof consolidationId !== "string") {
    return NextResponse.json(
      { error: "consolidationId is required" },
      { status: 400 },
    );
  }

  const memory = store.getById(consolidationId);
  if (!memory) {
    return NextResponse.json(
      { error: "Memory not found" },
      { status: 404 },
    );
  }

  if (!memory.isConsolidation) {
    return NextResponse.json(
      { error: "Memory is not a consolidation" },
      { status: 400 },
    );
  }

  try {
    const result = store.unconsolidate(consolidationId);

    return NextResponse.json({
      success: true,
      consolidationId,
      restoredIds: result.restoredIds,
      consolidationDeleted: result.consolidationDeleted,
      linksRemoved: result.linksRemoved,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unconsolidation failed" },
      { status: 500 },
    );
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

  const store = getLocalStore();
  if (!store) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const consolidationId = searchParams.get("id");

  if (!consolidationId) {
    return NextResponse.json(
      { error: "id query parameter is required" },
      { status: 400 },
    );
  }

  const memory = store.getById(consolidationId);
  if (!memory) {
    return NextResponse.json(
      { error: "Memory not found" },
      { status: 404 },
    );
  }

  if (!memory.isConsolidation) {
    return NextResponse.json(
      { error: "Memory is not a consolidation" },
      { status: 400 },
    );
  }

  const sourceLinks = store.getLinks(consolidationId, "derived_from");
  const sourceIds = sourceLinks
    .filter((l) => l.sourceId === consolidationId)
    .map((l) => l.targetId);

  const sources = sourceIds
    .map((id) => store.getById(id))
    .filter((m): m is NonNullable<typeof m> => m !== undefined)
    .map((m) => ({
      id: m.id,
      text: m.text,
      memoryType: m.memoryType,
      status: m.status,
      tags: m.tags,
      canRestore: m.status === "superseded" && m.supersedesId === consolidationId,
    }));

  return NextResponse.json({
    consolidationId,
    consolidationVersion: memory.consolidationVersion ?? 1,
    consolidatedText: memory.text,
    sources,
    canUnconsolidate: sources.some((s) => s.canRestore),
  });
}

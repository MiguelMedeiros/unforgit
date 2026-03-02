import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const config = getConfig();

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 },
    );
  }

  const memory = local.getById(id);
  if (!memory) {
    return NextResponse.json(
      { error: "Memory not found locally" },
      { status: 404 },
    );
  }

  if (!config?.remote.url) {
    return NextResponse.json(
      { error: "Remote server URL not configured" },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${config.remote.url}/v1/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: memory.orgId,
        repoId: memory.repoId,
        memoryType: memory.memoryType,
        text: memory.text,
        summary: memory.summary,
        tags: memory.tags,
        sourceRefs: memory.sourceRefs,
        confidence: memory.confidence,
        visibility: "repo",
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to promote to remote" },
        { status: 502 },
      );
    }

    const data = await res.json();
    local.updateVisibility(id, "repo");

    return NextResponse.json({
      promoted: { id: data.id, source: "remote" },
      localId: id,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not connect to remote server" },
      { status: 503 },
    );
  }
}

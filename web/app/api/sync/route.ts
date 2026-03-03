import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

export async function POST(request: NextRequest) {
  const config = getConfig();
  const local = getLocalStore();

  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 }
    );
  }

  if (!config?.remote.url) {
    return NextResponse.json(
      { error: "Remote server URL not configured" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const ids: string[] | undefined = body.ids;

  const memories = local.list({
    orgId: config.remote.orgId,
    repoId: config.remote.repoId,
    visibility: ["private"],
    status: ["active"],
    limit: 1000,
    offset: 0,
  });

  const toSync = ids
    ? memories.filter((m) => ids.includes(m.id))
    : memories;

  const results: { id: string; success: boolean; error?: string }[] = [];
  const syncedIds: string[] = [];

  for (const memory of toSync) {
    try {
      const res = await fetch(`${config.remote.url}/v1/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: memory.id,
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

      if (res.ok) {
        local.updateVisibility(memory.id, "repo");
        results.push({ id: memory.id, success: true });
        syncedIds.push(memory.id);
      } else {
        const errorText = await res.text().catch(() => "Unknown error");
        results.push({ id: memory.id, success: false, error: errorText });
      }
    } catch (err) {
      results.push({
        id: memory.id,
        success: false,
        error: err instanceof Error ? err.message : "Connection failed",
      });
    }
  }

  const allLinks = local.getAllLinks();
  const linksToSync = allLinks.filter(
    (l) => syncedIds.includes(l.sourceId) || syncedIds.includes(l.targetId)
  );

  let linksSynced = 0;
  let linksFailed = 0;

  for (const link of linksToSync) {
    try {
      const res = await fetch(`${config.remote.url}/v1/memory/${link.sourceId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: link.targetId,
          linkType: link.linkType,
          metadata: link.metadata,
        }),
      });

      if (res.ok || res.status === 409) {
        linksSynced++;
      } else {
        linksFailed++;
      }
    } catch {
      linksFailed++;
    }
  }

  const synced = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    synced,
    failed,
    total: toSync.length,
    linksSynced,
    linksFailed,
    results,
  });
}

export async function GET() {
  const config = getConfig();
  const local = getLocalStore();

  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 }
    );
  }

  if (!config?.remote.url) {
    return NextResponse.json({
      pendingSync: 0,
      remoteConfigured: false,
    });
  }

  const pendingCount = local.count({
    orgId: config.remote.orgId,
    repoId: config.remote.repoId,
    visibility: ["private"],
    status: ["active"],
  });

  let remoteConnected = false;
  try {
    const res = await fetch(`${config.remote.url}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    remoteConnected = res.ok;
  } catch {
    remoteConnected = false;
  }

  return NextResponse.json({
    pendingSync: pendingCount,
    remoteConfigured: true,
    remoteConnected,
  });
}

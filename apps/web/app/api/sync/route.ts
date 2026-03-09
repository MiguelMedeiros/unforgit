import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";
import type { Memory, Tombstone, SyncResult, SyncConflict, ConflictResolution, LinkType } from "@/lib/types";

interface RemoteMemory {
  id: string;
  orgId: string;
  repoId: string;
  scopeType: string;
  memoryType: string;
  visibility: string;
  status: string;
  text: string;
  summary?: string;
  tags: string[];
  sourceRefs?: Record<string, unknown>;
  confidence?: number;
  ttlSeconds?: number;
  supersedesId?: string;
  version: number;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface RemoteTombstone {
  id: string;
  memoryId: string;
  orgId: string;
  repoId: string;
  deletedAt: string;
  deletedBy?: string;
  syncedAt?: string;
}

interface RemoteLink {
  id: string;
  sourceId: string;
  targetId: string;
  linkType: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

function parseRemoteMemory(rm: RemoteMemory): Memory {
  return {
    ...rm,
    memoryType: rm.memoryType as Memory["memoryType"],
    visibility: rm.visibility as Memory["visibility"],
    status: rm.status as Memory["status"],
    version: rm.version ?? 1,
    deletedAt: rm.deletedAt ? new Date(rm.deletedAt) : undefined,
    deletedBy: rm.deletedBy,
    createdAt: new Date(rm.createdAt),
    updatedAt: new Date(rm.updatedAt),
  };
}

function parseRemoteTombstone(rt: RemoteTombstone): Tombstone {
  return {
    id: rt.id,
    memoryId: rt.memoryId,
    orgId: rt.orgId,
    repoId: rt.repoId,
    deletedAt: new Date(rt.deletedAt),
    deletedBy: rt.deletedBy,
    syncedAt: rt.syncedAt ? new Date(rt.syncedAt) : undefined,
  };
}

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
  const conflictResolution: ConflictResolution = body.conflictResolution ?? "last_write_wins";
  const lastSyncAt = body.lastSyncAt ? new Date(body.lastSyncAt) : undefined;

  const result: SyncResult = {
    pushed: 0,
    pulled: 0,
    conflicts: [],
    deletionsPropagated: 0,
    errors: [],
  };

  const { orgId, repoId } = config.remote;

  // PHASE 1: Pull tombstones from remote and apply locally
  try {
    const tombstonesRes = await fetch(
      `${config.remote.url}/v1/sync/tombstones?orgId=${orgId}&repoId=${repoId}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );

    if (tombstonesRes.ok) {
      const remoteTombstones: RemoteTombstone[] = await tombstonesRes.json();
      for (const rt of remoteTombstones) {
        const tombstone = parseRemoteTombstone(rt);
        const applied = local.applyTombstone(tombstone);
        if (applied) {
          result.deletionsPropagated++;
        }
      }
    }
  } catch (err) {
    result.errors.push({
      id: "tombstones-pull",
      error: err instanceof Error ? err.message : "Failed to pull tombstones",
    });
  }

  // PHASE 2: Pull memories from remote (modified since last sync)
  try {
    const pullUrl = lastSyncAt
      ? `${config.remote.url}/v1/sync/pull?orgId=${orgId}&repoId=${repoId}&since=${lastSyncAt.toISOString()}`
      : `${config.remote.url}/v1/sync/pull?orgId=${orgId}&repoId=${repoId}`;

    const pullRes = await fetch(pullUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (pullRes.ok) {
      const remoteMemories: RemoteMemory[] = await pullRes.json();

      for (const rm of remoteMemories) {
        const memory = parseRemoteMemory(rm);
        const { action, conflict } = local.upsertFromRemote(memory);

        if (action === "created" || action === "updated") {
          result.pulled++;
        }

        if (conflict) {
          const localMem = local.getById(memory.id);
          if (localMem) {
            const syncConflict: SyncConflict = {
              memoryId: memory.id,
              localVersion: localMem.version ?? 1,
              remoteVersion: memory.version ?? 1,
              localUpdatedAt: localMem.updatedAt,
              remoteUpdatedAt: memory.updatedAt,
              resolution: conflictResolution,
            };
            result.conflicts.push(syncConflict);
          }
        }
      }
    }
  } catch (err) {
    result.errors.push({
      id: "memories-pull",
      error: err instanceof Error ? err.message : "Failed to pull memories",
    });
  }

  // PHASE 3: Push local tombstones to remote
  const localTombstones = local.getUnsyncedTombstones(orgId, repoId);
  for (const tombstone of localTombstones) {
    try {
      const res = await fetch(`${config.remote.url}/v1/sync/tombstones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memoryId: tombstone.memoryId,
          orgId: tombstone.orgId,
          repoId: tombstone.repoId,
          deletedAt: tombstone.deletedAt.toISOString(),
          deletedBy: tombstone.deletedBy,
        }),
      });

      if (res.ok || res.status === 409) {
        local.markTombstoneSynced(tombstone.memoryId);
        result.deletionsPropagated++;
      }
    } catch (err) {
      result.errors.push({
        id: tombstone.memoryId,
        error: err instanceof Error ? err.message : "Failed to push tombstone",
      });
    }
  }

  // PHASE 4: Push local memories to remote
  // Only push memories that are still private (not yet synced)
  const localMemories = local.list({
    orgId,
    repoId,
    visibility: ["private"],
    status: ["active"],
    limit: 1000,
    offset: 0,
  });

  for (const memory of localMemories) {
    try {
      const res = await fetch(`${config.remote.url}/v1/sync/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: memory.id,
          orgId: memory.orgId,
          repoId: memory.repoId,
          scopeType: memory.scopeType,
          memoryType: memory.memoryType,
          visibility: "repo",
          status: memory.status,
          text: memory.text,
          summary: memory.summary,
          tags: memory.tags,
          sourceRefs: memory.sourceRefs,
          confidence: memory.confidence,
          ttlSeconds: memory.ttlSeconds,
          supersedesId: memory.supersedesId,
          version: memory.version ?? 1,
          deletedAt: memory.deletedAt?.toISOString(),
          deletedBy: memory.deletedBy,
          createdAt: memory.createdAt.toISOString(),
          updatedAt: memory.updatedAt.toISOString(),
        }),
      });

      if (res.ok) {
        local.updateVisibility(memory.id, "repo");
        result.pushed++;
      } else {
        const responseData = await res.json().catch(() => ({}));
        if (responseData.conflict) {
          const syncConflict: SyncConflict = {
            memoryId: memory.id,
            localVersion: memory.version ?? 1,
            remoteVersion: responseData.remoteVersion ?? 1,
            localUpdatedAt: memory.updatedAt,
            remoteUpdatedAt: new Date(responseData.remoteUpdatedAt ?? Date.now()),
            resolution: conflictResolution,
          };
          result.conflicts.push(syncConflict);
        } else {
          result.errors.push({
            id: memory.id,
            error: responseData.error ?? "Unknown error",
          });
        }
      }
    } catch (err) {
      result.errors.push({
        id: memory.id,
        error: err instanceof Error ? err.message : "Connection failed",
      });
    }
  }

  // PHASE 5: Pull links from remote
  let linksPulled = 0;
  try {
    const linksRes = await fetch(
      `${config.remote.url}/v1/sync/links?orgId=${orgId}&repoId=${repoId}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );

    if (linksRes.ok) {
      const remoteLinks: RemoteLink[] = await linksRes.json();
      for (const rl of remoteLinks) {
        const { action } = local.upsertLink({
          id: rl.id,
          sourceId: rl.sourceId,
          targetId: rl.targetId,
          linkType: rl.linkType as LinkType,
          metadata: rl.metadata,
          createdAt: rl.createdAt ? new Date(rl.createdAt) : undefined,
        });
        if (action === "created") {
          linksPulled++;
        }
      }
    }
  } catch (err) {
    result.errors.push({
      id: "links-pull",
      error: err instanceof Error ? err.message : "Failed to pull links",
    });
  }

  // PHASE 6: Push local links to remote
  const allLinks = local.getAllLinks();
  let linksSynced = 0;
  let linksFailed = 0;

  for (const link of allLinks) {
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

  // PHASE 7: Cleanup orphan links
  const orphanLinksRemoved = local.cleanupOrphanLinks();

  return NextResponse.json({
    ...result,
    linksPulled,
    linksSynced,
    linksFailed,
    orphanLinksRemoved,
    syncedAt: new Date().toISOString(),
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
      pendingDeletions: 0,
      remoteConfigured: false,
    });
  }

  const { orgId, repoId } = config.remote;

  const pendingCount = local.count({
    orgId,
    repoId,
    visibility: ["private"],
    status: ["active"],
  });

  const pendingDeletions = local.getUnsyncedTombstones(orgId, repoId).length;

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
    pendingDeletions,
    remoteConfigured: true,
    remoteConnected,
  });
}

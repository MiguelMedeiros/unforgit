import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";
import type { Memory, MemoryLink } from "@/lib/types";

async function fetchRemoteGraph(
  remoteUrl: string,
  orgId: string,
  repoId: string,
): Promise<{ memories: Memory[]; links: MemoryLink[] }> {
  try {
    const params = new URLSearchParams();
    params.set("orgId", orgId);
    params.set("repoId", repoId);
    params.set("limit", "1000");
    params.set("offset", "0");

    const [memoriesRes, linksRes] = await Promise.all([
      fetch(`${remoteUrl}/v1/memories?${params.toString()}`, {
        cache: "no-store",
      }),
      fetch(`${remoteUrl}/v1/links?orgId=${orgId}&repoId=${repoId}`, {
        cache: "no-store",
      }),
    ]);

    if (!memoriesRes.ok) return { memories: [], links: [] };

    const memoriesData = await memoriesRes.json();
    const memories = (memoriesData.memories ?? []).map((m: Memory) => ({
      ...m,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
    }));

    let links: MemoryLink[] = [];
    if (linksRes.ok) {
      const linksData = await linksRes.json();
      links = (linksData.links ?? []).map((l: MemoryLink) => ({
        ...l,
        createdAt: new Date(l.createdAt),
      }));
    }

    return { memories, links };
  } catch {
    return { memories: [], links: [] };
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const source = params.get("source") ?? "local";

  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Unforgit not initialized" },
      { status: 500 },
    );
  }

  let memories: Memory[] = [];
  let links: MemoryLink[] = [];

  if (source === "local" || source === "both") {
    const local = getLocalStore();
    if (local) {
      const localMemories = local.list({
        orgId: config.remote.orgId,
        repoId: config.remote.repoId,
        limit: 1000,
        offset: 0,
      });
      const localLinks = local.getAllLinks();
      memories.push(...localMemories);
      links.push(...localLinks);
    }
  }

  if ((source === "remote" || source === "both") && config.remote.url) {
    const remoteData = await fetchRemoteGraph(
      config.remote.url,
      config.remote.orgId,
      config.remote.repoId,
    );
    memories.push(...remoteData.memories);
    links.push(...remoteData.links);
  }

  if (source === "both") {
    const seenMemories = new Set<string>();
    memories = memories.filter((m) => {
      if (seenMemories.has(m.id)) return false;
      seenMemories.add(m.id);
      return true;
    });

    const seenLinks = new Set<string>();
    links = links.filter((l) => {
      if (seenLinks.has(l.id)) return false;
      seenLinks.add(l.id);
      return true;
    });
  }

  const memoryIds = new Set(memories.map((m) => m.id));
  const validLinks = links.filter(
    (l) => memoryIds.has(l.sourceId) && memoryIds.has(l.targetId),
  );

  return NextResponse.json({ memories, links: validLinks });
}

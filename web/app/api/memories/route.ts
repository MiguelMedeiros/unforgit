import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";
import type { ListQuery, Memory } from "@/lib/types";

async function fetchRemoteMemories(
  remoteUrl: string,
  query: ListQuery,
): Promise<{ memories: Memory[]; total: number }> {
  try {
    const params = new URLSearchParams();
    params.set("orgId", query.orgId);
    params.set("repoId", query.repoId);
    if (query.types) params.set("types", query.types.join(","));
    if (query.status) params.set("status", query.status.join(","));
    if (query.tags) params.set("tags", query.tags.join(","));
    if (query.search) params.set("search", query.search);
    params.set("limit", String(query.limit ?? 50));
    params.set("offset", String(query.offset ?? 0));
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortOrder) params.set("sortOrder", query.sortOrder);

    const res = await fetch(`${remoteUrl}/v1/memories?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return { memories: [], total: 0 };
    const data = await res.json();
    return {
      memories: data.memories ?? [],
      total: data.total ?? data.memories?.length ?? 0,
    };
  } catch {
    return { memories: [], total: 0 };
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Hippocampus not initialized" },
      { status: 500 },
    );
  }

  const source = params.get("source") ?? "local";
  const search = params.get("search") ?? undefined;
  const types = params.get("types")?.split(",").filter(Boolean) as
    | ListQuery["types"]
    | undefined;
  const status = params.get("status")?.split(",").filter(Boolean) as
    | ListQuery["status"]
    | undefined;
  const tags = params.get("tags")?.split(",").filter(Boolean) ?? undefined;
  const limit = parseInt(params.get("limit") ?? "50", 10);
  const offset = parseInt(params.get("offset") ?? "0", 10);
  const sortBy =
    (params.get("sortBy") as ListQuery["sortBy"]) ?? "createdAt";
  const sortOrder =
    (params.get("sortOrder") as ListQuery["sortOrder"]) ?? "desc";

  const query: ListQuery = {
    orgId: config.remote.orgId,
    repoId: config.remote.repoId,
    types,
    status,
    tags,
    search,
    limit,
    offset,
    sortBy,
    sortOrder,
  };

  let memories: (Memory & { source: "local" | "remote" })[] = [];
  let total = 0;

  if (source === "local" || source === "both") {
    const local = getLocalStore();
    if (local) {
      const localMemories = local.list(query);
      const localCount = local.count(query);
      memories.push(
        ...localMemories.map((m) => ({ ...m, source: "local" as const })),
      );
      total += localCount;
    }
  }

  if ((source === "remote" || source === "both") && config.remote.url) {
    const remoteData = await fetchRemoteMemories(config.remote.url, query);
    memories.push(
      ...remoteData.memories.map((m) => ({
        ...m,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
        source: "remote" as const,
      })),
    );
    total += remoteData.total;
  }

  if (source === "both") {
    memories.sort((a, b) => {
      const aVal =
        sortBy === "confidence"
          ? (a.confidence ?? 0)
          : new Date(a[sortBy ?? "createdAt"]).getTime();
      const bVal =
        sortBy === "confidence"
          ? (b.confidence ?? 0)
          : new Date(b[sortBy ?? "createdAt"]).getTime();
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    memories = memories.slice(offset, offset + limit);
  }

  return NextResponse.json({ memories, total });
}

export async function POST(request: NextRequest) {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Hippocampus not initialized" },
      { status: 500 },
    );
  }

  const body = await request.json();

  const input = {
    orgId: config.remote.orgId,
    repoId: config.remote.repoId,
    memoryType: body.memoryType ?? "episodic",
    text: body.text,
    summary: body.summary,
    tags: body.tags ?? [],
    sourceRefs: body.sourceRefs,
    confidence: body.confidence,
    visibility: body.visibility ?? "auto",
  };

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 },
    );
  }
  const memory = local.store(input);
  return NextResponse.json({ memory, source: "local" }, { status: 201 });
}

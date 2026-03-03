import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";
import type { Memory } from "@/lib/types";

interface TimelineEvent {
  id: string;
  type: "created" | "deprecated" | "superseded";
  memory: Memory & { source: "local" | "remote" };
  relatedMemoryId?: string;
  date: string;
}

interface TimelineGroup {
  date: string;
  events: TimelineEvent[];
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Hippocampus not initialized" },
      { status: 500 }
    );
  }

  const limit = parseInt(params.get("limit") ?? "100", 10);
  const offset = parseInt(params.get("offset") ?? "0", 10);
  const source = params.get("source") ?? "local";

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 }
    );
  }

  const totalMemories = local.count({
    orgId: config.remote.orgId,
    repoId: config.remote.repoId,
  });

  const memories = local.list({
    orgId: config.remote.orgId,
    repoId: config.remote.repoId,
    limit: 10000,
    offset: 0,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const events: TimelineEvent[] = [];

  for (const memory of memories) {
    events.push({
      id: `${memory.id}-created`,
      type: "created",
      memory: { ...memory, source: source as "local" | "remote" },
      date: memory.createdAt.toISOString(),
    });

    if (memory.status === "deprecated") {
      events.push({
        id: `${memory.id}-deprecated`,
        type: "deprecated",
        memory: { ...memory, source: source as "local" | "remote" },
        date: memory.updatedAt.toISOString(),
      });
    }

    if (memory.status === "superseded" && memory.supersedesId) {
      events.push({
        id: `${memory.id}-superseded`,
        type: "superseded",
        memory: { ...memory, source: source as "local" | "remote" },
        relatedMemoryId: memory.supersedesId,
        date: memory.updatedAt.toISOString(),
      });
    }
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalEvents = events.length;
  const paginatedEvents = events.slice(offset, offset + limit);

  const groupedByDate: Record<string, TimelineEvent[]> = {};
  for (const event of paginatedEvents) {
    const dateKey = new Date(event.date).toISOString().split("T")[0];
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(event);
  }

  const groups: TimelineGroup[] = Object.entries(groupedByDate)
    .map(([date, events]) => ({ date, events }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    groups,
    total: totalEvents,
    totalMemories,
    hasMore: offset + limit < totalEvents,
  });
}

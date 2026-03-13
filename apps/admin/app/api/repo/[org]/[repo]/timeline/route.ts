import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api-proxy";

interface Memory {
  id: string;
  memoryType: string;
  text: string;
  status: string;
  supersedesId?: string;
  createdAt: string;
  updatedAt: string;
}

interface TimelineEvent {
  id: string;
  type: "created" | "deprecated" | "superseded";
  memory: Memory;
  relatedMemoryId?: string;
  date: string;
}

interface TimelineGroup {
  date: string;
  events: TimelineEvent[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; repo: string }> }
) {
  const { org, repo } = await params;
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing Authorization header" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "100", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  try {
    const memoriesRes = await fetch(
      `${getApiUrl()}/v1/admin/repos/${org}/${repo}/memories?limit=1000&offset=0`,
      { headers: { Authorization: authHeader } }
    );

    if (!memoriesRes.ok) {
      const error = await memoriesRes.json();
      return NextResponse.json(error, { status: memoriesRes.status });
    }

    const { memories } = await memoriesRes.json();
    const events: TimelineEvent[] = [];

    for (const memory of memories) {
      events.push({
        id: `${memory.id}-created`,
        type: "created",
        memory,
        date: memory.createdAt,
      });

      if (memory.status === "deprecated") {
        events.push({
          id: `${memory.id}-deprecated`,
          type: "deprecated",
          memory,
          date: memory.updatedAt,
        });
      }

      if (memory.status === "superseded" && memory.supersedesId) {
        events.push({
          id: `${memory.id}-superseded`,
          type: "superseded",
          memory,
          relatedMemoryId: memory.supersedesId,
          date: memory.updatedAt,
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
      totalMemories: memories.length,
      hasMore: offset + limit < totalEvents,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error", message: String(error) },
      { status: 500 }
    );
  }
}

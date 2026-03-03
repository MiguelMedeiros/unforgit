import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

async function fetchRemoteMemory(remoteUrl: string, id: string) {
  try {
    const res = await fetch(`${remoteUrl}/v1/memory/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.memory ?? data;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const source = request.nextUrl.searchParams.get("source");
  const config = getConfig();

  if (source !== "remote") {
    const local = getLocalStore();
    if (local) {
      const memory = local.getById(id);
      if (memory) {
        return NextResponse.json({ memory, source: "local" });
      }
    }
  }

  if (config?.remote.url) {
    const memory = await fetchRemoteMemory(config.remote.url, id);
    if (memory) {
      return NextResponse.json({ memory, source: "remote" });
    }
  }

  return NextResponse.json({ error: "Memory not found" }, { status: 404 });
}

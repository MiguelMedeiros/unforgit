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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const hardDelete = body.hardDelete === true;
  const deletedBy = body.deletedBy as string | undefined;

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 }
    );
  }

  let success: boolean;
  if (hardDelete) {
    success = local.hardDelete(id);
  } else {
    success = local.softDelete({ id, deletedBy });
  }

  if (!success) {
    return NextResponse.json({ error: "Memory not found" }, { status: 404 });
  }

  const action = hardDelete ? "hard_deleted" : "soft_deleted";
  return NextResponse.json({ success: true, action });
}


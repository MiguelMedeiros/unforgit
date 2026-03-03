import { NextRequest, NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 }
    );
  }

  const success = local.restore(id);

  if (!success) {
    return NextResponse.json(
      { error: "Memory not found or not deleted" },
      { status: 404 }
    );
  }

  const config = getConfig();
  if (config?.remote.url) {
    try {
      await fetch(`${config.remote.url}/v1/memory/${id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Ignore remote errors, local restore was successful
    }
  }

  return NextResponse.json({ success: true });
}

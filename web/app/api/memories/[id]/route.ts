import { NextRequest, NextResponse } from "next/server";
import { getLocalStore } from "@/lib/stores";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const local = getLocalStore();
  if (local) {
    const memory = local.getById(id);
    if (memory) {
      return NextResponse.json({ memory, source: "local" });
    }
  }

  return NextResponse.json({ error: "Memory not found" }, { status: 404 });
}

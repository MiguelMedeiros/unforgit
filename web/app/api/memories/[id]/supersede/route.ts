import { NextRequest, NextResponse } from "next/server";
import { getLocalStore } from "@/lib/stores";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const newId = body.newId as string;

  if (!newId) {
    return NextResponse.json(
      { error: "newId is required" },
      { status: 400 },
    );
  }

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 },
    );
  }
  const ok = local.supersede(id, newId);
  if (!ok)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

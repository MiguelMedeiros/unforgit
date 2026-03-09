import { NextRequest, NextResponse } from "next/server";
import { getLocalStore } from "@/lib/stores";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = body.reason as string | undefined;

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 503 },
    );
  }
  const ok = local.deprecate(id, reason);
  if (!ok)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

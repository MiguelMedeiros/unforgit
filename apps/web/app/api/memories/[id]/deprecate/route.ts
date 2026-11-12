import { NextRequest, NextResponse } from "next/server";
import { getLocalStore } from "@/lib/stores";
import { isPlainObject } from "../../../../../lib/memory-input";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rawBody: unknown = await request.json().catch(() => ({}));
  const body = isPlainObject(rawBody) ? rawBody : {};
  if (body.reason != null && typeof body.reason !== "string") {
    return NextResponse.json({ error: "reason must be a string" }, { status: 400 });
  }
  const reason = (body.reason as string | null | undefined) ?? undefined;

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

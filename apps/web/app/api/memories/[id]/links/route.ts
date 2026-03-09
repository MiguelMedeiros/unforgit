import { NextRequest, NextResponse } from "next/server";
import { getLocalStore } from "@/lib/stores";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const linkType =
    request.nextUrl.searchParams.get("linkType") ?? undefined;

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Store not available" },
      { status: 503 },
    );
  }

  const linked = local.getLinkedMemories(id, linkType);

  return NextResponse.json({ linked });
}

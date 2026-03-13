import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.UNFORGIT_API_URL || "http://localhost:3737";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; repo: string }> }
) {
  const { org, repo } = await params;
  const body = await request.json();
  const { sourceIds, model } = body;

  if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length < 2) {
    return NextResponse.json(
      { error: "sourceIds must be an array with at least 2 IDs" },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing Authorization header" },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(`${API_URL}/v1/admin/repos/${org}/${repo}/consolidation/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        sourceIds,
        model,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(error, { status: res.status });
    }

    const data = await res.json();

    return NextResponse.json({
      consolidatedId: data.consolidatedId,
      generatedText: data.generatedText,
      sourceIds: data.sourceIds,
      suggestedTags: data.suggestedTags,
      memoryType: data.memoryType,
    });
  } catch (error) {
    console.error("Failed to execute consolidation:", error);
    return NextResponse.json(
      { error: "Failed to execute consolidation" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.UNFORGIT_API_URL || "http://localhost:3737";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; repo: string }> }
) {
  const { org, repo } = await params;

  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing Authorization header" },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(`${API_URL}/v1/admin/repos/${org}/${repo}/consolidation/history`, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(error, { status: res.status });
    }

    const data = await res.json();

    return NextResponse.json({
      consolidations: data.consolidations,
    });
  } catch (error) {
    console.error("Failed to fetch consolidation history:", error);
    return NextResponse.json(
      { error: "Failed to fetch consolidation history" },
      { status: 500 }
    );
  }
}

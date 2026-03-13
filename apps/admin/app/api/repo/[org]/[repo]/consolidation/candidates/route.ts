import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.UNFORGIT_API_URL || "http://localhost:3737";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; repo: string }> }
) {
  const { org, repo } = await params;
  const searchParams = request.nextUrl.searchParams;
  
  const threshold = searchParams.get("threshold") || "0.6";
  const maxGroups = searchParams.get("maxGroups") || "10";

  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing Authorization header" },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(`${API_URL}/v1/admin/repos/${org}/${repo}/consolidation/candidates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        threshold: parseFloat(threshold),
        maxGroups: parseInt(maxGroups, 10),
        minGroupSize: 2,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(error, { status: res.status });
    }

    const data = await res.json();
    
    return NextResponse.json({
      candidates: data.candidates,
      totalMemoriesScanned: data.totalMemoriesScanned,
      totalCandidateGroups: data.totalCandidateGroups,
    });
  } catch (error) {
    console.error("Failed to fetch consolidation candidates:", error);
    return NextResponse.json(
      { error: "Failed to fetch consolidation candidates" },
      { status: 500 }
    );
  }
}

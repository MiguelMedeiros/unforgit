import { NextRequest, NextResponse } from "next/server";
import { parseDecimalQuery, parseIntegerQuery } from "../../../../../../../lib/query-params";

const API_URL = process.env.API_URL || process.env.UNFORGIT_API_URL || "http://localhost:3737";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; repo: string }> }
) {
  const { org, repo } = await params;
  const searchParams = request.nextUrl.searchParams;
  

  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing Authorization header" },
      { status: 401 }
    );
  }

  const threshold = parseDecimalQuery(searchParams, "threshold", { fallback: 0.6, min: 0, max: 1 });
  if (threshold instanceof NextResponse) return threshold;
  const maxGroups = parseIntegerQuery(searchParams, "maxGroups", { fallback: 10, min: 1, max: 100 });
  if (maxGroups instanceof NextResponse) return maxGroups;
  const offset = parseIntegerQuery(searchParams, "offset", { fallback: 0, min: 0 });
  if (offset instanceof NextResponse) return offset;

  try {
    const res = await fetch(`${API_URL}/v1/admin/repos/${encodeURIComponent(org)}/${encodeURIComponent(repo)}/consolidation/candidates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        threshold,
        maxGroups,
        minGroupSize: 2,
        offset,
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

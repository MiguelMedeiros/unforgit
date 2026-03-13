import { NextRequest, NextResponse } from "next/server";
import { proxyGet } from "@/lib/api-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; repo: string }> }
) {
  const { org, repo } = await params;
  
  try {
    const [memoriesRes, linksRes] = await Promise.all([
      proxyGet(request, `/v1/admin/repos/${org}/${repo}/memories?limit=1000&offset=0`),
      proxyGet(request, `/v1/admin/repos/${org}/${repo}/links`),
    ]);

    const memoriesData = await memoriesRes.json();
    const linksData = await linksRes.json();

    return NextResponse.json({
      memories: memoriesData.memories ?? [],
      links: linksData.links ?? [],
    });
  } catch (error) {
    console.error("Failed to fetch graph data:", error);
    return NextResponse.json(
      { error: "Failed to fetch graph data" },
      { status: 500 }
    );
  }
}

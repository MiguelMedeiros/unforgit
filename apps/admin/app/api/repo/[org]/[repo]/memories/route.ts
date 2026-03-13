import { NextRequest } from "next/server";
import { proxyGet } from "@/lib/api-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; repo: string }> }
) {
  const { org, repo } = await params;
  return proxyGet(request, `/v1/admin/repos/${org}/${repo}/memories`);
}

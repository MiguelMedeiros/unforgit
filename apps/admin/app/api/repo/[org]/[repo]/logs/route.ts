import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.UNFORGIT_API_URL || "http://localhost:3737";

function decodeJwtPayload(token: string): { isAdmin?: boolean; role?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return payload;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; repo: string }> }
) {
  const { org, repo } = await params;
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const payload = decodeJwtPayload(token);
  const isAdmin = payload?.isAdmin === true || payload?.role === "admin";

  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  
  const endpoint = isAdmin 
    ? `/v1/admin/logs/repo/${org}/${repo}` 
    : `/v1/auth/me/logs/repo/${org}/${repo}`;
  const url = queryString ? `${API_URL}${endpoint}?${queryString}` : `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      Authorization: authHeader,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json(data);
}

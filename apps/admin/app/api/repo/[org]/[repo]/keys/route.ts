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
    const res = await fetch(`${API_URL}/v1/admin/api-keys`, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(error, { status: res.status });
    }

    const data = await res.json();
    
    const filteredKeys = (data.keys || []).filter((key: { orgId: string }) => 
      key.orgId === org
    );

    return NextResponse.json({ keys: filteredKeys });
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; repo: string }> }
) {
  const { org, repo } = await params;
  const authHeader = request.headers.get("Authorization");
  const body = await request.json();

  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing Authorization header" },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(`${API_URL}/v1/admin/api-keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        name: `${org}/${repo}`,
        orgId: org,
        repoId: repo,
        ...body,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json(error, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Failed to create API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

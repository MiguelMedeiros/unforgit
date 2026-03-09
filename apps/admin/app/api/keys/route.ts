import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:3737";

function forwardHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const auth = request.headers.get("Authorization");
  if (auth) headers["Authorization"] = auth;
  return headers;
}

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${API_URL}/v1/admin/api-keys`, {
      headers: forwardHeaders(request),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Service Unavailable", message: "Cannot reach API server" },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${API_URL}/v1/admin/api-keys`, {
      method: "POST",
      headers: forwardHeaders(request),
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Service Unavailable", message: "Cannot reach API server" },
      { status: 503 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:3737";

function authHeader(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const auth = request.headers.get("Authorization");
  if (auth) headers["Authorization"] = auth;
  return headers;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const res = await fetch(`${API_URL}/v1/admin/api-keys/${id}`, {
      method: "PATCH",
      headers: authHeader(request),
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const res = await fetch(`${API_URL}/v1/admin/api-keys/${id}`, {
      method: "DELETE",
      headers: authHeader(request),
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

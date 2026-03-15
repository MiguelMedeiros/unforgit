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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = decodeJwtPayload(token);
    const isAdmin = payload?.isAdmin === true || payload?.role === "admin";

    const endpoint = isAdmin ? "/v1/admin/api-keys" : "/v1/auth/me/keys";

    const res = await fetch(`${API_URL}${endpoint}`, {
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
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = decodeJwtPayload(token);
    const isAdmin = payload?.isAdmin === true || payload?.role === "admin";

    const body = await request.json();
    const endpoint = isAdmin ? "/v1/admin/api-keys" : "/v1/auth/me/keys";

    const res = await fetch(`${API_URL}${endpoint}`, {
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

import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.UNFORGIT_API_URL || "http://localhost:3737";

export function getApiUrl() {
  return API_URL;
}

export async function proxyGet(
  request: NextRequest,
  endpoint: string,
  extraParams?: Record<string, string>
): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing Authorization header" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const params = new URLSearchParams(url.searchParams);
  
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      params.set(key, value);
    }
  }

  const queryString = params.toString();
  const fullUrl = `${API_URL}${endpoint}${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await fetch(fullUrl, {
      headers: {
        Authorization: authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error", message: String(error) },
      { status: 500 }
    );
  }
}

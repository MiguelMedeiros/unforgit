import { NextResponse, type NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originMatchesHost(origin: string, host: string | null): boolean {
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

function isCrossSiteMutation(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return true;
  }

  const origin = request.headers.get("origin");
  if (origin === null) return false;

  const host = request.headers.get("host") ?? request.nextUrl.host;
  return !originMatchesHost(origin, host);
}

/**
 * The local dashboard API has no authentication: it trusts that only the
 * dashboard UI can reach it. Browsers still let any website send "simple"
 * cross-site POST/DELETE requests (e.g. text/plain bodies skip CORS preflight),
 * so reject state-changing API calls that a browser marks as cross-origin.
 * Non-browser clients (curl, scripts) send neither header and are unaffected.
 */
export function proxy(request: NextRequest): NextResponse | undefined {
  if (isCrossSiteMutation(request)) {
    return NextResponse.json(
      { error: "Cross-site requests are not allowed" },
      { status: 403 },
    );
  }
  return undefined;
}

export const config = {
  matcher: ["/api/:path*"],
};

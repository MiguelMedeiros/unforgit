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

const LOOPBACK_HOSTNAMES = new Set(["localhost", "[::1]"]);
const IPV4_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/;

function parseHostname(host: string | null): string | null {
  if (!host) return null;
  try {
    return new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function configuredAllowedHosts(): Set<string> {
  const raw = process.env.UNFORGIT_DASHBOARD_ALLOWED_HOSTS ?? "";
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * DNS rebinding: a malicious site can point its own hostname at 127.0.0.1 or
 * a Tailscale/LAN IP, making requests look same-origin to the browser. Such
 * requests carry the attacker's hostname in Host, so only accept IP literals,
 * loopback names, and explicitly configured hostnames.
 */
function isAllowedHost(request: NextRequest): boolean {
  const hostname = parseHostname(request.headers.get("host") ?? request.nextUrl.host);
  if (!hostname) return false;
  if (LOOPBACK_HOSTNAMES.has(hostname)) return true;
  if (IPV4_LITERAL.test(hostname)) return true;
  if (hostname.startsWith("[") && hostname.endsWith("]")) return true;
  return configuredAllowedHosts().has(hostname);
}

/**
 * The local dashboard API has no authentication: it trusts that only the
 * dashboard UI can reach it. Browsers still let any website send "simple"
 * cross-site POST/DELETE requests (e.g. text/plain bodies skip CORS preflight),
 * so reject state-changing API calls that a browser marks as cross-origin.
 * Non-browser clients (curl, scripts) send neither header and are unaffected.
 */
export function proxy(request: NextRequest): NextResponse | undefined {
  if (!isAllowedHost(request)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }
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

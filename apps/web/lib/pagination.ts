import { NextResponse } from "next/server";

export interface Pagination {
  limit: number;
  offset: number;
}

function parseIntegerParam(
  value: string | null,
  fallback: number,
  minimum: number,
): number | undefined {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return undefined;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : undefined;
}

/**
 * Parse `limit`/`offset` query params. Returns a 400 response instead of
 * letting NaN/negative/fractional values reach SQLite (which throws
 * "datatype mismatch") or array slicing (which silently misbehaves).
 */
export function parsePagination(
  params: URLSearchParams,
  defaultLimit: number,
): Pagination | NextResponse {
  const limit = parseIntegerParam(params.get("limit"), defaultLimit, 1);
  if (limit === undefined) {
    return NextResponse.json(
      { error: "limit must be a positive integer" },
      { status: 400 },
    );
  }

  const offset = parseIntegerParam(params.get("offset"), 0, 0);
  if (offset === undefined) {
    return NextResponse.json(
      { error: "offset must be a non-negative integer" },
      { status: 400 },
    );
  }

  return { limit, offset };
}

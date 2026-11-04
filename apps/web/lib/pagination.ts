import { NextResponse } from "next/server";

export interface Pagination {
  limit: number;
  offset: number;
}

function parseIntegerParam(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number = Number.MAX_SAFE_INTEGER,
): number | undefined {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return undefined;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : undefined;
}

function invalidParam(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export interface IntegerQueryOptions {
  fallback: number;
  min: number;
  max?: number;
}

/**
 * Parse an integer query param. Returns a 400 response instead of letting
 * NaN/negative/fractional/out-of-range values reach SQLite ("datatype
 * mismatch"), Date math ("Invalid time value"), or array slicing.
 */
export function parseIntegerQuery(
  params: URLSearchParams,
  name: string,
  options: IntegerQueryOptions,
): number | NextResponse {
  const parsed = parseIntegerParam(params.get(name), options.fallback, options.min, options.max);
  if (parsed !== undefined) return parsed;

  const range =
    options.max === undefined
      ? `>= ${options.min}`
      : `from ${options.min} to ${options.max}`;
  return invalidParam(`${name} must be an integer ${range}`);
}

/** Parse a plain decimal query param within an inclusive [min, max] range. */
export function parseDecimalQuery(
  params: URLSearchParams,
  name: string,
  options: { fallback: number; min: number; max: number },
): number | NextResponse {
  const value = params.get(name);
  if (value === null) return options.fallback;

  if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= options.min && parsed <= options.max) {
      return parsed;
    }
  }

  return invalidParam(`${name} must be a number from ${options.min} to ${options.max}`);
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
    return invalidParam("limit must be a positive integer");
  }

  const offset = parseIntegerParam(params.get("offset"), 0, 0);
  if (offset === undefined) {
    return invalidParam("offset must be a non-negative integer");
  }

  return { limit, offset };
}

import { NextResponse } from "next/server";

function invalidParam(message: string): NextResponse {
  return NextResponse.json({ error: "Bad Request", message }, { status: 400 });
}

/**
 * Parse a non-negative integer query param within an inclusive range.
 * Returns a 400 response instead of letting NaN/negative/fractional values
 * reach array slicing or upstream API calls.
 */
export function parseIntegerQuery(
  params: URLSearchParams,
  name: string,
  options: { fallback: number; min: number; max?: number },
): number | NextResponse {
  const value = params.get(name);
  if (value === null) return options.fallback;

  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  if (/^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed >= options.min && parsed <= max) {
      return parsed;
    }
  }

  const range =
    options.max === undefined ? `>= ${options.min}` : `from ${options.min} to ${options.max}`;
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

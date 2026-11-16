/**
 * Headers for dashboard calls to the configured remote Unforgit API.
 * The remote API requires a Bearer API key on every /v1 route, so every
 * dashboard proxy must attach UNFORGIT_API_KEY when it is configured.
 */
export function getRemoteHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const apiKey = process.env.UNFORGIT_API_KEY;
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

/**
 * Upper bound for dashboard proxy calls to the remote API so a stalled
 * remote cannot hang dashboard routes indefinitely.
 */
export const REMOTE_REQUEST_TIMEOUT_MS = 10_000;

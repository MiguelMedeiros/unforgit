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

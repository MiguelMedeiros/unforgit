export function getOAuthTokenFromHash(hash: string): string | null {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(fragment).get("token");
}

export function urlWithoutHash(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

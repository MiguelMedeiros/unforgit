export function isMobileMenuOpen(
  openedPath: string | null,
  currentPath: string,
): boolean {
  return openedPath === currentPath;
}

export function toggleMobileMenuPath(
  openedPath: string | null,
  currentPath: string,
): string | null {
  return isMobileMenuOpen(openedPath, currentPath) ? null : currentPath;
}

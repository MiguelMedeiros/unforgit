export function resolveDocsHash(
  hash: string,
  sectionIds: readonly string[],
): string | null {
  const sectionId = hash.startsWith("#") ? hash.slice(1) : hash;
  return sectionId && sectionIds.includes(sectionId) ? sectionId : null;
}

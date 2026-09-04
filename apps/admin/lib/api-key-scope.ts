interface RepositoryApiKey {
  orgId: string;
  repoId: string | null;
}

export function buildRepositoryApiKeyPayload(
  orgId: string,
  repoId: string,
  label?: string,
): { name: string; orgId: string; repoId: string; label?: string } {
  return {
    name: `${orgId}/${repoId}`,
    orgId,
    repoId,
    label,
  };
}

export function filterRepositoryApiKeys<T extends RepositoryApiKey>(
  keys: T[],
  orgId: string,
  repoId: string,
): T[] {
  const normalizedOrgId = orgId.toLowerCase();
  const normalizedRepoId = repoId.toLowerCase();

  return keys.filter(
    (key) =>
      key.orgId.toLowerCase() === normalizedOrgId &&
      key.repoId?.toLowerCase() === normalizedRepoId,
  );
}
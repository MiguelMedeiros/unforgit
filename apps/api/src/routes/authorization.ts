import type { FastifyRequest } from "fastify";
import type { Memory } from "unforgit-shared";

export function hasRepositoryAccess(
  apiKey: FastifyRequest["apiKey"],
  orgId: string,
  repoId: string,
): boolean {
  return (
    apiKey?.orgId.toLowerCase() === orgId.toLowerCase() &&
    (apiKey.repoId === null ||
      apiKey.repoId.toLowerCase() === repoId.toLowerCase())
  );
}

export function hasMemoryAccess(
  apiKey: FastifyRequest["apiKey"],
  memory: Pick<Memory, "orgId" | "repoId">,
): boolean {
  return hasRepositoryAccess(apiKey, memory.orgId, memory.repoId);
}
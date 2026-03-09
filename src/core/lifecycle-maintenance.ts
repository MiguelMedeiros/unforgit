import { findConsolidationCandidates, executeConsolidation } from "./auto-consolidate.js";
import {
  executeConsolidationRemote,
  findConsolidationCandidatesRemote,
  type ConsolidationCandidate,
  type ExecuteConsolidationResult,
} from "./auto-consolidate-remote.js";
import { resolveLifecycleConfig, isMemoryExpired } from "./lifecycle.js";
import { isOpenAIConfigured } from "./embeddings.js";
import type { LifecycleConfig, Memory } from "./types.js";
import type { LocalStore } from "../db/local.js";
import type { RemoteStore } from "../db/remote.js";

export interface StrengthenedMemoryCandidate {
  id: string;
  usageCount: number;
  lastUsed?: Date;
  recommendedAction: "promote" | "pin";
  reason: string;
  textPreview: string;
}

export interface ExpiringMemoryCandidate {
  id: string;
  ttlSeconds: number;
  reason: string;
  textPreview: string;
}

export interface LifecycleMaintenanceResult {
  dryRun: boolean;
  totalActiveMemories: number;
  expiredCandidates: ExpiringMemoryCandidate[];
  expiredCount: number;
  strengthenedCandidates: StrengthenedMemoryCandidate[];
  consolidationCandidates: ConsolidationCandidate[];
  executedConsolidations: ExecuteConsolidationResult[];
  warnings: string[];
  errors: string[];
}

export interface LifecycleMaintenanceOptions {
  dryRun?: boolean;
  model?: string;
  preserveOriginals?: boolean;
  lifecycle?: LifecycleConfig;
}

function preview(text: string): string {
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function getExpiringCandidates(
  memories: Memory[],
): ExpiringMemoryCandidate[] {
  return memories
    .filter(
      (memory) =>
        memory.memoryType === "episodic" &&
        memory.status === "active" &&
        memory.ttlSeconds !== undefined &&
        isMemoryExpired(memory),
    )
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((memory) => ({
      id: memory.id,
      ttlSeconds: memory.ttlSeconds!,
      reason: `Expired after ${memory.ttlSeconds} seconds without consolidation`,
      textPreview: preview(memory.text),
    }));
}

function getStrengthenedCandidates(
  memories: Memory[],
  usageStats: Array<{ memoryId: string; count: number; lastUsed: Date }>,
  lifecycle?: LifecycleConfig,
): StrengthenedMemoryCandidate[] {
  const config = resolveLifecycleConfig(lifecycle);
  const usageMap = new Map(usageStats.map((stat) => [stat.memoryId, stat]));

  return memories
    .filter((memory) => memory.memoryType === "episodic" && memory.status === "active")
    .map((memory): StrengthenedMemoryCandidate | undefined => {
      const usage = usageMap.get(memory.id);
      if (!usage || usage.count < config.maintenance.promoteRecallCount) {
        return undefined;
      }

      const isPinned = memory.tags.includes("pinned");
      const recommendedAction =
        usage.count >= config.maintenance.pinRecallCount && !isPinned
          ? "pin"
          : "promote";

      return {
        id: memory.id,
        usageCount: usage.count,
        lastUsed: usage.lastUsed,
        recommendedAction,
        reason:
          recommendedAction === "pin"
            ? `Frequently reused episodic memory (${usage.count} recalls); consider pinning it`
            : `Frequently reused episodic memory (${usage.count} recalls); consider promoting it`,
        textPreview: preview(memory.text),
      } satisfies StrengthenedMemoryCandidate;
    })
    .filter((candidate): candidate is StrengthenedMemoryCandidate => candidate !== undefined)
    .sort((a, b) => b.usageCount - a.usageCount);
}

export async function runLocalLifecycleMaintenance(
  store: LocalStore,
  orgId: string,
  repoId: string,
  options: LifecycleMaintenanceOptions = {},
): Promise<LifecycleMaintenanceResult> {
  const lifecycle = resolveLifecycleConfig(options.lifecycle);
  const dryRun = options.dryRun ?? lifecycle.maintenance.dryRunDefault;
  const activeMemories = store.list({
    orgId,
    repoId,
    status: ["active"],
    includeExpired: true,
    limit: 1000,
  });
  const usageStats = store.getUsageStats(orgId, repoId);
  const expiredCandidates = getExpiringCandidates(activeMemories);
  const strengthenedCandidates = getStrengthenedCandidates(
    activeMemories.filter((memory) => !isMemoryExpired(memory)),
    usageStats,
    lifecycle,
  );
  const consolidationPreview = findConsolidationCandidates(store, orgId, repoId, {
    threshold: lifecycle.maintenance.consolidationThreshold,
    minGroupSize: lifecycle.maintenance.consolidationMinGroupSize,
    maxGroups: lifecycle.maintenance.consolidationMaxGroups,
    types: ["episodic"],
    excludeConsolidations: true,
  });

  const warnings: string[] = [];
  const errors: string[] = [];
  const executedConsolidations: ExecuteConsolidationResult[] = [];

  if (!dryRun) {
    store.expireExpiredMemories(orgId, repoId);

    if (consolidationPreview.candidates.length > 0) {
      if (!isOpenAIConfigured()) {
        warnings.push(
          "Skipping consolidation execution because OpenAI is not configured.",
        );
      } else {
        for (const candidate of consolidationPreview.candidates) {
          try {
            const result = await executeConsolidation(store, candidate, orgId, repoId, {
              model: options.model,
              preserveOriginals: options.preserveOriginals,
            });
            executedConsolidations.push(result);
          } catch (error) {
            errors.push(
              error instanceof Error ? error.message : String(error),
            );
          }
        }
      }
    }
  }

  return {
    dryRun,
    totalActiveMemories: activeMemories.length,
    expiredCandidates,
    expiredCount: dryRun ? expiredCandidates.length : expiredCandidates.length,
    strengthenedCandidates,
    consolidationCandidates: consolidationPreview.candidates,
    executedConsolidations,
    warnings,
    errors,
  };
}

export async function runRemoteLifecycleMaintenance(
  store: RemoteStore,
  orgId: string,
  repoId: string,
  options: LifecycleMaintenanceOptions = {},
): Promise<LifecycleMaintenanceResult> {
  const lifecycle = resolveLifecycleConfig(options.lifecycle);
  const dryRun = options.dryRun ?? lifecycle.maintenance.dryRunDefault;
  const activeMemories = await store.list({
    orgId,
    repoId,
    status: ["active"],
    includeExpired: true,
    limit: 1000,
  });
  const usageStats = await store.getUsageStats(orgId, repoId);
  const expiredCandidates = getExpiringCandidates(activeMemories);
  const strengthenedCandidates = getStrengthenedCandidates(
    activeMemories.filter((memory) => !isMemoryExpired(memory)),
    usageStats,
    lifecycle,
  );
  const consolidationPreview = await findConsolidationCandidatesRemote(
    store,
    orgId,
    repoId,
    {
      threshold: lifecycle.maintenance.consolidationThreshold,
      minGroupSize: lifecycle.maintenance.consolidationMinGroupSize,
      maxGroups: lifecycle.maintenance.consolidationMaxGroups,
      types: ["episodic"],
      excludeConsolidations: true,
    },
  );

  const warnings: string[] = [];
  const errors: string[] = [];
  const executedConsolidations: ExecuteConsolidationResult[] = [];

  if (!dryRun) {
    await store.expireExpiredMemories(orgId, repoId);

    if (consolidationPreview.candidates.length > 0) {
      if (!isOpenAIConfigured()) {
        warnings.push(
          "Skipping consolidation execution because OpenAI is not configured.",
        );
      } else {
        for (const candidate of consolidationPreview.candidates) {
          try {
            const result = await executeConsolidationRemote(
              store,
              candidate,
              orgId,
              repoId,
              {
                model: options.model,
                preserveOriginals: options.preserveOriginals,
              },
            );
            executedConsolidations.push(result);
          } catch (error) {
            errors.push(
              error instanceof Error ? error.message : String(error),
            );
          }
        }
      }
    }
  }

  return {
    dryRun,
    totalActiveMemories: activeMemories.length,
    expiredCandidates,
    expiredCount: dryRun ? expiredCandidates.length : expiredCandidates.length,
    strengthenedCandidates,
    consolidationCandidates: consolidationPreview.candidates,
    executedConsolidations,
    warnings,
    errors,
  };
}

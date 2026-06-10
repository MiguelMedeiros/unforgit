import type {
  CreateMemoryInput,
  LifecycleConfig,
  LifecycleMaintenanceConfig,
  LifecycleUsageBoostConfig,
  LifecycleTtlConfig,
  Memory,
  MemoryType,
} from "unforgit-shared";

export interface ResolvedLifecycleConfig {
  ttlSecondsByType: LifecycleTtlConfig;
  usageBoost: LifecycleUsageBoostConfig;
  maintenance: LifecycleMaintenanceConfig;
}

const DEFAULT_TTL_SECONDS_BY_TYPE: LifecycleTtlConfig = {
  episodic: 30 * 24 * 60 * 60,
  semantic: undefined,
  procedural: undefined,
};

const DEFAULT_USAGE_BOOST: LifecycleUsageBoostConfig = {
  enabled: true,
  topKToRecord: 5,
  minUsageCount: 2,
  maxBoost: 0.15,
  halfLifeDays: 30,
};

const DEFAULT_MAINTENANCE: LifecycleMaintenanceConfig = {
  staleEpisodicDays: 30,
  consolidationThreshold: 0.5,
  consolidationMinGroupSize: 2,
  consolidationMaxGroups: 5,
  promoteRecallCount: 5,
  pinRecallCount: 8,
  dryRunDefault: true,
  autoRunOnStore: true,
  autoRunOnRecall: true,
  debounceMs: 30_000,
};

export function resolveLifecycleConfig(
  config?: LifecycleConfig,
): ResolvedLifecycleConfig {
  return {
    ttlSecondsByType: {
      ...DEFAULT_TTL_SECONDS_BY_TYPE,
      ...(config?.ttlSecondsByType ?? {}),
    },
    usageBoost: {
      ...DEFAULT_USAGE_BOOST,
      ...(config?.usageBoost ?? {}),
    },
    maintenance: {
      ...DEFAULT_MAINTENANCE,
      ...(config?.maintenance ?? {}),
    },
  };
}

export function getDefaultTtlSeconds(
  memoryType: MemoryType,
  lifecycle?: LifecycleConfig,
): number | undefined {
  return resolveLifecycleConfig(lifecycle).ttlSecondsByType[memoryType];
}

export function applyLifecycleDefaults(
  input: CreateMemoryInput,
  lifecycle?: LifecycleConfig,
): CreateMemoryInput {
  if (input.ttlSeconds !== undefined) {
    return input;
  }

  const ttlSeconds = getDefaultTtlSeconds(input.memoryType, lifecycle);
  if (ttlSeconds === undefined) {
    return input;
  }

  return {
    ...input,
    ttlSeconds,
  };
}

export function isExpiredTtl(
  createdAt: Date,
  ttlSeconds?: number,
  now: Date = new Date(),
): boolean {
  if (!ttlSeconds || ttlSeconds <= 0) {
    return false;
  }

  return createdAt.getTime() + ttlSeconds * 1000 <= now.getTime();
}

export function isMemoryExpired(
  memory: Pick<Memory, "createdAt" | "ttlSeconds" | "status">,
  now: Date = new Date(),
): boolean {
  if (memory.status === "deleted") {
    return false;
  }

  return isExpiredTtl(memory.createdAt, memory.ttlSeconds, now);
}

export function computeUsageBoost(
  usageCount: number,
  lastUsed?: Date,
  lifecycle?: LifecycleConfig,
  now: Date = new Date(),
): number {
  const { usageBoost } = resolveLifecycleConfig(lifecycle);

  if (!usageBoost.enabled || usageCount < usageBoost.minUsageCount) {
    return 0;
  }

  const effectiveCount = usageCount - usageBoost.minUsageCount + 1;
  const usageFactor = 1 - Math.exp(-effectiveCount / usageBoost.minUsageCount);

  const ageDays = lastUsed
    ? Math.max(0, (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24))
    : usageBoost.halfLifeDays;
  const recencyFactor = Math.exp(-ageDays / usageBoost.halfLifeDays);

  return Math.min(usageBoost.maxBoost, usageBoost.maxBoost * usageFactor * recencyFactor);
}

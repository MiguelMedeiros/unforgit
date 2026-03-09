import { LocalStore } from "@unforgit/db";
import { RemoteClient } from "@unforgit/config";
import {
  resolveVisibility,
  mergeAndRank,
  applyLifecycleDefaults,
  resolveLifecycleConfig,
  runLocalLifecycleMaintenance,
  LifecycleScheduler,
} from "@unforgit/core";
import type {
  LifecycleConfig,
  MemoryType,
  MemoryLink,
  LinkType,
  Visibility,
  RecallResult,
} from "@unforgit/shared";

export interface ToolConfig {
  localDbPath: string;
  remoteUrl: string;
  orgId: string;
  repoId: string;
  apiKey?: string;
  lifecycle?: LifecycleConfig;
}

export interface RecallParams {
  query: string;
  repo?: string;
  types?: MemoryType[];
  tags?: string[];
  k?: number;
}

export interface StoreParams {
  text: string;
  type: MemoryType;
  repo?: string;
  tags?: string[];
  visibility?: Visibility;
  sourceRefs?: Record<string, unknown>;
}

export interface PromoteParams {
  localId: string;
  to?: "repo";
  sourceRefs?: Record<string, unknown>;
}

export interface ConsolidateParams {
  repo?: string;
  fromPr?: string;
  window?: { from?: Date; to?: Date };
}

export interface LinkParams {
  sourceId: string;
  targetId: string;
  linkType: LinkType;
  metadata?: Record<string, unknown>;
}

export interface GetLinksParams {
  memoryId: string;
  linkType?: LinkType;
}

export function createMemoryTools(config: ToolConfig) {
  const lifecycleConfig = resolveLifecycleConfig(config.lifecycle);
  const localLifecycleScheduler = new LifecycleScheduler(
    async (orgId, repoId) => {
      const store = getLocal();
      try {
        await runLocalLifecycleMaintenance(store, orgId, repoId, {
          dryRun: false,
          preserveOriginals: true,
          lifecycle: config.lifecycle,
        });
      } finally {
        store.close();
      }
    },
    { debounceMs: lifecycleConfig.maintenance.debounceMs },
  );

  function getLocal(): LocalStore {
    return new LocalStore(config.localDbPath);
  }

  function getRemote(): RemoteClient {
    return new RemoteClient(config.remoteUrl, config.apiKey);
  }

  return {
    async recall(params: RecallParams): Promise<RecallResult[]> {
      const k = params.k ?? 10;
      const usageTrackingLimit = lifecycleConfig.usageBoost.topKToRecord;
      const query = {
        orgId: config.orgId,
        repoId: params.repo ?? config.repoId,
        query: params.query,
        types: params.types,
        tags: params.tags,
        k,
      };

      let localResults: RecallResult[] = [];
      let remoteResults: RecallResult[] = [];

      try {
        const store = getLocal();
        localResults = store.recall(query);
        const idsToRecord = localResults
          .slice(0, usageTrackingLimit)
          .map((result) => result.id);
        if (idsToRecord.length > 0) {
          store.recordUsageBatch(idsToRecord, params.query);
        }
        if (lifecycleConfig.maintenance.autoRunOnRecall) {
          localLifecycleScheduler.schedule(query.orgId, query.repoId);
        }
        store.close();
      } catch {
        /* local not available */
      }

      try {
        const client = getRemote();
        const res = await client.recall(query);
        remoteResults = res.results.map((r) => ({
          ...r,
          source: "remote" as const,
        }));
      } catch {
        /* remote not available */
      }

      return mergeAndRank(localResults, remoteResults, k);
    },

    async store(params: StoreParams): Promise<{ id: string; visibility: string; suggestion?: string }> {
      const input = applyLifecycleDefaults({
        orgId: config.orgId,
        repoId: params.repo ?? config.repoId,
        memoryType: params.type,
        text: params.text,
        tags: params.tags,
        sourceRefs: params.sourceRefs,
        visibility: params.visibility ?? ("auto" as Visibility),
      }, config.lifecycle);

      const policy = resolveVisibility(input);

      if (policy.visibility === "repo") {
        try {
          const client = getRemote();
          const result = await client.store({
            ...input,
            visibility: "repo",
          });
          return { id: result.id, visibility: "repo" };
        } catch {
          const store = getLocal();
          const memory = store.store({ ...input, visibility: "private" });
          if (lifecycleConfig.maintenance.autoRunOnStore) {
            localLifecycleScheduler.schedule(input.orgId, input.repoId);
          }
          store.close();
          return {
            id: memory.id,
            visibility: "private",
            suggestion: "promote",
          };
        }
      }

      const store = getLocal();
      const memory = store.store({ ...input, visibility: policy.visibility });
      if (lifecycleConfig.maintenance.autoRunOnStore) {
        localLifecycleScheduler.schedule(input.orgId, input.repoId);
      }
      store.close();

      return {
        id: memory.id,
        visibility: policy.visibility,
        suggestion: policy.suggestion,
      };
    },

    async promote(params: PromoteParams): Promise<{ remoteId: string }> {
      const store = getLocal();
      const memory = store.getById(params.localId);

      if (!memory) {
        store.close();
        throw new Error(`Local memory ${params.localId} not found`);
      }

      const sourceRefs = {
        ...(memory.sourceRefs ?? {}),
        ...(params.sourceRefs ?? {}),
      };

      const client = getRemote();
      const result = await client.store({
        orgId: config.orgId,
        repoId: config.repoId,
        memoryType: memory.memoryType,
        text: memory.text,
        summary: memory.summary,
        tags: memory.tags,
        sourceRefs,
        confidence: memory.confidence,
        visibility: "repo",
      });

      store.updateVisibility(params.localId, "repo");
      store.close();

      return { remoteId: result.id };
    },

    async consolidate(params: ConsolidateParams): Promise<{
      created: string[];
      superseded: string[];
      processedCount: number;
    }> {
      const client = getRemote();
      const body: Record<string, unknown> = {
        orgId: config.orgId,
        repoId: params.repo ?? config.repoId,
      };

      if (params.fromPr) {
        body.source = { prUrl: params.fromPr };
      }
      if (params.window) {
        body.window = params.window;
      }

      return client.consolidate(body);
    },

    async link(params: LinkParams): Promise<MemoryLink> {
      const store = getLocal();
      try {
        return store.link(params);
      } finally {
        store.close();
      }
    },

    async getLinks(params: GetLinksParams): Promise<MemoryLink[]> {
      const store = getLocal();
      try {
        return store.getLinks(params);
      } finally {
        store.close();
      }
    },
  };
}

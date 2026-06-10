import type {
  Memory,
  RecallQuery,
  RecallResult,
  ListQuery,
  CreateMemoryInput,
  ConsolidateMemoriesInput,
  ConsolidateMemoriesResult,
  ReconsolidateInput,
  FindSimilarQuery,
  CreateLinkInput,
  LinkQuery,
  MemoryLink,
  Tombstone,
  SyncStatus,
  CurationSuggestion,
  CreateCurationSuggestionInput,
  ListCurationSuggestionsQuery,
  ReviewCurationSuggestionInput,
} from "./types.js";

export interface UsageStat {
  memoryId: string;
  count: number;
  lastUsed: Date;
}

export interface EmbeddingStats {
  withEmbedding: number;
  withoutEmbedding: number;
  total: number;
}

export interface SyncSummary {
  synced: number;
  pendingPush: number;
  pendingPull: number;
  conflicts: number;
}

export interface ConflictEntry {
  memory: Memory;
  syncState: { localVersion: number; remoteVersion?: number };
}

export interface ILocalStore {
  list(query: ListQuery): Memory[];
  recall(query: RecallQuery): RecallResult[];
  recallWithEmbeddings(query: RecallQuery, queryEmbedding?: number[]): Promise<RecallResult[]>;
  store(input: CreateMemoryInput & { visibility: "private" | "repo" }): Memory;
  getById(id: string): Memory | undefined;
  findSimilar(query: FindSimilarQuery): RecallResult[];
  consolidateMemories(input: ConsolidateMemoriesInput): ConsolidateMemoriesResult;
  reconsolidate(input: ReconsolidateInput): ConsolidateMemoriesResult;
  unconsolidate(consolidationId: string): { restoredIds: string[]; linksRemoved: number; consolidationDeleted: boolean };
  getConsolidatedSources(consolidationId: string): Memory[];
  getConsolidationHistory(memoryId: string): Memory[];
  getUsageStats(orgId: string, repoId: string): UsageStat[];
  recordUsageBatch(ids: string[], query: string): void;
  expireExpiredMemories(orgId: string, repoId: string): number | void;
  link(input: CreateLinkInput): MemoryLink;
  unlink(sourceId: string, targetId: string, linkType: string): boolean;
  getLinks(query: LinkQuery): MemoryLink[];
  hasEmbedding(memoryId: string): boolean;
  getEmbeddingStats(orgId: string, repoId: string): EmbeddingStats;
  getSyncSummary(orgId: string, repoId: string): SyncSummary;
  getUnusedMemories(orgId: string, repoId: string, days: number): Memory[];
  getPendingPush(): Array<{ memory: Memory; syncState: { localVersion: number; remoteVersion?: number } }>;
  getConflicts(): ConflictEntry[];
  setSyncState(state: { memoryId: string; localVersion: number; remoteVersion?: number; syncStatus: SyncStatus }): void;
  getTombstones(orgId: string, repoId: string): Tombstone[];
  createCurationSuggestion(input: CreateCurationSuggestionInput): CurationSuggestion;
  listCurationSuggestions(query: ListCurationSuggestionsQuery): CurationSuggestion[];
  reviewCurationSuggestion(input: ReviewCurationSuggestionInput): CurationSuggestion;
  softDelete(input: { id: string; deletedBy?: string }): boolean;
  hardDelete(id: string): boolean;
  restore(id: string): boolean;
  updateVisibility(id: string, visibility: "private" | "repo"): void;
  close(): void;
}

export interface IRemoteStore {
  list(query: ListQuery): Promise<Memory[]>;
  recall(query: RecallQuery): Promise<RecallResult[]>;
  store(input: CreateMemoryInput & { visibility: "private" | "repo" }): Promise<Memory>;
  getById(id: string): Promise<Memory | null | undefined>;
  findSimilar(query: FindSimilarQuery): Promise<RecallResult[]>;
  consolidateMemories(input: ConsolidateMemoriesInput): Promise<ConsolidateMemoriesResult>;
  getUsageStats(orgId: string, repoId: string): Promise<UsageStat[]>;
  expireExpiredMemories(orgId: string, repoId: string): Promise<number | void>;
  disconnect(): Promise<void>;
}

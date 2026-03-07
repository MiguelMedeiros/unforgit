export type MemoryType = "episodic" | "semantic" | "procedural";
export type Visibility = "private" | "repo" | "auto";
export type Status = "active" | "deprecated" | "superseded" | "deleted";
export type ScopeType = "repo" | "org";
export type ConflictResolution = "local_wins" | "remote_wins" | "last_write_wins" | "manual";

export interface Memory {
  id: string;
  orgId: string;
  repoId: string;
  scopeType: ScopeType;
  memoryType: MemoryType;
  visibility: "private" | "repo";
  status: Status;
  text: string;
  summary?: string;
  tags: string[];
  sourceRefs?: Record<string, unknown>;
  confidence?: number;
  ttlSeconds?: number;
  supersedesId?: string;
  isConsolidation?: boolean;
  consolidationVersion?: number;
  authorId?: string;
  authorName?: string;
  version: number;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMemoryInput {
  id?: string;
  orgId: string;
  repoId: string;
  memoryType: MemoryType;
  text: string;
  summary?: string;
  tags?: string[];
  sourceRefs?: Record<string, unknown>;
  confidence?: number;
  ttlSeconds?: number;
  visibility?: Visibility;
  authorId?: string;
  authorName?: string;
}

export interface RecallQuery {
  orgId: string;
  repoId: string;
  query: string;
  types?: MemoryType[];
  tags?: string[];
  timeRange?: { from?: Date; to?: Date };
  k?: number;
  includeDeprecated?: boolean;
  expandHistory?: boolean;
  includeConsolidatedSources?: boolean;
}

export interface RecallResult {
  id: string;
  memoryType: MemoryType;
  text: string;
  summary?: string;
  tags: string[];
  sourceRefs?: Record<string, unknown>;
  score: number;
  source: "local" | "remote";
  status?: Status;
  supersedesId?: string;
  isConsolidation?: boolean;
  consolidationVersion?: number;
  sourceMemories?: RecallResult[];
}

export interface ConsolidateInput {
  orgId: string;
  repoId: string;
  window?: { from?: Date; to?: Date };
  lastN?: number;
  source?: { prUrl?: string; commitSha?: string };
}

export interface PolicyResult {
  visibility: "private" | "repo";
  suggestion?: "promote";
}

export interface ListQuery {
  orgId: string;
  repoId: string;
  types?: MemoryType[];
  status?: Status[];
  visibility?: ("private" | "repo")[];
  tags?: string[];
  search?: string;
  offset?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "confidence";
  sortOrder?: "asc" | "desc";
}

export interface StoreStats {
  total: number;
  byType: Record<MemoryType, number>;
  byStatus: Record<Status, number>;
  byVisibility: Record<string, number>;
}

export type LinkType =
  | "related_to"
  | "derived_from"
  | "contradicts"
  | "depends_on";

export interface MemoryLink {
  id: string;
  sourceId: string;
  targetId: string;
  linkType: LinkType;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateLinkInput {
  sourceId: string;
  targetId: string;
  linkType: LinkType;
  metadata?: Record<string, unknown>;
}

export interface LinkQuery {
  memoryId: string;
  linkType?: LinkType;
}

export interface SyncConfig {
  enabled: boolean;
  intervalMs: number;
  debounceMs: number;
  autoResolveConflicts: "last_write_wins" | "local_wins" | "remote_wins" | "manual";
}

export interface EmbeddingConfig {
  enabled: boolean;
  model: string;
  autoGenerate: boolean;
}

export interface HippoConfig {
  configVersion?: number;
  remote: {
    url: string;
    orgId: string;
    repoId: string;
    apiKey?: string;
  };
  defaults: {
    visibility: Visibility;
    memoryType: MemoryType;
  };
  sync?: SyncConfig;
  embeddings?: EmbeddingConfig;
  openaiApiKey?: string;
  remotes?: Record<string, RemoteConfig>;
}

export interface ConsolidateMemoriesInput {
  orgId: string;
  repoId: string;
  sourceIds: string[];
  consolidatedText: string;
  memoryType?: MemoryType;
  tags?: string[];
  preserveOriginals?: boolean;
}

export interface ConsolidateMemoriesResult {
  consolidatedId: string;
  version: number;
  sourcesPreserved: number;
  sourceIds: string[];
}

export interface ReconsolidateInput {
  orgId: string;
  repoId: string;
  existingConsolidationId: string;
  additionalSourceIds?: string[];
  newText: string;
  tags?: string[];
}

export interface FindSimilarQuery {
  orgId: string;
  repoId: string;
  memoryId: string;
  threshold?: number;
  k?: number;
}

export interface DeleteMemoryInput {
  id: string;
  deletedBy?: string;
  hardDelete?: boolean;
}

export interface SyncOperation {
  id: string;
  operationType: "create" | "update" | "delete";
  memoryId: string;
  timestamp: Date;
  authorId?: string;
  data?: Partial<Memory>;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: SyncConflict[];
  deletionsPropagated: number;
  errors: Array<{ id: string; error: string }>;
}

export interface SyncConflict {
  memoryId: string;
  localVersion: number;
  remoteVersion: number;
  localUpdatedAt: Date;
  remoteUpdatedAt: Date;
  resolution?: ConflictResolution;
  resolvedData?: Memory;
}

export interface Tombstone {
  id: string;
  memoryId: string;
  orgId: string;
  repoId: string;
  deletedAt: Date;
  deletedBy?: string;
  syncedAt?: Date;
}

export type SyncStatus = "synced" | "pending_push" | "pending_pull" | "conflict";

export interface SyncState {
  memoryId: string;
  localVersion: number;
  remoteVersion?: number;
  lastPushedAt?: Date;
  lastPulledAt?: Date;
  syncStatus: SyncStatus;
}

export interface RemoteConfig {
  url: string;
  orgId: string;
  repoId: string;
  apiKey?: string;
}

export interface StatusSummary {
  remote?: {
    name: string;
    url: string;
  };
  toPush: Array<{ id: string; text: string; action: "new" | "modified" }>;
  toPull: Array<{ id: string; text: string; action: "new" | "modified" }>;
  conflicts: Array<{ id: string; text: string; localVersion: number; remoteVersion: number }>;
}

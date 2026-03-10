export type MemoryType = "episodic" | "semantic" | "procedural";
export type Visibility = "private" | "repo" | "auto";
export type Status = "active" | "deprecated" | "superseded" | "deleted";
export type ConflictResolution = "local_wins" | "remote_wins" | "last_write_wins" | "manual";

export interface Memory {
  id: string;
  orgId: string;
  repoId: string;
  scopeType: string;
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

export interface Tombstone {
  id: string;
  memoryId: string;
  orgId: string;
  repoId: string;
  deletedAt: Date;
  deletedBy?: string;
  syncedAt?: Date;
}

export interface DeleteMemoryInput {
  id: string;
  deletedBy?: string;
  hardDelete?: boolean;
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
}

export interface CreateMemoryInput {
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

export interface AppConfig {
  remote: {
    url: string;
    orgId: string;
    repoId: string;
  };
  defaults: {
    visibility: Visibility;
    memoryType: MemoryType;
  };
}

export type MemoryType = "episodic" | "semantic" | "procedural";
export type Visibility = "private" | "repo" | "auto";
export type Status = "active" | "deprecated" | "superseded";
export type ScopeType = "repo" | "org";

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
  createdAt: Date;
  updatedAt: Date;
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

export interface RecallQuery {
  orgId: string;
  repoId: string;
  query: string;
  types?: MemoryType[];
  tags?: string[];
  timeRange?: { from?: Date; to?: Date };
  k?: number;
  includeDeprecated?: boolean;
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

export interface HippoConfig {
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

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

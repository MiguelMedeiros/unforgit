import Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import path from "node:path";
import fs from "node:fs";
import type {
  Memory,
  MemoryLink,
  CreateMemoryInput,
  CreateLinkInput,
  LinkQuery,
  RecallQuery,
  RecallResult,
  ListQuery,
  StoreStats,
  ConsolidateMemoriesInput,
  ConsolidateMemoriesResult,
  ReconsolidateInput,
  FindSimilarQuery,
  Tombstone,
  DeleteMemoryInput,
  SyncState,
  SyncStatus,
} from "@unforgit/shared";
import { computeCompositeScore, computeHybridScore } from "@unforgit/core";
import {
  applyLifecycleDefaults,
  computeUsageBoost,
} from "@unforgit/core";
import {
  generateEmbedding,
  serializeEmbedding,
  deserializeEmbedding,
  cosineSimilarity,
  type EmbeddingConfig,
} from "@unforgit/core";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  repo_id TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'repo',
  memory_type TEXT NOT NULL CHECK(memory_type IN ('episodic','semantic','procedural')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','repo')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','deprecated','superseded','deleted')),
  text TEXT NOT NULL,
  summary TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  source_refs TEXT,
  confidence REAL,
  ttl_seconds INTEGER,
  supersedes_id TEXT,
  is_consolidation INTEGER NOT NULL DEFAULT 0,
  consolidation_version INTEGER,
  author_id TEXT,
  author_name TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  deleted_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tombstones (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL UNIQUE,
  org_id TEXT NOT NULL,
  repo_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  deleted_by TEXT,
  synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tombstones_sync ON tombstones(org_id, repo_id, synced_at);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  text, summary, content=memories, content_rowid=rowid
);

CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, text, summary)
    VALUES (new.rowid, new.text, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, text, summary)
    VALUES ('delete', old.rowid, old.text, old.summary);
END;

CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, text, summary)
    VALUES ('delete', old.rowid, old.text, old.summary);
  INSERT INTO memories_fts(rowid, text, summary)
    VALUES (new.rowid, new.text, new.summary);
END;

CREATE TABLE IF NOT EXISTS memory_links (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK(link_type IN ('related_to','derived_from','contradicts','depends_on')),
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source_id, target_id, link_type)
);

CREATE TABLE IF NOT EXISTS sync_state (
  memory_id TEXT PRIMARY KEY,
  local_version INTEGER NOT NULL,
  remote_version INTEGER,
  last_pushed_at TEXT,
  last_pulled_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending_push' CHECK(sync_status IN ('synced','pending_push','pending_pull','conflict'))
);

CREATE INDEX IF NOT EXISTS idx_sync_state_status ON sync_state(sync_status);

CREATE TABLE IF NOT EXISTS synced_links (
  link_id TEXT PRIMARY KEY,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_embeddings (
  memory_id TEXT PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
  embedding BLOB NOT NULL,
  model TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id TEXT NOT NULL,
  recalled_at TEXT NOT NULL DEFAULT (datetime('now')),
  query TEXT,
  session_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_memory_usage_memory ON memory_usage(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_usage_recalled ON memory_usage(recalled_at);
`;

function rowToLink(row: Record<string, unknown>): MemoryLink {
  return {
    id: row.id as string,
    sourceId: row.source_id as string,
    targetId: row.target_id as string,
    linkType: row.link_type as MemoryLink["linkType"],
    metadata: row.metadata
      ? JSON.parse(row.metadata as string)
      : undefined,
    createdAt: new Date(row.created_at as string),
  };
}

function rowToMemory(row: Record<string, unknown>): Memory {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    repoId: row.repo_id as string,
    scopeType: (row.scope_type as Memory["scopeType"]) ?? "repo",
    memoryType: row.memory_type as Memory["memoryType"],
    visibility: row.visibility as Memory["visibility"],
    status: row.status as Memory["status"],
    text: row.text as string,
    summary: (row.summary as string) ?? undefined,
    tags: JSON.parse((row.tags as string) ?? "[]"),
    sourceRefs: row.source_refs
      ? JSON.parse(row.source_refs as string)
      : undefined,
    confidence: (row.confidence as number) ?? undefined,
    ttlSeconds: (row.ttl_seconds as number) ?? undefined,
    supersedesId: (row.supersedes_id as string) ?? undefined,
    isConsolidation: row.is_consolidation === 1,
    consolidationVersion: (row.consolidation_version as number) ?? undefined,
    authorId: (row.author_id as string) ?? undefined,
    authorName: (row.author_name as string) ?? undefined,
    version: (row.version as number) ?? 1,
    deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : undefined,
    deletedBy: (row.deleted_by as string) ?? undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function rowToTombstone(row: Record<string, unknown>): Tombstone {
  return {
    id: row.id as string,
    memoryId: row.memory_id as string,
    orgId: row.org_id as string,
    repoId: row.repo_id as string,
    deletedAt: new Date(row.deleted_at as string),
    deletedBy: (row.deleted_by as string) ?? undefined,
    syncedAt: row.synced_at ? new Date(row.synced_at as string) : undefined,
  };
}

function nonExpiredMemoryClause(alias?: string): string {
  const prefix = alias ? `${alias}.` : "";
  return `(${prefix}status != 'active' OR ${prefix}ttl_seconds IS NULL OR datetime(${prefix}created_at, '+' || ${prefix}ttl_seconds || ' seconds') >= datetime('now'))`;
}

export class LocalStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.exec(SCHEMA_SQL);
    this.migrateSchema();
  }

  private migrateSchema(): void {
    const columns = this.db
      .prepare("PRAGMA table_info(memories)")
      .all() as Array<{ name: string }>;
    const columnNames = columns.map((c) => c.name);

    if (!columnNames.includes("is_consolidation")) {
      this.db.exec(
        "ALTER TABLE memories ADD COLUMN is_consolidation INTEGER NOT NULL DEFAULT 0",
      );
    }
    if (!columnNames.includes("consolidation_version")) {
      this.db.exec(
        "ALTER TABLE memories ADD COLUMN consolidation_version INTEGER",
      );
    }
    if (!columnNames.includes("author_id")) {
      this.db.exec("ALTER TABLE memories ADD COLUMN author_id TEXT");
    }
    if (!columnNames.includes("author_name")) {
      this.db.exec("ALTER TABLE memories ADD COLUMN author_name TEXT");
    }
    if (!columnNames.includes("version")) {
      this.db.exec("ALTER TABLE memories ADD COLUMN version INTEGER NOT NULL DEFAULT 1");
    }
    if (!columnNames.includes("deleted_at")) {
      this.db.exec("ALTER TABLE memories ADD COLUMN deleted_at TEXT");
    }
    if (!columnNames.includes("deleted_by")) {
      this.db.exec("ALTER TABLE memories ADD COLUMN deleted_by TEXT");
    }

    const tables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tombstones'")
      .all() as Array<{ name: string }>;
    if (tables.length === 0) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tombstones (
          id TEXT PRIMARY KEY,
          memory_id TEXT NOT NULL UNIQUE,
          org_id TEXT NOT NULL,
          repo_id TEXT NOT NULL,
          deleted_at TEXT NOT NULL,
          deleted_by TEXT,
          synced_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_tombstones_sync ON tombstones(org_id, repo_id, synced_at);
      `);
    }

    const syncTables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sync_state'")
      .all() as Array<{ name: string }>;
    if (syncTables.length === 0) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sync_state (
          memory_id TEXT PRIMARY KEY,
          local_version INTEGER NOT NULL,
          remote_version INTEGER,
          last_pushed_at TEXT,
          last_pulled_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending_push' CHECK(sync_status IN ('synced','pending_push','pending_pull','conflict'))
        );
        CREATE INDEX IF NOT EXISTS idx_sync_state_status ON sync_state(sync_status);
      `);
    }

    const embeddingTables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_embeddings'")
      .all() as Array<{ name: string }>;
    if (embeddingTables.length === 0) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS memory_embeddings (
          memory_id TEXT PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
          embedding BLOB NOT NULL,
          model TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
    }

    const usageTables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_usage'")
      .all() as Array<{ name: string }>;
    if (usageTables.length === 0) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS memory_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          memory_id TEXT NOT NULL,
          recalled_at TEXT NOT NULL DEFAULT (datetime('now')),
          query TEXT,
          session_id TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_memory_usage_memory ON memory_usage(memory_id);
        CREATE INDEX IF NOT EXISTS idx_memory_usage_recalled ON memory_usage(recalled_at);
      `);
    }
  }

  store(input: CreateMemoryInput): Memory {
    const resolvedInput = applyLifecycleDefaults(input);
    const id = uuid();
    const now = new Date().toISOString();
    const normalizedOrgId = resolvedInput.orgId.toLowerCase();
    const normalizedRepoId = resolvedInput.repoId.toLowerCase();
    const visibility =
      resolvedInput.visibility === "auto" || !resolvedInput.visibility
        ? "private"
        : resolvedInput.visibility;

    this.db
      .prepare(
        `INSERT INTO memories
        (id, org_id, repo_id, scope_type, memory_type, visibility, status, text, summary, tags, source_refs, confidence, ttl_seconds, author_id, author_name, created_at, updated_at)
        VALUES (?, ?, ?, 'repo', ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        normalizedOrgId,
        normalizedRepoId,
        resolvedInput.memoryType,
        visibility,
        resolvedInput.text,
        resolvedInput.summary ?? null,
        JSON.stringify(resolvedInput.tags ?? []),
        resolvedInput.sourceRefs ? JSON.stringify(resolvedInput.sourceRefs) : null,
        resolvedInput.confidence ?? null,
        resolvedInput.ttlSeconds ?? null,
        resolvedInput.authorId ?? null,
        resolvedInput.authorName ?? null,
        now,
        now,
      );

    this.setSyncState({
      memoryId: id,
      localVersion: 1,
      syncStatus: "pending_push",
    });

    return this.getById(id)!;
  }

  getById(id: string): Memory | undefined {
    const row = this.db
      .prepare("SELECT * FROM memories WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? rowToMemory(row) : undefined;
  }

  recall(query: RecallQuery): RecallResult[] {
    const conditions: string[] = ["m.org_id = ?", "m.repo_id = ?"];
    const params: unknown[] = [query.orgId, query.repoId];

    if (!query.includeDeprecated) {
      conditions.push("m.status = 'active'");
    }

    if (!query.includeExpired) {
      conditions.push(nonExpiredMemoryClause("m"));
    }

    if (query.types && query.types.length > 0) {
      conditions.push(
        `m.memory_type IN (${query.types.map(() => "?").join(",")})`,
      );
      params.push(...query.types);
    }

    if (query.timeRange?.from) {
      conditions.push("m.created_at >= ?");
      params.push(query.timeRange.from.toISOString());
    }
    if (query.timeRange?.to) {
      conditions.push("m.created_at <= ?");
      params.push(query.timeRange.to.toISOString());
    }

    const whereClause = conditions.join(" AND ");
    const k = query.k ?? 10;

    const rawQuery = query.query.replace(/[^\w\s]/g, " ").trim();
    const words = rawQuery.split(/\s+/).filter((w) => w.length > 0);
    
    // Use prefix matching without quotes for more flexible search
    // Also filter out very short words that add noise
    const searchableWords = words.filter((w) => w.length >= 2);
    const ftsQuery = searchableWords.length > 0 
      ? `(${searchableWords.map((w) => `${w}*`).join(" OR ")})` 
      : "";

    let sql: string;
    let finalParams: unknown[];

    if (ftsQuery) {
      sql = `
        SELECT m.*, fts.rank AS fts_rank
        FROM memories_fts fts
        JOIN memories m ON m.rowid = fts.rowid
        WHERE fts.memories_fts MATCH ?
          AND ${whereClause}
        ORDER BY m.is_consolidation DESC, fts.rank
        LIMIT ?
      `;
      finalParams = [ftsQuery, ...params, k * 2];
    } else {
      sql = `
        SELECT m.*, 0 AS fts_rank
        FROM memories m
        WHERE ${whereClause}
        ORDER BY m.is_consolidation DESC, m.created_at DESC
        LIMIT ?
      `;
      finalParams = [...params, k * 2];
    }

    let rows = this.db.prepare(sql).all(...finalParams) as Array<
      Record<string, unknown>
    >;

    // Fallback: if FTS returns no results, try LIKE search as last resort
    if (rows.length === 0 && searchableWords.length > 0) {
      const likeConditions = searchableWords
        .slice(0, 5) // limit to first 5 words
        .map(() => "(m.text LIKE ? OR m.summary LIKE ?)")
        .join(" OR ");
      
      const likeParams: unknown[] = [];
      for (const word of searchableWords.slice(0, 5)) {
        likeParams.push(`%${word}%`, `%${word}%`);
      }

      const fallbackSql = `
        SELECT m.*, 0 AS fts_rank
        FROM memories m
        WHERE ${whereClause}
          AND (${likeConditions})
        ORDER BY m.is_consolidation DESC, m.created_at DESC
        LIMIT ?
      `;
      
      rows = this.db.prepare(fallbackSql).all(...params, ...likeParams, k * 2) as Array<
        Record<string, unknown>
      >;
    }

    const usageStats = this.getUsageStats(query.orgId, query.repoId);
    const usageMap = new Map(usageStats.map((stat) => [stat.memoryId, stat]));

    let results = rows.map((row) => {
      const memory = rowToMemory(row);
      const textScore = ftsQuery
        ? Math.min(1, Math.abs(row.fts_rank as number) / 10)
        : 0.5;

      const consolidationBoost = memory.isConsolidation ? 0.1 : 0;
      const usage = usageMap.get(memory.id);
      const usageBoost = computeUsageBoost(
        usage?.count ?? 0,
        usage?.lastUsed,
      );

      const result: RecallResult = {
        id: memory.id,
        memoryType: memory.memoryType,
        text: memory.text,
        summary: memory.summary,
        tags: memory.tags,
        sourceRefs: memory.sourceRefs,
        score: computeCompositeScore(
          textScore + consolidationBoost,
          memory.createdAt,
          memory.confidence,
          usageBoost,
        ),
        source: "local" as const,
        status: memory.status,
        supersedesId: memory.supersedesId,
        isConsolidation: memory.isConsolidation,
        consolidationVersion: memory.consolidationVersion,
      };

      if (query.includeConsolidatedSources && memory.isConsolidation) {
        const sources = this.getConsolidatedSources(memory.id);
        result.sourceMemories = sources.map((src) => ({
          id: src.id,
          memoryType: src.memoryType,
          text: src.text,
          summary: src.summary,
          tags: src.tags,
          sourceRefs: src.sourceRefs,
          score: 0,
          source: "local" as const,
        }));
      }

      return result;
    });

    if (query.tags && query.tags.length > 0) {
      results = results.filter((r) => {
        const memTags = r.tags;
        return query.tags!.some((t) => memTags.includes(t));
      });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  list(query: ListQuery): Memory[] {
    const conditions: string[] = ["org_id = ?", "repo_id = ?"];
    const params: unknown[] = [query.orgId, query.repoId];

    if (!query.includeExpired) {
      conditions.push(nonExpiredMemoryClause());
    }

    if (query.types && query.types.length > 0) {
      conditions.push(
        `memory_type IN (${query.types.map(() => "?").join(",")})`,
      );
      params.push(...query.types);
    }

    if (query.status && query.status.length > 0) {
      conditions.push(
        `status IN (${query.status.map(() => "?").join(",")})`,
      );
      params.push(...query.status);
    }

    if (query.visibility && query.visibility.length > 0) {
      conditions.push(
        `visibility IN (${query.visibility.map(() => "?").join(",")})`,
      );
      params.push(...query.visibility);
    }

    if (query.search) {
      const rawSearch = query.search.replace(/[^\w\s]/g, " ").trim();
      const searchWords = rawSearch.split(/\s+/).filter((w) => w.length >= 2);
      const ftsSearch = searchWords.length > 0 ? `(${searchWords.map((w) => `${w}*`).join(" OR ")})` : "";
      if (ftsSearch) {
        conditions.push(
          "rowid IN (SELECT rowid FROM memories_fts WHERE memories_fts MATCH ?)",
        );
        params.push(ftsSearch);
      }
    }

    const sortCol =
      query.sortBy === "updatedAt"
        ? "updated_at"
        : query.sortBy === "confidence"
          ? "confidence"
          : "created_at";
    const sortDir = query.sortOrder === "asc" ? "ASC" : "DESC";
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const sql = `
      SELECT * FROM memories
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params) as Array<
      Record<string, unknown>
    >;
    return rows.map(rowToMemory);
  }

  count(query: ListQuery): number {
    const conditions: string[] = ["org_id = ?", "repo_id = ?"];
    const params: unknown[] = [query.orgId, query.repoId];

    if (!query.includeExpired) {
      conditions.push(nonExpiredMemoryClause());
    }

    if (query.types && query.types.length > 0) {
      conditions.push(
        `memory_type IN (${query.types.map(() => "?").join(",")})`,
      );
      params.push(...query.types);
    }

    if (query.status && query.status.length > 0) {
      conditions.push(
        `status IN (${query.status.map(() => "?").join(",")})`,
      );
      params.push(...query.status);
    }

    if (query.visibility && query.visibility.length > 0) {
      conditions.push(
        `visibility IN (${query.visibility.map(() => "?").join(",")})`,
      );
      params.push(...query.visibility);
    }

    if (query.search) {
      const rawSearch = query.search.replace(/[^\w\s]/g, " ").trim();
      const searchWords = rawSearch.split(/\s+/).filter((w) => w.length >= 2);
      const ftsSearch = searchWords.length > 0 ? `(${searchWords.map((w) => `${w}*`).join(" OR ")})` : "";
      if (ftsSearch) {
        conditions.push(
          "rowid IN (SELECT rowid FROM memories_fts WHERE memories_fts MATCH ?)",
        );
        params.push(ftsSearch);
      }
    }

    const sql = `SELECT COUNT(*) as cnt FROM memories WHERE ${conditions.join(" AND ")}`;
    const row = this.db.prepare(sql).get(...params) as { cnt: number };
    return row.cnt;
  }

  stats(orgId: string, repoId: string): StoreStats {
    const rows = this.db
      .prepare(
        `SELECT memory_type, status, visibility, COUNT(*) as cnt
         FROM memories WHERE org_id = ? AND repo_id = ?
         GROUP BY memory_type, status, visibility`,
      )
      .all(orgId, repoId) as Array<{
      memory_type: string;
      status: string;
      visibility: string;
      cnt: number;
    }>;

    const stats: StoreStats = {
      total: 0,
      byType: { episodic: 0, semantic: 0, procedural: 0 },
      byStatus: { active: 0, deprecated: 0, superseded: 0, deleted: 0 },
      byVisibility: { private: 0, repo: 0 },
    };

    for (const row of rows) {
      stats.total += row.cnt;
      if (row.memory_type in stats.byType) {
        stats.byType[row.memory_type as keyof typeof stats.byType] += row.cnt;
      }
      if (row.status in stats.byStatus) {
        stats.byStatus[row.status as keyof typeof stats.byStatus] += row.cnt;
      }
      if (row.visibility in stats.byVisibility) {
        stats.byVisibility[row.visibility] += row.cnt;
      }
    }

    return stats;
  }

  deprecate(id: string, reason?: string): boolean {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        "UPDATE memories SET status = 'deprecated', updated_at = ? WHERE id = ?",
      )
      .run(now, id);

    if (reason && result.changes > 0) {
      const mem = this.getById(id);
      if (mem) {
        const refs = mem.sourceRefs ?? {};
        (refs as Record<string, unknown>).deprecation_reason = reason;
        this.db
          .prepare("UPDATE memories SET source_refs = ? WHERE id = ?")
          .run(JSON.stringify(refs), id);
      }
    }

    return result.changes > 0;
  }

  supersede(oldId: string, newId: string): boolean {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        "UPDATE memories SET status = 'superseded', supersedes_id = ?, updated_at = ? WHERE id = ?",
      )
      .run(newId, now, oldId);
    return result.changes > 0;
  }

  updateVisibility(id: string, visibility: "private" | "repo"): boolean {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        "UPDATE memories SET visibility = ?, updated_at = ? WHERE id = ?",
      )
      .run(visibility, now, id);
    return result.changes > 0;
  }

  expireExpiredMemories(
    orgId?: string,
    repoId?: string,
    deletedBy = "system:ttl-expiry",
  ): number {
    const conditions = [
      "status = 'active'",
      "ttl_seconds IS NOT NULL",
      "datetime(created_at, '+' || ttl_seconds || ' seconds') < datetime('now')",
    ];
    const params: unknown[] = [];

    if (orgId) {
      conditions.push("org_id = ?");
      params.push(orgId);
    }

    if (repoId) {
      conditions.push("repo_id = ?");
      params.push(repoId);
    }

    const rows = this.db
      .prepare(
        `SELECT id FROM memories WHERE ${conditions.join(" AND ")}`,
      )
      .all(...params) as Array<{ id: string }>;

    let expired = 0;
    for (const row of rows) {
      if (this.softDelete({ id: row.id, deletedBy })) {
        expired += 1;
      }
    }

    return expired;
  }

  purgeExpired(): number {
    return this.expireExpiredMemories();
  }

  link(input: CreateLinkInput): MemoryLink {
    const id = uuid();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO memory_links (id, source_id, target_id, link_type, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.sourceId,
        input.targetId,
        input.linkType,
        input.metadata ? JSON.stringify(input.metadata) : null,
        now,
      );

    return this.getLinkById(id)!;
  }

  unlink(sourceId: string, targetId: string, linkType: string): boolean {
    const result = this.db
      .prepare(
        "DELETE FROM memory_links WHERE source_id = ? AND target_id = ? AND link_type = ?",
      )
      .run(sourceId, targetId, linkType);
    return result.changes > 0;
  }

  getLinks(query: LinkQuery): MemoryLink[] {
    const conditions: string[] = [
      "(source_id = ? OR target_id = ?)",
    ];
    const params: unknown[] = [query.memoryId, query.memoryId];

    if (query.linkType) {
      conditions.push("link_type = ?");
      params.push(query.linkType);
    }

    const sql = `SELECT * FROM memory_links WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`;
    const rows = this.db.prepare(sql).all(...params) as Array<
      Record<string, unknown>
    >;
    return rows.map(rowToLink);
  }

  getLinkedMemories(memoryId: string, linkType?: string): Memory[] {
    const conditions: string[] = [
      "(l.source_id = ? OR l.target_id = ?)",
    ];
    const params: unknown[] = [memoryId, memoryId];

    if (linkType) {
      conditions.push("l.link_type = ?");
      params.push(linkType);
    }

    const sql = `
      SELECT m.* FROM memories m
      JOIN memory_links l ON (
        (l.source_id = ? AND l.target_id = m.id) OR
        (l.target_id = ? AND l.source_id = m.id)
      )
      ${linkType ? "WHERE l.link_type = ?" : ""}
      ORDER BY m.created_at DESC
    `;
    const linkedParams = linkType
      ? [memoryId, memoryId, linkType]
      : [memoryId, memoryId];

    const rows = this.db.prepare(sql).all(...linkedParams) as Array<
      Record<string, unknown>
    >;
    return rows.map(rowToMemory);
  }

  private getLinkById(id: string): MemoryLink | undefined {
    const row = this.db
      .prepare("SELECT * FROM memory_links WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? rowToLink(row) : undefined;
  }

  consolidateMemories(input: ConsolidateMemoriesInput): ConsolidateMemoriesResult {
    const { sourceIds, consolidatedText, memoryType, tags, preserveOriginals = true } = input;
    const orgId = input.orgId.toLowerCase();
    const repoId = input.repoId.toLowerCase();

    if (sourceIds.length < 2) {
      throw new Error("At least 2 source memories are required for consolidation");
    }

    const sourceMemories = sourceIds
      .map((id) => this.getById(id))
      .filter((m): m is Memory => m !== undefined);

    if (sourceMemories.length !== sourceIds.length) {
      const foundIds = sourceMemories.map((m) => m.id);
      const missingIds = sourceIds.filter((id) => !foundIds.includes(id));
      throw new Error(`Source memories not found: ${missingIds.join(", ")}`);
    }

    const inferredType = memoryType ?? this.inferMemoryType(sourceMemories);
    const mergedTags = tags ?? this.mergeTags(sourceMemories);
    const inheritedVisibility = sourceMemories.some((m) => m.visibility === "repo") ? "repo" : "private";

    const id = uuid();
    const now = new Date().toISOString();
    const version = 1;

    this.db
      .prepare(
        `INSERT INTO memories
        (id, org_id, repo_id, scope_type, memory_type, visibility, status, text, summary, tags, source_refs, confidence, is_consolidation, consolidation_version, created_at, updated_at)
        VALUES (?, ?, ?, 'repo', ?, ?, 'active', ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      )
      .run(
        id,
        orgId,
        repoId,
        inferredType,
        inheritedVisibility,
        consolidatedText,
        null,
        JSON.stringify(mergedTags),
        JSON.stringify({ consolidated_from: sourceIds }),
        null,
        version,
        now,
        now,
      );

    for (const sourceId of sourceIds) {
      this.link({
        sourceId: id,
        targetId: sourceId,
        linkType: "derived_from",
        metadata: { consolidation: true },
      });
    }

    if (preserveOriginals) {
      for (const sourceId of sourceIds) {
        this.supersede(sourceId, id);
      }
    }

    if (inheritedVisibility === "repo") {
      this.setSyncState({
        memoryId: id,
        localVersion: version,
        syncStatus: "pending_push",
      });
    }

    return {
      consolidatedId: id,
      version,
      sourcesPreserved: sourceIds.length,
      sourceIds,
    };
  }

  reconsolidate(input: ReconsolidateInput): ConsolidateMemoriesResult {
    const { existingConsolidationId, additionalSourceIds = [], newText, tags } = input;
    const orgId = input.orgId.toLowerCase();
    const repoId = input.repoId.toLowerCase();

    const existing = this.getById(existingConsolidationId);
    if (!existing) {
      throw new Error(`Consolidation not found: ${existingConsolidationId}`);
    }
    if (!existing.isConsolidation) {
      throw new Error(`Memory ${existingConsolidationId} is not a consolidation`);
    }

    const existingLinks = this.getLinks({ memoryId: existingConsolidationId, linkType: "derived_from" });
    const existingSourceIds = existingLinks
      .filter((l) => l.sourceId === existingConsolidationId)
      .map((l) => l.targetId);

    const allSourceIds = [...new Set([...existingSourceIds, ...additionalSourceIds])];

    for (const id of additionalSourceIds) {
      const mem = this.getById(id);
      if (!mem) {
        throw new Error(`Additional source memory not found: ${id}`);
      }
    }

    const newVersion = (existing.consolidationVersion ?? 1) + 1;
    const mergedTags = tags ?? existing.tags;
    const inheritedVisibility = existing.visibility;

    const id = uuid();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO memories
        (id, org_id, repo_id, scope_type, memory_type, visibility, status, text, summary, tags, source_refs, confidence, is_consolidation, consolidation_version, created_at, updated_at)
        VALUES (?, ?, ?, 'repo', ?, ?, 'active', ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      )
      .run(
        id,
        orgId,
        repoId,
        existing.memoryType,
        inheritedVisibility,
        newText,
        null,
        JSON.stringify(mergedTags),
        JSON.stringify({
          consolidated_from: allSourceIds,
          previous_consolidation: existingConsolidationId,
        }),
        null,
        newVersion,
        now,
        now,
      );

    this.link({
      sourceId: id,
      targetId: existingConsolidationId,
      linkType: "derived_from",
      metadata: { reconsolidation: true, previous_version: existing.consolidationVersion ?? 1 },
    });

    for (const sourceId of additionalSourceIds) {
      this.link({
        sourceId: id,
        targetId: sourceId,
        linkType: "derived_from",
        metadata: { consolidation: true },
      });
      this.supersede(sourceId, id);
    }

    this.supersede(existingConsolidationId, id);

    if (inheritedVisibility === "repo") {
      this.setSyncState({
        memoryId: id,
        localVersion: newVersion,
        syncStatus: "pending_push",
      });
    }

    return {
      consolidatedId: id,
      version: newVersion,
      sourcesPreserved: allSourceIds.length,
      sourceIds: allSourceIds,
    };
  }

  findSimilar(query: FindSimilarQuery): RecallResult[] {
    const { orgId, repoId, memoryId, threshold = 0.3, k = 10 } = query;

    const memory = this.getById(memoryId);
    if (!memory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    const results = this.recall({
      orgId,
      repoId,
      query: memory.text,
      k: k + 1,
    });

    return results
      .filter((r) => r.id !== memoryId && r.score >= threshold)
      .slice(0, k);
  }

  getConsolidationHistory(memoryId: string): Memory[] {
    const memory = this.getById(memoryId);
    if (!memory) {
      return [];
    }

    const history: Memory[] = [];

    if (memory.isConsolidation) {
      const sourceLinks = this.getLinks({ memoryId, linkType: "derived_from" });
      for (const link of sourceLinks) {
        const targetId = link.sourceId === memoryId ? link.targetId : link.sourceId;
        const target = this.getById(targetId);
        if (target) {
          history.push(target);
          if (target.isConsolidation) {
            history.push(...this.getConsolidationHistory(targetId));
          }
        }
      }
    }

    return history;
  }

  getConsolidatedSources(consolidationId: string): Memory[] {
    const memory = this.getById(consolidationId);
    if (!memory || !memory.isConsolidation) {
      return [];
    }

    const sourceLinks = this.getLinks({ memoryId: consolidationId, linkType: "derived_from" });
    const sources: Memory[] = [];

    for (const link of sourceLinks) {
      if (link.sourceId === consolidationId) {
        const source = this.getById(link.targetId);
        if (source && !source.isConsolidation) {
          sources.push(source);
        }
      }
    }

    return sources;
  }

  private inferMemoryType(memories: Memory[]): Memory["memoryType"] {
    const typeCounts = { episodic: 0, semantic: 0, procedural: 0 };
    for (const m of memories) {
      typeCounts[m.memoryType]++;
    }

    if (typeCounts.procedural > 0) return "procedural";
    if (typeCounts.semantic >= typeCounts.episodic) return "semantic";
    return "episodic";
  }

  private mergeTags(memories: Memory[]): string[] {
    const tagSet = new Set<string>();
    for (const m of memories) {
      for (const tag of m.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet);
  }

  softDelete(input: DeleteMemoryInput): boolean {
    const memory = this.getById(input.id);
    if (!memory) return false;

    const now = new Date().toISOString();
    const newVersion = (memory.version ?? 1) + 1;

    const result = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE memories 
           SET status = 'deleted', deleted_at = ?, deleted_by = ?, version = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(now, input.deletedBy ?? null, newVersion, now, input.id);

      this.db
        .prepare(
          `INSERT OR REPLACE INTO tombstones (id, memory_id, org_id, repo_id, deleted_at, deleted_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          uuid(),
          input.id,
          memory.orgId,
          memory.repoId,
          now,
          input.deletedBy ?? null,
          now,
        );

      return true;
    })();

    return result;
  }

  hardDelete(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM memories WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  restore(id: string): boolean {
    const now = new Date().toISOString();
    const result = this.db.transaction(() => {
      const updateResult = this.db
        .prepare(
          `UPDATE memories 
           SET status = 'active', deleted_at = NULL, deleted_by = NULL, version = version + 1, updated_at = ?
           WHERE id = ? AND status = 'deleted'`,
        )
        .run(now, id);

      if (updateResult.changes > 0) {
        this.db
          .prepare("DELETE FROM tombstones WHERE memory_id = ?")
          .run(id);
      }

      return updateResult.changes > 0;
    })();

    return result;
  }

  getTombstones(orgId: string, repoId: string, sinceSyncedAt?: Date): Tombstone[] {
    let sql = "SELECT * FROM tombstones WHERE org_id = ? AND repo_id = ?";
    const params: unknown[] = [orgId, repoId];

    if (sinceSyncedAt) {
      sql += " AND (synced_at IS NULL OR synced_at > ?)";
      params.push(sinceSyncedAt.toISOString());
    } else {
      sql += " AND synced_at IS NULL";
    }

    sql += " ORDER BY deleted_at ASC";

    const rows = this.db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
    return rows.map(rowToTombstone);
  }

  getUnsyncedTombstones(orgId: string, repoId: string): Tombstone[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM tombstones WHERE org_id = ? AND repo_id = ? AND synced_at IS NULL ORDER BY deleted_at ASC",
      )
      .all(orgId, repoId) as Array<Record<string, unknown>>;
    return rows.map(rowToTombstone);
  }

  markTombstoneSynced(memoryId: string): boolean {
    const now = new Date().toISOString();
    const result = this.db
      .prepare("UPDATE tombstones SET synced_at = ? WHERE memory_id = ?")
      .run(now, memoryId);
    return result.changes > 0;
  }

  applyTombstone(tombstone: Tombstone): boolean {
    const memory = this.getById(tombstone.memoryId);
    if (!memory) {
      this.db
        .prepare(
          `INSERT OR REPLACE INTO tombstones (id, memory_id, org_id, repo_id, deleted_at, deleted_by, synced_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          tombstone.id,
          tombstone.memoryId,
          tombstone.orgId,
          tombstone.repoId,
          tombstone.deletedAt.toISOString(),
          tombstone.deletedBy ?? null,
          new Date().toISOString(),
          new Date().toISOString(),
        );
      return true;
    }

    return this.softDelete({
      id: tombstone.memoryId,
      deletedBy: tombstone.deletedBy,
    });
  }

  incrementVersion(id: string): number {
    const now = new Date().toISOString();
    this.db
      .prepare("UPDATE memories SET version = version + 1, updated_at = ? WHERE id = ?")
      .run(now, id);
    const row = this.db
      .prepare("SELECT version FROM memories WHERE id = ?")
      .get(id) as { version: number } | undefined;
    return row?.version ?? 1;
  }

  getModifiedSince(orgId: string, repoId: string, since: Date): Memory[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM memories 
         WHERE org_id = ? AND repo_id = ? AND updated_at > ?
         ORDER BY updated_at ASC`,
      )
      .all(orgId, repoId, since.toISOString()) as Array<Record<string, unknown>>;
    return rows.map(rowToMemory);
  }

  upsertFromRemote(memory: Memory): { action: "created" | "updated" | "skipped"; conflict: boolean } {
    const existing = this.getById(memory.id);
    const now = new Date().toISOString();
    const normalizedOrgId = memory.orgId.toLowerCase();
    const normalizedRepoId = memory.repoId.toLowerCase();

    if (!existing) {
      this.db
        .prepare(
          `INSERT INTO memories
          (id, org_id, repo_id, scope_type, memory_type, visibility, status, text, summary, tags, source_refs, confidence, ttl_seconds, supersedes_id, is_consolidation, consolidation_version, author_id, author_name, version, deleted_at, deleted_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          memory.id,
          normalizedOrgId,
          normalizedRepoId,
          memory.scopeType ?? "repo",
          memory.memoryType,
          memory.visibility,
          memory.status,
          memory.text,
          memory.summary ?? null,
          JSON.stringify(memory.tags ?? []),
          memory.sourceRefs ? JSON.stringify(memory.sourceRefs) : null,
          memory.confidence ?? null,
          memory.ttlSeconds ?? null,
          memory.supersedesId ?? null,
          memory.isConsolidation ? 1 : 0,
          memory.consolidationVersion ?? null,
          memory.authorId ?? null,
          memory.authorName ?? null,
          memory.version ?? 1,
          memory.deletedAt?.toISOString() ?? null,
          memory.deletedBy ?? null,
          memory.createdAt.toISOString(),
          now,
        );
      return { action: "created", conflict: false };
    }

    const remoteVersion = memory.version ?? 1;
    const localVersion = existing.version ?? 1;

    if (remoteVersion <= localVersion) {
      if (memory.updatedAt <= existing.updatedAt) {
        return { action: "skipped", conflict: false };
      }
    }

    const hasConflict = localVersion !== remoteVersion && existing.updatedAt > memory.updatedAt;

    this.db
      .prepare(
        `UPDATE memories SET
          memory_type = ?, visibility = ?, status = ?, text = ?, summary = ?, tags = ?,
          source_refs = ?, confidence = ?, ttl_seconds = ?, supersedes_id = ?,
          is_consolidation = ?, consolidation_version = ?, author_id = ?, author_name = ?,
          version = ?, deleted_at = ?, deleted_by = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        memory.memoryType,
        memory.visibility,
        memory.status,
        memory.text,
        memory.summary ?? null,
        JSON.stringify(memory.tags ?? []),
        memory.sourceRefs ? JSON.stringify(memory.sourceRefs) : null,
        memory.confidence ?? null,
        memory.ttlSeconds ?? null,
        memory.supersedesId ?? null,
        memory.isConsolidation ? 1 : 0,
        memory.consolidationVersion ?? null,
        memory.authorId ?? null,
        memory.authorName ?? null,
        Math.max(remoteVersion, localVersion) + 1,
        memory.deletedAt?.toISOString() ?? null,
        memory.deletedBy ?? null,
        now,
        memory.id,
      );

    return { action: "updated", conflict: hasConflict };
  }

  getSyncState(memoryId: string): SyncState | undefined {
    const row = this.db
      .prepare("SELECT * FROM sync_state WHERE memory_id = ?")
      .get(memoryId) as Record<string, unknown> | undefined;
    return row ? this.rowToSyncState(row) : undefined;
  }

  getAllSyncStates(): SyncState[] {
    const rows = this.db
      .prepare("SELECT * FROM sync_state")
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => this.rowToSyncState(row));
  }

  getSyncStatesByStatus(status: SyncStatus): SyncState[] {
    const rows = this.db
      .prepare("SELECT * FROM sync_state WHERE sync_status = ?")
      .all(status) as Array<Record<string, unknown>>;
    return rows.map((row) => this.rowToSyncState(row));
  }

  getPendingPush(): Array<{ memory: Memory; syncState: SyncState }> {
    const rows = this.db
      .prepare(`
        SELECT m.*, s.local_version as sync_local_version, s.remote_version as sync_remote_version,
               s.last_pushed_at, s.last_pulled_at, s.sync_status
        FROM memories m
        JOIN sync_state s ON m.id = s.memory_id
        WHERE s.sync_status = 'pending_push'
        ORDER BY m.updated_at ASC
      `)
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      memory: rowToMemory(row),
      syncState: {
        memoryId: row.id as string,
        localVersion: row.sync_local_version as number,
        remoteVersion: row.sync_remote_version as number | undefined,
        lastPushedAt: row.last_pushed_at ? new Date(row.last_pushed_at as string) : undefined,
        lastPulledAt: row.last_pulled_at ? new Date(row.last_pulled_at as string) : undefined,
        syncStatus: row.sync_status as SyncStatus,
      },
    }));
  }

  getConflicts(): Array<{ memory: Memory; syncState: SyncState }> {
    const rows = this.db
      .prepare(`
        SELECT m.*, s.local_version as sync_local_version, s.remote_version as sync_remote_version,
               s.last_pushed_at, s.last_pulled_at, s.sync_status
        FROM memories m
        JOIN sync_state s ON m.id = s.memory_id
        WHERE s.sync_status = 'conflict'
        ORDER BY m.updated_at ASC
      `)
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      memory: rowToMemory(row),
      syncState: {
        memoryId: row.id as string,
        localVersion: row.sync_local_version as number,
        remoteVersion: row.sync_remote_version as number | undefined,
        lastPushedAt: row.last_pushed_at ? new Date(row.last_pushed_at as string) : undefined,
        lastPulledAt: row.last_pulled_at ? new Date(row.last_pulled_at as string) : undefined,
        syncStatus: row.sync_status as SyncStatus,
      },
    }));
  }

  setSyncState(state: SyncState): void {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO sync_state (memory_id, local_version, remote_version, last_pushed_at, last_pulled_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        state.memoryId,
        state.localVersion,
        state.remoteVersion ?? null,
        state.lastPushedAt?.toISOString() ?? null,
        state.lastPulledAt?.toISOString() ?? null,
        state.syncStatus,
      );
  }

  markAsPushed(memoryId: string, remoteVersion: number): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE sync_state 
        SET sync_status = 'synced', remote_version = ?, last_pushed_at = ?
        WHERE memory_id = ?
      `)
      .run(remoteVersion, now, memoryId);
  }

  markAsPulled(memoryId: string, localVersion: number): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE sync_state 
        SET sync_status = 'synced', local_version = ?, last_pulled_at = ?
        WHERE memory_id = ?
      `)
      .run(localVersion, now, memoryId);
  }

  markAsConflict(memoryId: string, remoteVersion: number): void {
    this.db
      .prepare(`
        UPDATE sync_state 
        SET sync_status = 'conflict', remote_version = ?
        WHERE memory_id = ?
      `)
      .run(remoteVersion, memoryId);
  }

  getUntrackedMemories(orgId: string, repoId: string): Memory[] {
    const rows = this.db
      .prepare(`
        SELECT m.* FROM memories m
        LEFT JOIN sync_state s ON m.id = s.memory_id
        WHERE m.org_id = ? AND m.repo_id = ? AND s.memory_id IS NULL
        ORDER BY m.created_at ASC
      `)
      .all(orgId, repoId) as Array<Record<string, unknown>>;
    return rows.map(rowToMemory);
  }

  initSyncStateForMemory(memoryId: string): void {
    const memory = this.getById(memoryId);
    if (!memory) return;

    const existing = this.getSyncState(memoryId);
    if (existing) return;

    this.setSyncState({
      memoryId,
      localVersion: memory.version,
      syncStatus: "pending_push",
    });
  }

  getSyncSummary(orgId: string, repoId: string): {
    synced: number;
    pendingPush: number;
    pendingPull: number;
    conflicts: number;
  } {
    const row = this.db
      .prepare(`
        SELECT
          SUM(CASE WHEN s.sync_status = 'synced' THEN 1 ELSE 0 END) as synced,
          SUM(CASE WHEN s.sync_status = 'pending_push' THEN 1 ELSE 0 END) as pending_push,
          SUM(CASE WHEN s.sync_status = 'pending_pull' THEN 1 ELSE 0 END) as pending_pull,
          SUM(CASE WHEN s.sync_status = 'conflict' THEN 1 ELSE 0 END) as conflicts
        FROM sync_state s
        JOIN memories m ON s.memory_id = m.id
        WHERE m.org_id = ? AND m.repo_id = ?
      `)
      .get(orgId, repoId) as Record<string, number>;

    return {
      synced: row.synced ?? 0,
      pendingPush: row.pending_push ?? 0,
      pendingPull: row.pending_pull ?? 0,
      conflicts: row.conflicts ?? 0,
    };
  }

  private rowToSyncState(row: Record<string, unknown>): SyncState {
    return {
      memoryId: row.memory_id as string,
      localVersion: row.local_version as number,
      remoteVersion: row.remote_version as number | undefined,
      lastPushedAt: row.last_pushed_at ? new Date(row.last_pushed_at as string) : undefined,
      lastPulledAt: row.last_pulled_at ? new Date(row.last_pulled_at as string) : undefined,
      syncStatus: row.sync_status as SyncStatus,
    };
  }

  getSupersededMemoriesToSync(orgId: string, repoId: string): Array<{ memory: Memory; newId: string }> {
    const rows = this.db
      .prepare(`
        SELECT m.*
        FROM memories m
        LEFT JOIN sync_state s ON s.memory_id = m.id
        WHERE m.org_id = ?
          AND m.repo_id = ?
          AND m.status = 'superseded'
          AND m.supersedes_id IS NOT NULL
          AND (
            s.memory_id IS NULL
            OR s.sync_status = 'pending_push'
            OR (s.sync_status = 'synced' AND (s.last_pushed_at IS NULL OR s.last_pushed_at < m.updated_at))
          )
      `)
      .all(orgId, repoId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      memory: rowToMemory(row),
      newId: row.supersedes_id as string,
    }));
  }

  getLinksToSync(orgId: string, repoId: string): Array<{ link: MemoryLink; sourceMemoryId: string; targetMemoryId: string }> {
    const rows = this.db
      .prepare(`
        SELECT l.*, ms.id as source_mem_id, mt.id as target_mem_id
        FROM memory_links l
        JOIN memories ms ON ms.id = l.source_id
        JOIN memories mt ON mt.id = l.target_id
        WHERE ms.org_id = ?
          AND ms.repo_id = ?
          AND l.id NOT IN (SELECT link_id FROM synced_links)
      `)
      .all(orgId, repoId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      link: rowToLink(row),
      sourceMemoryId: row.source_mem_id as string,
      targetMemoryId: row.target_mem_id as string,
    }));
  }

  markLinkSynced(linkId: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`INSERT OR IGNORE INTO synced_links (link_id, synced_at) VALUES (?, ?)`)
      .run(linkId, now);
  }

  markStatusSynced(memoryId: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`UPDATE sync_state SET last_pushed_at = ? WHERE memory_id = ?`)
      .run(now, memoryId);
  }

  unconsolidate(consolidationId: string): {
    restoredIds: string[];
    consolidationDeleted: boolean;
    linksRemoved: number;
  } {
    const memory = this.getById(consolidationId);
    if (!memory) {
      throw new Error(`Memory not found: ${consolidationId}`);
    }
    if (!memory.isConsolidation) {
      throw new Error(`Memory ${consolidationId} is not a consolidation`);
    }

    const sourceLinks = this.getLinks({ memoryId: consolidationId, linkType: "derived_from" });
    const sourceIds = sourceLinks
      .filter((l) => l.sourceId === consolidationId)
      .map((l) => l.targetId);

    const now = new Date().toISOString();
    const restoredIds: string[] = [];
    let linksRemoved = 0;

    this.db.transaction(() => {
      for (const sourceId of sourceIds) {
        const source = this.getById(sourceId);
        if (source && source.status === "superseded" && source.supersedesId === consolidationId) {
          this.db
            .prepare(
              `UPDATE memories
               SET status = 'active', supersedes_id = NULL, version = version + 1, updated_at = ?
               WHERE id = ?`,
            )
            .run(now, sourceId);
          restoredIds.push(sourceId);

          this.setSyncState({
            memoryId: sourceId,
            localVersion: (source.version ?? 1) + 1,
            syncStatus: "pending_push",
          });
        }
      }

      // Remove derived_from links from the consolidation to source memories
      const deleteLinksResult = this.db
        .prepare(
          `DELETE FROM memory_links 
           WHERE source_id = ? AND link_type = 'derived_from'`,
        )
        .run(consolidationId);
      linksRemoved = deleteLinksResult.changes;

      // Also remove any links where the consolidation is the target
      const deleteTargetLinksResult = this.db
        .prepare(
          `DELETE FROM memory_links 
           WHERE target_id = ?`,
        )
        .run(consolidationId);
      linksRemoved += deleteTargetLinksResult.changes;

      // Remove from synced_links table if exists
      this.db
        .prepare(
          `DELETE FROM synced_links 
           WHERE link_id IN (
             SELECT id FROM memory_links WHERE source_id = ? OR target_id = ?
           )`,
        )
        .run(consolidationId, consolidationId);

      this.softDelete({
        id: consolidationId,
        deletedBy: "unconsolidate",
      });
    })();

    return {
      restoredIds,
      consolidationDeleted: true,
      linksRemoved,
    };
  }

  cleanupOrphanLinks(): number {
    const result = this.db
      .prepare(
        `DELETE FROM memory_links
         WHERE id IN (
           SELECT ml.id FROM memory_links ml
           LEFT JOIN memories ms ON ms.id = ml.source_id
           LEFT JOIN memories mt ON mt.id = ml.target_id
           WHERE ms.id IS NULL 
              OR mt.id IS NULL
              OR ms.status = 'deleted'
              OR mt.status = 'deleted'
         )`,
      )
      .run();

    this.db
      .prepare(
        `DELETE FROM synced_links
         WHERE link_id NOT IN (SELECT id FROM memory_links)`,
      )
      .run();

    return result.changes;
  }

  async storeEmbedding(
    memoryId: string,
    embedding: number[],
    model: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const blob = serializeEmbedding(embedding);

    this.db
      .prepare(
        `INSERT OR REPLACE INTO memory_embeddings (memory_id, embedding, model, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(memoryId, blob, model, now);
  }

  async generateAndStoreEmbedding(
    memoryId: string,
    text: string,
    config?: EmbeddingConfig
  ): Promise<void> {
    try {
      const result = await generateEmbedding(text, config);
      await this.storeEmbedding(memoryId, result.embedding, result.model);
    } catch (error) {
      console.error(`Failed to generate embedding for ${memoryId}:`, error);
    }
  }

  getEmbedding(memoryId: string): number[] | undefined {
    const row = this.db
      .prepare("SELECT embedding FROM memory_embeddings WHERE memory_id = ?")
      .get(memoryId) as { embedding: Buffer } | undefined;

    if (!row) return undefined;
    return deserializeEmbedding(row.embedding);
  }

  hasEmbedding(memoryId: string): boolean {
    const row = this.db
      .prepare("SELECT 1 FROM memory_embeddings WHERE memory_id = ?")
      .get(memoryId);
    return !!row;
  }

  getAllEmbeddings(
    orgId: string,
    repoId: string
  ): Array<{ memoryId: string; embedding: number[] }> {
    const rows = this.db
      .prepare(
        `SELECT e.memory_id, e.embedding FROM memory_embeddings e
         JOIN memories m ON e.memory_id = m.id
         WHERE m.org_id = ? AND m.repo_id = ? AND m.status = 'active'`
      )
      .all(orgId, repoId) as Array<{ memory_id: string; embedding: Buffer }>;

    return rows.map((row) => ({
      memoryId: row.memory_id,
      embedding: deserializeEmbedding(row.embedding),
    }));
  }

  getMemoriesWithoutEmbeddings(orgId: string, repoId: string): Memory[] {
    const rows = this.db
      .prepare(
        `SELECT m.* FROM memories m
         LEFT JOIN memory_embeddings e ON m.id = e.memory_id
         WHERE m.org_id = ? AND m.repo_id = ? AND m.status = 'active' AND e.memory_id IS NULL`
      )
      .all(orgId, repoId) as Array<Record<string, unknown>>;

    return rows.map(rowToMemory);
  }

  async recallWithEmbeddings(
    query: RecallQuery,
    queryEmbedding?: number[]
  ): Promise<RecallResult[]> {
    const ftsResults = this.recall(query);

    if (!queryEmbedding) {
      return ftsResults;
    }

    const allEmbeddings = this.getAllEmbeddings(query.orgId, query.repoId);

    if (allEmbeddings.length === 0) {
      return ftsResults;
    }

    const embeddingScores = new Map<string, number>();
    for (const { memoryId, embedding } of allEmbeddings) {
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      embeddingScores.set(memoryId, Math.max(0, similarity));
    }

    const ftsIds = new Set(ftsResults.map((r) => r.id));
    const k = query.k ?? 10;
    const usageStats = this.getUsageStats(query.orgId, query.repoId);
    const usageMap = new Map(usageStats.map((stat) => [stat.memoryId, stat]));

    const sortedByEmbedding = Array.from(embeddingScores.entries())
      .filter(([id]) => !ftsIds.has(id))
      .sort((a, b) => b[1] - a[1])
      .slice(0, k);

    const additionalMemories: RecallResult[] = [];
    for (const [memoryId, similarity] of sortedByEmbedding) {
      if (similarity < 0.3) continue;
      const memory = this.getById(memoryId);
      if (
        !memory ||
        memory.status !== "active" ||
        (!query.includeExpired && memory.ttlSeconds && memory.createdAt.getTime() + memory.ttlSeconds * 1000 <= Date.now())
      ) {
        continue;
      }

      const usage = usageMap.get(memory.id);
      const usageBoost = computeUsageBoost(
        usage?.count ?? 0,
        usage?.lastUsed,
      );

      additionalMemories.push({
        id: memory.id,
        memoryType: memory.memoryType,
        text: memory.text,
        summary: memory.summary,
        tags: memory.tags,
        sourceRefs: memory.sourceRefs,
        score: computeHybridScore(0, similarity, memory.createdAt, memory.confidence, usageBoost),
        source: "local",
        status: memory.status,
        supersedesId: memory.supersedesId,
        isConsolidation: memory.isConsolidation,
        consolidationVersion: memory.consolidationVersion,
      });
    }

    const hybridResults = ftsResults.map((r) => {
      const embScore = embeddingScores.get(r.id) ?? 0;
      const memory = this.getById(r.id);
      if (!memory) return r;
      const usage = usageMap.get(r.id);
      const usageBoost = computeUsageBoost(
        usage?.count ?? 0,
        usage?.lastUsed,
      );

      return {
        ...r,
        score: computeHybridScore(r.score, embScore, memory.createdAt, memory.confidence, usageBoost),
      };
    });

    const combined = [...hybridResults, ...additionalMemories];
    return combined.sort((a, b) => b.score - a.score).slice(0, k);
  }

  recordUsage(memoryId: string, query?: string, sessionId?: string): void {
    this.db
      .prepare(
        `INSERT INTO memory_usage (memory_id, query, session_id) VALUES (?, ?, ?)`
      )
      .run(memoryId, query ?? null, sessionId ?? null);
  }

  recordUsageBatch(memoryIds: string[], query?: string, sessionId?: string): void {
    const stmt = this.db.prepare(
      `INSERT INTO memory_usage (memory_id, query, session_id) VALUES (?, ?, ?)`
    );
    const insertMany = this.db.transaction((ids: string[]) => {
      for (const id of ids) {
        stmt.run(id, query ?? null, sessionId ?? null);
      }
    });
    insertMany(memoryIds);
  }

  getUsageCount(memoryId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as cnt FROM memory_usage WHERE memory_id = ?")
      .get(memoryId) as { cnt: number };
    return row.cnt;
  }

  getUsageStats(
    orgId: string,
    repoId: string
  ): Array<{ memoryId: string; count: number; lastUsed: Date }> {
    const rows = this.db
      .prepare(
        `SELECT u.memory_id, COUNT(*) as cnt, MAX(u.recalled_at) as last_used
         FROM memory_usage u
         JOIN memories m ON u.memory_id = m.id
         WHERE m.org_id = ? AND m.repo_id = ?
         GROUP BY u.memory_id
         ORDER BY cnt DESC`
      )
      .all(orgId, repoId) as Array<{
      memory_id: string;
      cnt: number;
      last_used: string;
    }>;

    return rows.map((row) => ({
      memoryId: row.memory_id,
      count: row.cnt,
      lastUsed: new Date(row.last_used),
    }));
  }

  getTopUsedMemories(
    orgId: string,
    repoId: string,
    limit = 10
  ): Array<{ memory: Memory; usageCount: number }> {
    const rows = this.db
      .prepare(
        `SELECT m.*, COUNT(u.id) as usage_count
         FROM memories m
         LEFT JOIN memory_usage u ON m.id = u.memory_id
         WHERE m.org_id = ? AND m.repo_id = ? AND m.status = 'active'
         GROUP BY m.id
         ORDER BY usage_count DESC
         LIMIT ?`
      )
      .all(orgId, repoId, limit) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      memory: rowToMemory(row),
      usageCount: row.usage_count as number,
    }));
  }

  getUnusedMemories(
    orgId: string,
    repoId: string,
    daysSinceCreation = 30
  ): Memory[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysSinceCreation);

    const rows = this.db
      .prepare(
        `SELECT m.* FROM memories m
         LEFT JOIN memory_usage u ON m.id = u.memory_id
         WHERE m.org_id = ? 
           AND m.repo_id = ? 
           AND m.status = 'active'
           AND m.created_at < ?
           AND u.id IS NULL`
      )
      .all(orgId, repoId, cutoff.toISOString()) as Array<Record<string, unknown>>;

    return rows.map(rowToMemory);
  }

  getEmbeddingStats(orgId: string, repoId: string): {
    total: number;
    withEmbedding: number;
    withoutEmbedding: number;
  } {
    const row = this.db
      .prepare(
        `SELECT 
           COUNT(m.id) as total,
           COUNT(e.memory_id) as with_embedding
         FROM memories m
         LEFT JOIN memory_embeddings e ON m.id = e.memory_id
         WHERE m.org_id = ? AND m.repo_id = ? AND m.status = 'active'`
      )
      .get(orgId, repoId) as { total: number; with_embedding: number };

    return {
      total: row.total,
      withEmbedding: row.with_embedding,
      withoutEmbedding: row.total - row.with_embedding,
    };
  }

  resetAll(): { memoriesDeleted: number; linksDeleted: number; embeddingsDeleted: number } {
    const result = this.db.transaction(() => {
      const embeddingsDeleted = this.db.prepare("DELETE FROM memory_embeddings").run().changes;
      const linksDeleted = this.db.prepare("DELETE FROM memory_links").run().changes;
      this.db.prepare("DELETE FROM synced_links").run();
      this.db.prepare("DELETE FROM sync_state").run();
      this.db.prepare("DELETE FROM tombstones").run();
      this.db.prepare("DELETE FROM memory_usage").run();
      const memoriesDeleted = this.db.prepare("DELETE FROM memories").run().changes;
      this.db.exec("INSERT INTO memories_fts(memories_fts) VALUES('rebuild')");
      return { memoriesDeleted, linksDeleted, embeddingsDeleted };
    })();

    return result;
  }

  clearEmbeddings(): number {
    return this.db.prepare("DELETE FROM memory_embeddings").run().changes;
  }

  close(): void {
    this.db.close();
  }
}

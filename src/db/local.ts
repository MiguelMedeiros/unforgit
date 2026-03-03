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
} from "../core/types.js";
import { computeCompositeScore } from "../core/recall.js";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  repo_id TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'repo',
  memory_type TEXT NOT NULL CHECK(memory_type IN ('episodic','semantic','procedural')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','repo')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','deprecated','superseded')),
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
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
  }

  store(input: CreateMemoryInput): Memory {
    const id = uuid();
    const now = new Date().toISOString();
    const visibility =
      input.visibility === "auto" || !input.visibility
        ? "private"
        : input.visibility;

    this.db
      .prepare(
        `INSERT INTO memories
        (id, org_id, repo_id, scope_type, memory_type, visibility, status, text, summary, tags, source_refs, confidence, ttl_seconds, author_id, author_name, created_at, updated_at)
        VALUES (?, ?, ?, 'repo', ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.orgId,
        input.repoId,
        input.memoryType,
        visibility,
        input.text,
        input.summary ?? null,
        JSON.stringify(input.tags ?? []),
        input.sourceRefs ? JSON.stringify(input.sourceRefs) : null,
        input.confidence ?? null,
        input.ttlSeconds ?? null,
        input.authorId ?? null,
        input.authorName ?? null,
        now,
        now,
      );

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

    const ftsQuery = query.query.replace(/[^\w\s]/g, " ").trim();

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

    const rows = this.db.prepare(sql).all(...finalParams) as Array<
      Record<string, unknown>
    >;

    let results = rows.map((row) => {
      const memory = rowToMemory(row);
      const textScore = ftsQuery
        ? Math.min(1, Math.abs(row.fts_rank as number) / 10)
        : 0.5;

      const consolidationBoost = memory.isConsolidation ? 0.1 : 0;

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
        ),
        source: "local" as const,
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
      const ftsQuery = query.search.replace(/[^\w\s]/g, " ").trim();
      if (ftsQuery) {
        conditions.push(
          "rowid IN (SELECT rowid FROM memories_fts WHERE memories_fts MATCH ?)",
        );
        params.push(ftsQuery);
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
      const ftsQuery = query.search.replace(/[^\w\s]/g, " ").trim();
      if (ftsQuery) {
        conditions.push(
          "rowid IN (SELECT rowid FROM memories_fts WHERE memories_fts MATCH ?)",
        );
        params.push(ftsQuery);
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
      byStatus: { active: 0, deprecated: 0, superseded: 0 },
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

  purgeExpired(): number {
    const result = this.db
      .prepare(
        `DELETE FROM memories
         WHERE ttl_seconds IS NOT NULL
           AND datetime(created_at, '+' || ttl_seconds || ' seconds') < datetime('now')`,
      )
      .run();
    return result.changes;
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
    const { orgId, repoId, sourceIds, consolidatedText, memoryType, tags, preserveOriginals = true } = input;

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

    const id = uuid();
    const now = new Date().toISOString();
    const version = 1;

    this.db
      .prepare(
        `INSERT INTO memories
        (id, org_id, repo_id, scope_type, memory_type, visibility, status, text, summary, tags, source_refs, confidence, is_consolidation, consolidation_version, created_at, updated_at)
        VALUES (?, ?, ?, 'repo', ?, 'private', 'active', ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      )
      .run(
        id,
        orgId,
        repoId,
        inferredType,
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

    return {
      consolidatedId: id,
      version,
      sourcesPreserved: sourceIds.length,
      sourceIds,
    };
  }

  reconsolidate(input: ReconsolidateInput): ConsolidateMemoriesResult {
    const { orgId, repoId, existingConsolidationId, additionalSourceIds = [], newText, tags } = input;

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

    const id = uuid();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO memories
        (id, org_id, repo_id, scope_type, memory_type, visibility, status, text, summary, tags, source_refs, confidence, is_consolidation, consolidation_version, created_at, updated_at)
        VALUES (?, ?, ?, 'repo', ?, 'private', 'active', ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      )
      .run(
        id,
        orgId,
        repoId,
        existing.memoryType,
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

  close(): void {
    this.db.close();
  }
}

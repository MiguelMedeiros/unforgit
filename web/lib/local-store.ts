import Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import path from "node:path";
import fs from "node:fs";
import type {
  Memory,
  MemoryLink,
  LinkType,
  CreateMemoryInput,
  ListQuery,
  StoreStats,
  Tombstone,
  DeleteMemoryInput,
} from "./types";

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
`;

function rowToLink(row: Record<string, unknown>): MemoryLink {
  return {
    id: row.id as string,
    sourceId: row.source_id as string,
    targetId: row.target_id as string,
    linkType: row.link_type as LinkType,
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
    scopeType: (row.scope_type as string) ?? "repo",
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

export class WebLocalStore {
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
        (id, org_id, repo_id, scope_type, memory_type, visibility, status, text, summary, tags, source_refs, confidence, ttl_seconds, created_at, updated_at)
        VALUES (?, ?, ?, 'repo', ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      const searchTerm = query.search.trim();
      const uuidPattern = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
      const shortIdPattern = /^[0-9a-f]{7,8}$/i;
      
      if (uuidPattern.test(searchTerm)) {
        conditions.push("id = ?");
        params.push(searchTerm);
      } else if (shortIdPattern.test(searchTerm)) {
        conditions.push("id LIKE ?");
        params.push(`${searchTerm}%`);
      } else {
        const fts = searchTerm.replace(/[^\w\s]/g, " ").trim();
        if (fts) {
          conditions.push(
            "rowid IN (SELECT rowid FROM memories_fts WHERE memories_fts MATCH ?)",
          );
          params.push(fts);
        }
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
      const searchTerm = query.search.trim();
      const uuidPattern = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
      const shortIdPattern = /^[0-9a-f]{7,8}$/i;
      
      if (uuidPattern.test(searchTerm)) {
        conditions.push("id = ?");
        params.push(searchTerm);
      } else if (shortIdPattern.test(searchTerm)) {
        conditions.push("id LIKE ?");
        params.push(`${searchTerm}%`);
      } else {
        const fts = searchTerm.replace(/[^\w\s]/g, " ").trim();
        if (fts) {
          conditions.push(
            "rowid IN (SELECT rowid FROM memories_fts WHERE memories_fts MATCH ?)",
          );
          params.push(fts);
        }
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
      if (row.memory_type in stats.byType)
        stats.byType[row.memory_type as keyof typeof stats.byType] += row.cnt;
      if (row.status in stats.byStatus)
        stats.byStatus[row.status as keyof typeof stats.byStatus] += row.cnt;
      if (row.visibility in stats.byVisibility)
        stats.byVisibility[row.visibility] += row.cnt;
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

  getLinks(memoryId: string, linkType?: string): MemoryLink[] {
    const conditions: string[] = ["(source_id = ? OR target_id = ?)"];
    const params: unknown[] = [memoryId, memoryId];

    if (linkType) {
      conditions.push("link_type = ?");
      params.push(linkType);
    }

    const sql = `SELECT * FROM memory_links WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`;
    const rows = this.db.prepare(sql).all(...params) as Array<
      Record<string, unknown>
    >;
    return rows.map(rowToLink);
  }

  getAllLinks(): MemoryLink[] {
    const rows = this.db
      .prepare("SELECT * FROM memory_links ORDER BY created_at DESC")
      .all() as Array<Record<string, unknown>>;
    return rows.map(rowToLink);
  }

  getLinkedMemories(memoryId: string, linkType?: string): Array<{ memory: Memory; link: MemoryLink }> {
    const links = this.getLinks(memoryId, linkType);
    const result: Array<{ memory: Memory; link: MemoryLink }> = [];

    for (const link of links) {
      const otherId = link.sourceId === memoryId ? link.targetId : link.sourceId;
      const memory = this.getById(otherId);
      if (memory) {
        result.push({ memory, link });
      }
    }

    return result;
  }

  dailyCounts(orgId: string, repoId: string, days: number = 365): Array<{ date: string; count: number }> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];

    const rows = this.db
      .prepare(
        `SELECT date(created_at) as date, COUNT(*) as count
         FROM memories
         WHERE org_id = ? AND repo_id = ? AND date(created_at) >= ?
         GROUP BY date(created_at)
         ORDER BY date ASC`
      )
      .all(orgId, repoId, sinceStr) as Array<{ date: string; count: number }>;

    return rows;
  }

  weeklyTrend(orgId: string, repoId: string, weeks: number = 12): Array<{ week: string; count: number }> {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    const sinceStr = since.toISOString().split("T")[0];

    const rows = this.db
      .prepare(
        `SELECT strftime('%Y-W%W', created_at) as week, COUNT(*) as count
         FROM memories
         WHERE org_id = ? AND repo_id = ? AND date(created_at) >= ?
         GROUP BY strftime('%Y-W%W', created_at)
         ORDER BY week ASC`
      )
      .all(orgId, repoId, sinceStr) as Array<{ week: string; count: number }>;

    return rows;
  }

  topTags(orgId: string, repoId: string, limit: number = 10): Array<{ tag: string; count: number }> {
    const rows = this.db
      .prepare(
        `SELECT tags FROM memories WHERE org_id = ? AND repo_id = ?`
      )
      .all(orgId, repoId) as Array<{ tags: string }>;

    const tagCounts = new Map<string, number>();
    for (const row of rows) {
      const tags = JSON.parse(row.tags) as string[];
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
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

    if (!existing) {
      this.db
        .prepare(
          `INSERT INTO memories
          (id, org_id, repo_id, scope_type, memory_type, visibility, status, text, summary, tags, source_refs, confidence, ttl_seconds, supersedes_id, version, deleted_at, deleted_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          memory.id,
          memory.orgId,
          memory.repoId,
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

    const contentChanged =
      existing.text !== memory.text ||
      existing.status !== memory.status ||
      JSON.stringify(existing.tags) !== JSON.stringify(memory.tags) ||
      existing.memoryType !== memory.memoryType;

    if (!contentChanged) {
      if (existing.visibility !== memory.visibility && memory.visibility === "repo") {
        this.db
          .prepare("UPDATE memories SET visibility = ?, version = ? WHERE id = ?")
          .run(memory.visibility, remoteVersion, memory.id);
        return { action: "updated", conflict: false };
      }
      return { action: "skipped", conflict: false };
    }

    if (remoteVersion <= localVersion && memory.updatedAt <= existing.updatedAt) {
      return { action: "skipped", conflict: false };
    }

    const hasConflict =
      contentChanged &&
      localVersion > 1 &&
      remoteVersion > 1 &&
      localVersion !== remoteVersion &&
      existing.visibility === "repo" &&
      Math.abs(existing.updatedAt.getTime() - memory.updatedAt.getTime()) < 60000;

    this.db
      .prepare(
        `UPDATE memories SET
          memory_type = ?, visibility = ?, status = ?, text = ?, summary = ?, tags = ?,
          source_refs = ?, confidence = ?, ttl_seconds = ?, supersedes_id = ?,
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
        remoteVersion,
        memory.deletedAt?.toISOString() ?? null,
        memory.deletedBy ?? null,
        now,
        memory.id,
      );

    return { action: "updated", conflict: hasConflict };
  }

  upsertLink(link: {
    id: string;
    sourceId: string;
    targetId: string;
    linkType: LinkType;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
  }): { action: "created" | "exists" } {
    const existing = this.db
      .prepare(
        "SELECT id FROM memory_links WHERE source_id = ? AND target_id = ? AND link_type = ?",
      )
      .get(link.sourceId, link.targetId, link.linkType) as { id: string } | undefined;

    if (existing) {
      return { action: "exists" };
    }

    const id = link.id || uuid();
    const createdAt = link.createdAt?.toISOString() ?? new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO memory_links (id, source_id, target_id, link_type, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        link.sourceId,
        link.targetId,
        link.linkType,
        link.metadata ? JSON.stringify(link.metadata) : null,
        createdAt,
      );

    return { action: "created" };
  }
}

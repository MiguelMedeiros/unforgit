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

CREATE TABLE IF NOT EXISTS sync_state (
  memory_id TEXT PRIMARY KEY,
  local_version INTEGER NOT NULL,
  remote_version INTEGER,
  last_pushed_at TEXT,
  last_pulled_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending_push' CHECK(sync_status IN ('synced','pending_push','pending_pull','conflict'))
);

CREATE INDEX IF NOT EXISTS idx_sync_state_status ON sync_state(sync_status);
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
    if (!columnNames.includes("is_consolidation")) {
      this.db.exec("ALTER TABLE memories ADD COLUMN is_consolidation INTEGER NOT NULL DEFAULT 0");
    }
    if (!columnNames.includes("consolidation_version")) {
      this.db.exec("ALTER TABLE memories ADD COLUMN consolidation_version INTEGER");
    }
    if (!columnNames.includes("author_id")) {
      this.db.exec("ALTER TABLE memories ADD COLUMN author_id TEXT");
    }
    if (!columnNames.includes("author_name")) {
      this.db.exec("ALTER TABLE memories ADD COLUMN author_name TEXT");
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

  stats(orgId: string, repoId: string, sinceDate?: Date): StoreStats {
    const conditions = ["org_id = ?", "repo_id = ?"];
    const params: unknown[] = [orgId, repoId];

    if (sinceDate) {
      conditions.push("created_at >= ?");
      params.push(sinceDate.toISOString());
    }

    const rows = this.db
      .prepare(
        `SELECT memory_type, status, visibility, COUNT(*) as cnt
         FROM memories WHERE ${conditions.join(" AND ")}
         GROUP BY memory_type, status, visibility`,
      )
      .all(...params) as Array<{
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

  dailyCounts(orgId: string, repoId: string, days: number = 365, sinceDate?: Date): Array<{ date: string; count: number }> {
    let since: Date;
    if (sinceDate) {
      since = sinceDate;
    } else {
      since = new Date();
      since.setDate(since.getDate() - days);
    }
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

  hourlyCounts(orgId: string, repoId: string): Array<{ hour: string; count: number }> {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sinceStr = since.toISOString();

    const rows = this.db
      .prepare(
        `SELECT strftime('%Y-%m-%d %H:00', created_at) as hour, COUNT(*) as count
         FROM memories
         WHERE org_id = ? AND repo_id = ? AND created_at >= ?
         GROUP BY strftime('%Y-%m-%d %H:00', created_at)
         ORDER BY hour ASC`
      )
      .all(orgId, repoId, sinceStr) as Array<{ hour: string; count: number }>;

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

  topTags(orgId: string, repoId: string, limit: number = 10, sinceDate?: Date): Array<{ tag: string; count: number }> {
    const conditions = ["org_id = ?", "repo_id = ?"];
    const params: unknown[] = [orgId, repoId];

    if (sinceDate) {
      conditions.push("created_at >= ?");
      params.push(sinceDate.toISOString());
    }

    const rows = this.db
      .prepare(
        `SELECT tags FROM memories WHERE ${conditions.join(" AND ")}`
      )
      .all(...params) as Array<{ tags: string }>;

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

  recall(query: {
    orgId: string;
    repoId: string;
    query: string;
    types?: string[];
    k?: number;
  }): Array<Memory & { score: number }> {
    const conditions: string[] = ["m.org_id = ?", "m.repo_id = ?", "m.status = 'active'"];
    const params: unknown[] = [query.orgId, query.repoId];

    if (query.types && query.types.length > 0) {
      conditions.push(`m.memory_type IN (${query.types.map(() => "?").join(",")})`);
      params.push(...query.types);
    }

    const rawQuery = query.query.replace(/[^\w\s]/g, " ").trim();
    const words = rawQuery.split(/\s+/).filter((w) => w.length >= 2);
    const ftsQuery = words.length > 0 ? `(${words.map((w) => `${w}*`).join(" OR ")})` : "";

    const k = query.k ?? 10;

    if (!ftsQuery) {
      const sql = `SELECT * FROM memories m WHERE ${conditions.join(" AND ")} ORDER BY m.created_at DESC LIMIT ?`;
      params.push(k);
      const rows = this.db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
      return rows.map((row) => ({ ...rowToMemory(row), score: 0.5 }));
    }

    const sql = `
      SELECT m.*, fts.rank as fts_rank
      FROM memories m
      JOIN memories_fts fts ON m.rowid = fts.rowid
      WHERE ${conditions.join(" AND ")}
        AND fts.memories_fts MATCH ?
      ORDER BY fts.rank
      LIMIT ?
    `;
    params.push(ftsQuery, k);

    const rows = this.db.prepare(sql).all(...params) as Array<Record<string, unknown>>;

    return rows.map((row) => {
      const memory = rowToMemory(row);
      const textScore = Math.min(1, Math.abs(row.fts_rank as number) / 10);
      const ageDays = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const recency = Math.max(0, 1 - ageDays / 365);
      const conf = memory.confidence ?? 0.5;
      const score = textScore * 0.6 + recency * 0.2 + conf * 0.2;
      return { ...memory, score };
    }).sort((a, b) => b.score - a.score);
  }

  findSimilar(query: {
    orgId: string;
    repoId: string;
    memoryId: string;
    threshold?: number;
    k?: number;
  }): Array<Memory & { score: number }> {
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

  link(input: {
    sourceId: string;
    targetId: string;
    linkType: LinkType;
    metadata?: Record<string, unknown>;
  }): void {
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
  }

  consolidateMemories(input: {
    orgId: string;
    repoId: string;
    sourceIds: string[];
    consolidatedText: string;
    memoryType?: string;
    tags?: string[];
    preserveOriginals?: boolean;
  }): { consolidatedId: string; version: number; sourcesPreserved: number; sourceIds: string[] } {
    const { orgId, repoId, sourceIds, consolidatedText, preserveOriginals = true } = input;

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

    const inferredType = input.memoryType ?? this.inferMemoryType(sourceMemories);
    const mergedTags = input.tags ?? this.mergeTags(sourceMemories);

    const id = uuid();
    const now = new Date().toISOString();
    const version = 1;

    try {
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
    } catch {
      this.db
        .prepare(
          `INSERT INTO memories
          (id, org_id, repo_id, scope_type, memory_type, visibility, status, text, summary, tags, source_refs, confidence, created_at, updated_at)
          VALUES (?, ?, ?, 'repo', ?, 'private', 'active', ?, ?, ?, ?, ?, ?, ?)`,
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
          now,
          now,
        );
    }

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

  private inferMemoryType(memories: Memory[]): string {
    const hasProcedural = memories.some((m) => m.memoryType === "procedural");
    const hasSemantic = memories.some((m) => m.memoryType === "semantic");
    if (hasProcedural) return "procedural";
    if (hasSemantic) return "semantic";
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

    const sourceLinks = this.getLinks(consolidationId, "derived_from");
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
    // Remove links where either source or target memory is deleted or doesn't exist
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

    return result.changes;
  }

  getSyncSummary(orgId: string, repoId: string): {
    synced: number;
    pendingPush: number;
    pendingPull: number;
    conflicts: number;
    notTracked: number;
  } {
    const syncTables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sync_state'")
      .all() as Array<{ name: string }>;

    if (syncTables.length === 0) {
      const total = this.db
        .prepare("SELECT COUNT(*) as count FROM memories WHERE org_id = ? AND repo_id = ? AND status != 'deleted'")
        .get(orgId, repoId) as { count: number };
      return {
        synced: 0,
        pendingPush: 0,
        pendingPull: 0,
        conflicts: 0,
        notTracked: total.count,
      };
    }

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

    const notTracked = this.db
      .prepare(`
        SELECT COUNT(*) as count FROM memories m
        LEFT JOIN sync_state s ON m.id = s.memory_id
        WHERE m.org_id = ? AND m.repo_id = ? AND m.status != 'deleted' AND s.memory_id IS NULL
      `)
      .get(orgId, repoId) as { count: number };

    return {
      synced: row.synced ?? 0,
      pendingPush: row.pending_push ?? 0,
      pendingPull: row.pending_pull ?? 0,
      conflicts: row.conflicts ?? 0,
      notTracked: notTracked.count,
    };
  }

  hasEmbedding(memoryId: string): boolean {
    const embeddingsTable = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_embeddings'")
      .all() as Array<{ name: string }>;

    if (embeddingsTable.length === 0) return false;

    const row = this.db
      .prepare("SELECT 1 FROM memory_embeddings WHERE memory_id = ?")
      .get(memoryId);
    return !!row;
  }

  getUsageStats(orgId: string, repoId: string): Array<{
    memoryId: string;
    count: number;
    lastUsed: Date;
  }> {
    const usageTable = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_usage'")
      .all() as Array<{ name: string }>;

    if (usageTable.length === 0) return [];

    const rows = this.db
      .prepare(`
        SELECT 
          mu.memory_id,
          COUNT(*) as count,
          MAX(mu.recalled_at) as last_used
        FROM memory_usage mu
        JOIN memories m ON mu.memory_id = m.id
        WHERE m.org_id = ? AND m.repo_id = ?
        GROUP BY mu.memory_id
      `)
      .all(orgId, repoId) as Array<{
        memory_id: string;
        count: number;
        last_used: string;
      }>;

    return rows.map((r) => ({
      memoryId: r.memory_id,
      count: r.count,
      lastUsed: new Date(r.last_used),
    }));
  }

  getMemoriesWithoutEmbeddings(orgId: string, repoId: string): Memory[] {
    const embeddingsTable = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_embeddings'")
      .all() as Array<{ name: string }>;

    if (embeddingsTable.length === 0) {
      return this.list({ orgId, repoId, status: ["active"] });
    }

    const rows = this.db
      .prepare(`
        SELECT m.* FROM memories m
        LEFT JOIN memory_embeddings e ON m.id = e.memory_id
        WHERE m.org_id = ? AND m.repo_id = ? AND m.status = 'active' AND e.memory_id IS NULL
        ORDER BY m.created_at DESC
      `)
      .all(orgId, repoId) as Array<Record<string, unknown>>;

    return rows.map(rowToMemory);
  }

  getEmbeddingStats(orgId: string, repoId: string): {
    total: number;
    withEmbeddings: number;
    withoutEmbeddings: number;
    coverage: number;
  } {
    const total = this.db
      .prepare("SELECT COUNT(*) as count FROM memories WHERE org_id = ? AND repo_id = ? AND status = 'active'")
      .get(orgId, repoId) as { count: number };

    const embeddingsTable = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_embeddings'")
      .all() as Array<{ name: string }>;

    if (embeddingsTable.length === 0) {
      return {
        total: total.count,
        withEmbeddings: 0,
        withoutEmbeddings: total.count,
        coverage: 0,
      };
    }

    const withEmbeddings = this.db
      .prepare(`
        SELECT COUNT(*) as count FROM memories m
        JOIN memory_embeddings e ON m.id = e.memory_id
        WHERE m.org_id = ? AND m.repo_id = ? AND m.status = 'active'
      `)
      .get(orgId, repoId) as { count: number };

    return {
      total: total.count,
      withEmbeddings: withEmbeddings.count,
      withoutEmbeddings: total.count - withEmbeddings.count,
      coverage: total.count > 0 ? withEmbeddings.count / total.count : 1,
    };
  }

  storeEmbedding(memoryId: string, embedding: number[], model: string): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_embeddings (
        memory_id TEXT PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
        embedding BLOB NOT NULL,
        model TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    const buffer = Buffer.alloc(embedding.length * 4);
    for (let i = 0; i < embedding.length; i++) {
      buffer.writeFloatLE(embedding[i], i * 4);
    }

    this.db
      .prepare(`
        INSERT OR REPLACE INTO memory_embeddings (memory_id, embedding, model, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `)
      .run(memoryId, buffer, model);
  }

  getTopUsedMemories(orgId: string, repoId: string, limit: number = 10): Array<{
    memory: Memory;
    usageCount: number;
  }> {
    const usageTable = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_usage'")
      .all() as Array<{ name: string }>;

    if (usageTable.length === 0) return [];

    const rows = this.db
      .prepare(`
        SELECT 
          m.*,
          COUNT(mu.id) as usage_count
        FROM memories m
        JOIN memory_usage mu ON m.id = mu.memory_id
        WHERE m.org_id = ? AND m.repo_id = ? AND m.status = 'active'
        GROUP BY m.id
        ORDER BY usage_count DESC
        LIMIT ?
      `)
      .all(orgId, repoId, limit) as Array<Record<string, unknown> & { usage_count: number }>;

    return rows.map((row) => ({
      memory: rowToMemory(row),
      usageCount: row.usage_count,
    }));
  }
}

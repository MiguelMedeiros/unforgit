import Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import path from "node:path";
import fs from "node:fs";
import type {
  Memory,
  CreateMemoryInput,
  RecallQuery,
  RecallResult,
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
`;

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
    this.db.exec(SCHEMA_SQL);
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
        ORDER BY fts.rank
        LIMIT ?
      `;
      finalParams = [ftsQuery, ...params, k * 2];
    } else {
      sql = `
        SELECT m.*, 0 AS fts_rank
        FROM memories m
        WHERE ${whereClause}
        ORDER BY m.created_at DESC
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

      return {
        id: memory.id,
        memoryType: memory.memoryType,
        text: memory.text,
        summary: memory.summary,
        tags: memory.tags,
        sourceRefs: memory.sourceRefs,
        score: computeCompositeScore(
          textScore,
          memory.createdAt,
          memory.confidence,
        ),
        source: "local" as const,
      };
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

  close(): void {
    this.db.close();
  }
}

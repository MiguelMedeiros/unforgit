import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeSqliteDatabase } from "../sqlite.js";

describe("NodeSqliteDatabase", () => {
  let tmpDir: string;
  let db: NodeSqliteDatabase;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-node-sqlite-"));
    db = new NodeSqliteDatabase(path.join(tmpDir, "local.db"));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("supports the synchronous statement and pragma contract", () => {
    expect(db.pragma("journal_mode = WAL")).toEqual([{ journal_mode: "wal" }]);
    db.exec("CREATE TABLE items (id INTEGER PRIMARY KEY, value TEXT NOT NULL)");

    const result = db.prepare("INSERT INTO items (value) VALUES (?)").run("first");

    expect(result.changes).toBe(1);
    expect(typeof result.changes).toBe("number");
    expect(db.prepare("SELECT value FROM items WHERE id = ?").get(1)).toEqual({
      value: "first",
    });
    expect(db.prepare("SELECT value FROM items ORDER BY id").all()).toEqual([
      { value: "first" },
    ]);
  });

  it("returns SQLite blobs as Node buffers", () => {
    db.exec("CREATE TABLE blobs (value BLOB NOT NULL)");
    db.prepare("INSERT INTO blobs (value) VALUES (?)").run(
      Buffer.from([0, 1, 2, 255]),
    );

    const row = db.prepare("SELECT value FROM blobs").get();

    expect(Buffer.isBuffer(row?.value)).toBe(true);
    expect(row?.value).toEqual(Buffer.from([0, 1, 2, 255]));
  });

  it("allows repeated close calls", () => {
    db.close();

    expect(() => db.close()).not.toThrow();
    db = new NodeSqliteDatabase(path.join(tmpDir, "local.db"));
  });

  it("rolls back failed transactions", () => {
    db.exec("CREATE TABLE items (value TEXT NOT NULL)");
    const insert = db.prepare("INSERT INTO items (value) VALUES (?)");
    const failing = db.transaction(() => {
      insert.run("rolled back");
      throw new Error("stop");
    });

    expect(() => failing()).toThrow("stop");
    expect(db.prepare("SELECT value FROM items").all()).toEqual([]);
  });

  it("uses savepoints for nested transactions", () => {
    db.exec("CREATE TABLE items (value TEXT NOT NULL)");
    const insert = db.prepare("INSERT INTO items (value) VALUES (?)");
    const inner = db.transaction(() => {
      insert.run("inner");
      throw new Error("inner failed");
    });
    const outer = db.transaction(() => {
      insert.run("before");
      expect(() => inner()).toThrow("inner failed");
      insert.run("after");
    });

    outer();

    expect(db.prepare("SELECT value FROM items ORDER BY rowid").all()).toEqual([
      { value: "before" },
      { value: "after" },
    ]);
  });

  it("preserves database files across the previous and built-in drivers", () => {
    db.close();
    const dbPath = path.join(tmpDir, "local.db");
    const requireFromWeb = createRequire(path.resolve("apps/web/package.json"));
    const BetterSqlite = requireFromWeb("better-sqlite3") as new (
      filename: string,
    ) => {
      exec(sql: string): void;
      prepare(sql: string): {
        run(...params: unknown[]): unknown;
        get(...params: unknown[]): Record<string, unknown> | undefined;
      };
      close(): void;
    };

    const previousDriver = new BetterSqlite(dbPath);
    previousDriver.exec("CREATE TABLE compatibility (value TEXT NOT NULL)");
    previousDriver.prepare("INSERT INTO compatibility (value) VALUES (?)").run("previous");
    previousDriver.close();

    db = new NodeSqliteDatabase(dbPath);
    expect(db.prepare("SELECT value FROM compatibility").get()).toEqual({
      value: "previous",
    });
    db.prepare("INSERT INTO compatibility (value) VALUES (?)").run("built-in");
    db.close();

    const reopenedWithPreviousDriver = new BetterSqlite(dbPath);
    expect(
      reopenedWithPreviousDriver
        .prepare("PRAGMA integrity_check")
        .get(),
    ).toEqual({ integrity_check: "ok" });
    expect(
      reopenedWithPreviousDriver
        .prepare("SELECT value FROM compatibility WHERE value = ?")
        .get("built-in"),
    ).toEqual({ value: "built-in" });
    reopenedWithPreviousDriver.close();

    db = new NodeSqliteDatabase(dbPath);
  });
});

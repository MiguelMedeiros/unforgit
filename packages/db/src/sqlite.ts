import { DatabaseSync, type SQLInputValue, type StatementSync } from "node:sqlite";

export type SqliteRunResult = {
  changes: number;
  lastInsertRowid: number | bigint;
};

export type SqliteStatement = {
  run(...params: unknown[]): SqliteRunResult;
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Array<Record<string, unknown>>;
};

export type SqliteTransaction<Args extends unknown[], Result> = ((
  ...args: Args
) => Result) & {
  deferred(...args: Args): Result;
  immediate(...args: Args): Result;
  exclusive(...args: Args): Result;
};

function asSqlInputValues(params: unknown[]): SQLInputValue[] {
  return params as SQLInputValue[];
}

function normalizeRow(
  row: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!row) return undefined;

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Uint8Array && !Buffer.isBuffer(value)
        ? Buffer.from(value)
        : value,
    ]),
  );
}

class NodeSqliteStatement implements SqliteStatement {
  constructor(private readonly statement: StatementSync) {}

  run(...params: unknown[]): SqliteRunResult {
    const result = this.statement.run(...asSqlInputValues(params));
    return {
      changes: Number(result.changes),
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  get(...params: unknown[]): Record<string, unknown> | undefined {
    return normalizeRow(
      this.statement.get(...asSqlInputValues(params)) as
        | Record<string, unknown>
        | undefined,
    );
  }

  all(...params: unknown[]): Array<Record<string, unknown>> {
    return (
      this.statement.all(...asSqlInputValues(params)) as Array<
        Record<string, unknown>
      >
    ).map((row) => normalizeRow(row)!);
  }
}

export class NodeSqliteDatabase {
  private readonly database: DatabaseSync;
  private transactionDepth = 0;
  private nextSavepointId = 0;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
  }

  exec(sql: string): void {
    this.database.exec(sql);
  }

  prepare(sql: string): SqliteStatement {
    return new NodeSqliteStatement(this.database.prepare(sql));
  }

  pragma(source: string): Array<Record<string, unknown>> {
    return this.prepare(`PRAGMA ${source}`).all();
  }

  transaction<Args extends unknown[], Result>(
    callback: (...args: Args) => Result,
  ): SqliteTransaction<Args, Result> {
    const execute = (
      mode: "DEFERRED" | "IMMEDIATE" | "EXCLUSIVE",
      args: Args,
    ): Result => {
      const isOuterTransaction = this.transactionDepth === 0;
      const savepoint = `unforgit_${this.nextSavepointId++}`;

      this.exec(
        isOuterTransaction ? `BEGIN ${mode}` : `SAVEPOINT ${savepoint}`,
      );
      this.transactionDepth += 1;

      try {
        const result = callback(...args);
        this.exec(isOuterTransaction ? "COMMIT" : `RELEASE ${savepoint}`);
        return result;
      } catch (error) {
        if (isOuterTransaction) {
          this.exec("ROLLBACK");
        } else {
          this.exec(`ROLLBACK TO ${savepoint}`);
          this.exec(`RELEASE ${savepoint}`);
        }
        throw error;
      } finally {
        this.transactionDepth -= 1;
      }
    };

    const transaction = ((...args: Args): Result =>
      execute("DEFERRED", args)) as SqliteTransaction<Args, Result>;
    transaction.deferred = (...args: Args): Result => execute("DEFERRED", args);
    transaction.immediate = (...args: Args): Result => execute("IMMEDIATE", args);
    transaction.exclusive = (...args: Args): Result => execute("EXCLUSIVE", args);
    return transaction;
  }

  close(): void {
    if (this.database.isOpen) {
      this.database.close();
    }
  }
}

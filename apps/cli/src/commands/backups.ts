import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { getDbPath } from "unforgit-config";
import { logger } from "../logger.js";
import { confirm } from "../utils.js";
import { EXIT_ERROR } from "../exit-codes.js";

export type LocalResetBackup = {
  name: string;
  dir: string;
  files: string[];
  sizeBytes: number;
  createdAt: string;
};

export type LocalResetRestore = {
  restoredFrom: LocalResetBackup;
  safetyBackup: LocalResetBackup | null;
};

function formatBackupTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .replace(/\.\d{3}Z$/, "");
}

function backupRootForDb(dbPath: string): string {
  return path.join(path.dirname(dbPath), "backups");
}

function describeBackup(dir: string): LocalResetBackup {
  const files = fs
    .readdirSync(dir)
    .filter((file) => file === "local.db" || file === "local.db-wal" || file === "local.db-shm")
    .sort();
  const sizeBytes = files.reduce((total, file) => total + fs.statSync(path.join(dir, file)).size, 0);
  const stat = fs.statSync(dir);
  return {
    name: path.basename(dir),
    dir,
    files,
    sizeBytes,
    createdAt: stat.mtime.toISOString(),
  };
}

function resolveBackupDir(backupRoot: string, backupName: string): string {
  if (backupName !== path.basename(backupName)) {
    throw new Error("Invalid backup name");
  }
  const resolvedRoot = path.resolve(backupRoot);
  const resolvedBackup = path.resolve(resolvedRoot, backupName);
  if (!resolvedBackup.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Invalid backup name");
  }
  return resolvedBackup;
}

export function createLocalResetBackup(
  dbPath: string,
  now: Date = new Date(),
): LocalResetBackup | null {
  if (!fs.existsSync(dbPath)) {
    return null;
  }

  const backupRoot = backupRootForDb(dbPath);
  const baseName = `reset-${formatBackupTimestamp(now)}`;
  let backupDir = path.join(backupRoot, baseName);
  let suffix = 1;
  while (fs.existsSync(backupDir)) {
    backupDir = path.join(backupRoot, `${baseName}-${suffix++}`);
  }

  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });

  for (const source of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (!fs.existsSync(source)) continue;
    fs.copyFileSync(source, path.join(backupDir, path.basename(source)));
  }

  return describeBackup(backupDir);
}

export function listLocalResetBackups(dbPath: string): LocalResetBackup[] {
  const backupRoot = backupRootForDb(dbPath);
  if (!fs.existsSync(backupRoot)) {
    return [];
  }

  return fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("reset-"))
    .map((entry) => describeBackup(path.join(backupRoot, entry.name)))
    .filter((backup) => backup.files.includes("local.db"))
    .sort((a, b) => b.name.localeCompare(a.name));
}

export function restoreLocalResetBackup(
  dbPath: string,
  backupName: string,
  now: Date = new Date(),
): LocalResetRestore {
  const backupRoot = backupRootForDb(dbPath);
  const backupDir = resolveBackupDir(backupRoot, backupName);
  if (!fs.existsSync(backupDir) || !fs.statSync(backupDir).isDirectory()) {
    throw new Error(`Backup not found: ${backupName}`);
  }

  const restoredFrom = describeBackup(backupDir);
  if (!restoredFrom.files.includes("local.db")) {
    throw new Error(`Backup is missing local.db: ${backupName}`);
  }

  const safetyBackup = createLocalResetBackup(dbPath, now);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  for (const target of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }
  }

  for (const file of restoredFrom.files) {
    fs.copyFileSync(path.join(backupDir, file), path.join(path.dirname(dbPath), file));
  }

  return { restoredFrom, safetyBackup };
}

export const backupsCommand = new Command("backups")
  .description("List and restore local reset backups");

backupsCommand
  .command("list")
  .description("List local backups created before destructive resets/restores")
  .action(() => {
    const backups = listLocalResetBackups(getDbPath());
    if (backups.length === 0) {
      logger.info("No local reset backups found.");
      return;
    }

    for (const backup of backups) {
      logger.info(`${backup.name}\t${backup.sizeBytes} bytes\t${backup.dir}`);
    }
  });

backupsCommand
  .command("restore")
  .argument("<name>", "Backup directory name, for example reset-20260610-123456")
  .description("Restore a local reset backup into the active local database")
  .option("--force", "Skip confirmation prompt")
  .action(async (name: string, opts: { force?: boolean }) => {
    if (!opts.force) {
      const ok = await confirm(
        "This will replace the active local database after creating a safety backup. Continue?",
      );
      if (!ok) {
        logger.info("Aborted.");
        return;
      }
    }

    try {
      const result = restoreLocalResetBackup(getDbPath(), name);
      logger.info(`Restored local database from ${result.restoredFrom.name}`);
      if (result.safetyBackup) {
        logger.info(`Previous local database safety backup: ${result.safetyBackup.dir}`);
      }
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      process.exit(EXIT_ERROR);
    }
  });

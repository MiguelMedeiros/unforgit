import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";
import YAML from "yaml";
import type { AppConfig } from "unforgit-shared";

export function createTempDataDir(configOverrides?: Partial<AppConfig>): {
  dir: string;
  dataDir: string;
  configPath: string;
  dbPath: string;
  cleanup: () => void;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-test-"));
  const dataDir = path.join(dir, ".unforgit");
  fs.mkdirSync(dataDir, { recursive: true });

  const config: AppConfig = {
    remote: {
      url: "http://localhost:3737",
      orgId: "test-org",
      repoId: "test-repo",
      ...configOverrides?.remote,
    },
    defaults: {
      visibility: "auto",
      memoryType: "episodic",
      ...configOverrides?.defaults,
    },
    sync: {
      enabled: true,
      intervalMs: 60000,
      debounceMs: 5000,
      autoResolveConflicts: "last_write_wins",
      ...configOverrides?.sync,
    },
    embeddings: {
      enabled: true,
      model: "text-embedding-3-small",
      autoGenerate: true,
      ...configOverrides?.embeddings,
    },
  };

  const configPath = path.join(dataDir, "unforgit.yaml");
  fs.writeFileSync(configPath, YAML.stringify(config), "utf-8");

  const dbPath = path.join(dataDir, "local.db");

  return {
    dir,
    dataDir,
    configPath,
    dbPath,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

export function writeConfig(configPath: string, config: Record<string, unknown>): void {
  fs.writeFileSync(configPath, YAML.stringify(config), "utf-8");
}

const originalFetch = globalThis.fetch;

export function mockFetch(
  responses: Array<{ status: number; body?: unknown; delay?: number }>,
): void {
  let callIndex = 0;
  globalThis.fetch = vi.fn(async () => {
    const resp = responses[Math.min(callIndex++, responses.length - 1)];
    if (resp.delay) {
      await new Promise((r) => setTimeout(r, resp.delay));
    }
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: async () => resp.body,
      text: async () => JSON.stringify(resp.body ?? ""),
    } as Response;
  });
}

export function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

export async function runCommand(
  args: string[],
  options: { cwd?: string } = {},
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const appRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const tsxPath = path.join(appRoot, "node_modules", ".bin", "tsx");
  const entryPoint = path.join(appRoot, "src", "index.ts");

  try {
    const nodeOptions = [process.env.NODE_OPTIONS, "--conditions source"]
      .filter(Boolean)
      .join(" ");
    const { stdout, stderr } = await execFileAsync(tsxPath, [entryPoint, ...args], {
      timeout: 15_000,
      env: { ...process.env, NODE_ENV: "test", NODE_OPTIONS: nodeOptions },
      cwd: options.cwd ?? process.cwd(),
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: execErr.stdout ?? "",
      stderr: execErr.stderr ?? "",
      exitCode: execErr.code ?? 1,
    };
  }
}

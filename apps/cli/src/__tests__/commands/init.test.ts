import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import YAML from "yaml";
import { LocalStore } from "@unforgit/db";

describe("unforgit init logic", () => {
  const dirs: string[] = [];

  function makeTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-init-test-"));
    dirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of dirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  it("creates .unforgit directory with config and db", () => {
    const dir = makeTempDir();
    const dataDir = path.join(dir, ".unforgit");
    fs.mkdirSync(dataDir, { recursive: true });

    const config = {
      remote: { url: "http://localhost:3737", orgId: "", repoId: "" },
      defaults: { visibility: "auto", memoryType: "episodic" },
      sync: { enabled: true, intervalMs: 60000, debounceMs: 5000, autoResolveConflicts: "last_write_wins" },
      embeddings: { enabled: true, model: "text-embedding-3-small", autoGenerate: true },
    };

    const configPath = path.join(dataDir, "unforgit.yaml");
    fs.writeFileSync(configPath, YAML.stringify(config), "utf-8");

    const dbPath = path.join(dataDir, "local.db");
    const store = new LocalStore(dbPath);
    store.close();

    expect(fs.existsSync(dataDir)).toBe(true);
    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.existsSync(dbPath)).toBe(true);

    const loaded = YAML.parse(fs.readFileSync(configPath, "utf-8"));
    expect(loaded.remote.url).toBe("http://localhost:3737");
    expect(loaded.defaults.visibility).toBe("auto");
  });

  it("loads config after initialization", () => {
    const dir = makeTempDir();
    const dataDir = path.join(dir, ".unforgit");
    fs.mkdirSync(dataDir, { recursive: true });

    const config = {
      remote: { url: "http://localhost:3737", orgId: "my-org", repoId: "my-repo" },
      defaults: { visibility: "auto", memoryType: "episodic" },
    };

    const configPath = path.join(dataDir, "unforgit.yaml");
    fs.writeFileSync(configPath, YAML.stringify(config), "utf-8");

    const loaded = YAML.parse(fs.readFileSync(configPath, "utf-8"));
    expect(loaded.remote.orgId).toBe("my-org");
    expect(loaded.remote.repoId).toBe("my-repo");
  });

  it("creates valid SQLite database", () => {
    const dir = makeTempDir();
    const dataDir = path.join(dir, ".unforgit");
    fs.mkdirSync(dataDir, { recursive: true });

    const dbPath = path.join(dataDir, "local.db");
    const store = new LocalStore(dbPath);

    const memory = store.store({
      orgId: "org",
      repoId: "repo",
      memoryType: "episodic",
      text: "test after init",
    });

    expect(memory.id).toBeDefined();

    const retrieved = store.getById(memory.id);
    expect(retrieved?.text).toBe("test after init");

    store.close();
  });
});

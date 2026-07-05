import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createTempDataDir, runCommand } from "../helpers.js";
import { LocalStore } from "unforgit-db";

describe("md command", () => {
  let tmp: ReturnType<typeof createTempDataDir>;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmp = createTempDataDir();
    process.chdir(tmp.dir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    tmp.cleanup();
  });

  it("dry-runs markdown import with parsed count, skipped secrets, and no database writes", async () => {
    const memoryPath = path.join(tmp.dir, "CLAUDE.md");
    fs.writeFileSync(memoryPath, `# Project Memory\n\n## Conventions\n\n- Use UTC timestamps everywhere.\n- Deployment secret is placeholder-secret-value\n`, "utf-8");

    const result = await runCommand(["md", "import", memoryPath, "--dry-run", "--json"], { cwd: tmp.dir });

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({ parsed: 2, importable: 1, skippedUnsafe: 1, stored: 0, dryRun: true });

    const store = new LocalStore(tmp.dbPath);
    try {
      expect(store.count({ orgId: "test-org", repoId: "test-repo" })).toBe(0);
    } finally {
      store.close();
    }
  });

  it("imports safe markdown bullets and records markdown provenance", async () => {
    const memoryPath = path.join(tmp.dir, "MEMORY.md");
    fs.writeFileSync(memoryPath, `# Memory\n\n## Playbooks\n\n<!-- unforgit:id=external-1 type=procedural tags=deploy,agent-memory -->\n- To deploy the website, rebuild the container.\n`, "utf-8");

    const result = await runCommand(["md", "import", memoryPath, "--apply", "--json"], { cwd: tmp.dir });

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({ parsed: 1, importable: 1, skippedUnsafe: 0, stored: 1, dryRun: false });

    const store = new LocalStore(tmp.dbPath);
    try {
      const memories = store.list({ orgId: "test-org", repoId: "test-repo", limit: 10 });
      expect(memories).toHaveLength(1);
      expect(memories[0]).toMatchObject({
        memoryType: "procedural",
        text: "To deploy the website, rebuild the container.",
      });
      expect(memories[0].tags).toEqual(expect.arrayContaining(["deploy", "agent-memory"]));
      expect(memories[0].sourceRefs).toMatchObject({
        markdown: {
          sourceFile: memoryPath,
          sourceId: "external-1",
          lineStart: 6,
        },
      });
    } finally {
      store.close();
    }
  });

  it("exports active memories into a Claude-compatible markdown file", async () => {
    const store = new LocalStore(tmp.dbPath);
    try {
      store.store({
        orgId: "test-org",
        repoId: "test-repo",
        memoryType: "semantic",
        text: "Use UTC timestamps everywhere.",
        tags: ["convention"],
        visibility: "private",
      });
    } finally {
      store.close();
    }

    const outPath = path.join(tmp.dir, "CLAUDE.md");
    const result = await runCommand(["md", "export", "--format", "claude", "--out", outPath, "--json"], { cwd: tmp.dir });

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({ exported: 1, out: outPath });
    expect(fs.readFileSync(outPath, "utf-8")).toContain("# CLAUDE.md");
    expect(fs.readFileSync(outPath, "utf-8")).toContain("- Use UTC timestamps everywhere.");
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTempHippoDir, runCommand } from "../helpers.js";
import { LocalStore } from "@unforgit/db";

describe("curate command", () => {
  let tmp: ReturnType<typeof createTempHippoDir>;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmp = createTempHippoDir();
    process.chdir(tmp.dir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    tmp.cleanup();
  });

  it("previews lifecycle maintenance and reports expired candidates", async () => {
    const store = new LocalStore(tmp.dbPath);
    try {
      const expiredAt = new Date(Date.now() - 5_000);
      store.upsertFromRemote({
        id: "expired-curate-1",
        orgId: "test-org",
        repoId: "test-repo",
        scopeType: "repo",
        memoryType: "episodic",
        visibility: "private",
        status: "active",
        text: "Ephemeral prompt experiment",
        tags: [],
        ttlSeconds: 1,
        version: 1,
        createdAt: expiredAt,
        updatedAt: new Date(),
      });
    } finally {
      store.close();
    }

    const result = await runCommand(["curate"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Lifecycle maintenance preview");
    expect(result.stdout).toContain("Expiring episodic memories: 1");
  });
});

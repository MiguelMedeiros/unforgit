import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const eslint = new ESLint({ cwd: repoRoot });

describe("repository ESLint discovery", () => {
  it.each([".awp-worktrees/stale/source.ts", ".awp-evidence/run/output.ts"])(
    "ignores generated agent path %s",
    async (relativePath) => {
      await expect(eslint.isPathIgnored(path.join(repoRoot, relativePath))).resolves.toBe(true);
    },
  );

  it("keeps tracked product source in lint discovery", async () => {
    await expect(
      eslint.isPathIgnored(path.join(repoRoot, "apps/api/src/index.ts")),
    ).resolves.toBe(false);
  });
});

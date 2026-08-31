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

describe("canonical React lint annotations", () => {
  const recurringWarningRules = new Set([
    "@typescript-eslint/no-explicit-any",
    "react-hooks/set-state-in-effect",
    "react-refresh/only-export-components",
  ]);

  it("does not emit the recurring warning classes from product source", async () => {
    const results = await eslint.lintFiles([
      "apps/admin/**/*.{ts,tsx}",
      "apps/web/**/*.{ts,tsx}",
      "apps/website/**/*.{ts,tsx}",
    ]);
    const warnings = results.flatMap((result) =>
      result.messages
        .filter((message) => message.ruleId && recurringWarningRules.has(message.ruleId))
        .map((message) => ({
          file: path.relative(repoRoot, result.filePath),
          line: message.line,
          ruleId: message.ruleId,
        })),
    );

    expect(warnings).toEqual([]);
  });

  it("allows Next.js metadata exports next to app components", async () => {
    const [result] = await eslint.lintText(
      [
        'import type { Metadata } from "next";',
        'export const metadata: Metadata = { title: "Docs" };',
        "export default function Layout() { return null; }",
      ].join("\n"),
      { filePath: "apps/website/app/test-layout.tsx" },
    );

    expect(result.messages.filter((message) => message.ruleId === "react-refresh/only-export-components"))
      .toEqual([]);
  });

  it("keeps warning on arbitrary non-component exports from React modules", async () => {
    const [result] = await eslint.lintText(
      [
        "export const helper = () => 42;",
        "export default function Page() { return null; }",
      ].join("\n"),
      { filePath: "apps/website/components/test-page.tsx" },
    );

    expect(result.messages.map((message) => message.ruleId)).toContain(
      "react-refresh/only-export-components",
    );
  });
});

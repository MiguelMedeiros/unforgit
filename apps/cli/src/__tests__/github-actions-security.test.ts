import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const releasePleaseV5Sha = "45996ed1f6d02564a971a2fa1b5860e934307cf7";

function workflowActionReferences(): Array<{ file: string; line: number; reference: string }> {
  const workflowsDir = path.resolve(".github/workflows");
  const workflowFiles = fs
    .readdirSync(workflowsDir)
    .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));

  return workflowFiles.flatMap((file) =>
    fs
      .readFileSync(path.join(workflowsDir, file), "utf-8")
      .split("\n")
      .flatMap((line, index) => {
        const match = line.match(/^\s*uses:\s*([^\s#]+)/);
        return match
          ? [{ file, line: index + 1, reference: match[1] }]
          : [];
      }),
  );
}

describe("GitHub Actions supply-chain contract", () => {
  it("pins every external action in every workflow to an immutable commit", () => {
    const mutableReferences = workflowActionReferences().filter(
      ({ reference }) =>
        !reference.startsWith("./") &&
        !reference.startsWith("docker://") &&
        !/@[0-9a-f]{40}$/.test(reference),
    );

    expect(mutableReferences).toEqual([]);
  });

  it("uses the Node 24 release-please action", () => {
    const releasePleaseReferences = workflowActionReferences().filter(
      ({ reference }) => reference.startsWith("googleapis/release-please-action@"),
    );

    expect(releasePleaseReferences).toHaveLength(1);
    expect(releasePleaseReferences[0]?.reference).toBe(
      `googleapis/release-please-action@${releasePleaseV5Sha}`,
    );
  });
});

import { describe, it, expect } from "vitest";
import { resolveVisibility } from "../policy.js";
import type { CreateMemoryInput } from "@unforgit/shared";

function makeInput(overrides: Partial<CreateMemoryInput> = {}): CreateMemoryInput {
  return {
    orgId: "org",
    repoId: "repo",
    memoryType: "episodic",
    text: "some text",
    ...overrides,
  };
}

describe("resolveVisibility", () => {
  it("forces private when text contains sensitive patterns", () => {
    const cases = [
      "The password is abc123",
      "Use the api_key for auth",
      "Set API-KEY here",
      "The secret token",
      "Store the credential safely",
      "private_key file location",
      "-----BEGIN RSA PRIVATE KEY-----",
    ];

    for (const text of cases) {
      const result = resolveVisibility(makeInput({ text }));
      expect(result.visibility).toBe("private");
      expect(result.suggestion).toBeUndefined();
    }
  });

  it("forces private for episodic without sourceRefs", () => {
    const result = resolveVisibility(
      makeInput({ memoryType: "episodic", sourceRefs: undefined }),
    );
    expect(result.visibility).toBe("private");
  });

  it("returns repo for semantic with sourceRefs", () => {
    const result = resolveVisibility(
      makeInput({
        memoryType: "semantic",
        sourceRefs: { pr_url: "https://github.com/pr/1" },
      }),
    );
    expect(result.visibility).toBe("repo");
  });

  it("returns repo for procedural with rule-like tags", () => {
    const result = resolveVisibility(
      makeInput({
        memoryType: "procedural",
        tags: ["playbook", "deploy"],
      }),
    );
    expect(result.visibility).toBe("repo");
  });

  it("returns private with promote suggestion for semantic without source or rule tags", () => {
    const result = resolveVisibility(
      makeInput({
        memoryType: "semantic",
        tags: ["misc"],
      }),
    );
    expect(result.visibility).toBe("private");
    expect(result.suggestion).toBe("promote");
  });

  it("handles case-insensitive sensitive patterns", () => {
    const result = resolveVisibility(makeInput({ text: "PASSWORD reset flow" }));
    expect(result.visibility).toBe("private");
  });

  it("handles case-insensitive rule-like tags", () => {
    const result = resolveVisibility(
      makeInput({
        memoryType: "semantic",
        tags: ["DECISION"],
        sourceRefs: undefined,
      }),
    );
    expect(result.visibility).toBe("repo");
  });
});

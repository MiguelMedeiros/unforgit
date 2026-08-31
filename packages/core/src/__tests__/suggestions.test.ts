import { describe, expect, it } from "vitest";
import type { CurationSuggestion, ILocalStore } from "unforgit-shared";
import {
  buildConsolidateSuggestionAction,
  persistReviewableSuggestions,
  type Suggestion,
} from "../suggestions.js";

function makeStore(existing: CurationSuggestion[] = []) {
  const created: CurationSuggestion[] = [];
  const store = {
    listCurationSuggestions: (query) =>
      existing.filter(
        (suggestion) => !query.status || query.status.includes(suggestion.status),
      ),
    createCurationSuggestion: (input) => {
      const suggestion: CurationSuggestion = {
        id: `suggestion-${created.length + 1}`,
        status: "pending",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        ...input,
      };
      created.push(suggestion);
      return suggestion;
    },
    createCurationSuggestionIfAbsent: (input) => {
      const suggestion: CurationSuggestion = {
        id: `suggestion-${created.length + 1}`,
        status: "pending",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        ...input,
      };
      created.push(suggestion);
      return suggestion;
    },
  } satisfies Partial<ILocalStore>;

  return { store: store as ILocalStore, created };
}

const suggestion: Suggestion = {
  id: "add-links-batch",
  type: "add_links",
  priority: "low",
  memoryIds: ["mem-a", "mem-b"],
  reason: "2 memories are isolated (no links)",
  confidence: 0.8,
  action: {
    command: "unforgit web",
    description: "Open graph view to create links",
  },
};

describe("persistReviewableSuggestions", () => {
  it("persists generated suggestions as pending review items with action payload", () => {
    const { store, created } = makeStore();

    const result = persistReviewableSuggestions(store, "Org", "Repo", [suggestion], {
      createdBy: "curator",
    });

    expect(result.created).toBe(1);
    expect(result.skippedExisting).toBe(0);
    expect(created[0]).toMatchObject({
      orgId: "Org",
      repoId: "Repo",
      type: "add_links",
      priority: "low",
      status: "pending",
      memoryIds: ["mem-a", "mem-b"],
      reason: "2 memories are isolated (no links)",
      confidence: 0.8,
      createdBy: "curator",
      payload: {
        sourceSuggestionId: "add-links-batch",
        action: {
          command: "unforgit web",
          description: "Open graph view to create links",
        },
      },
    });
  });

  it("skips duplicate pending suggestions for the same type and memories", () => {
    const existing: CurationSuggestion = {
      id: "existing",
      orgId: "Org",
      repoId: "Repo",
      type: "add_links",
      priority: "low",
      status: "pending",
      memoryIds: ["mem-b", "mem-a"],
      reason: "Existing review item",
      confidence: 0.8,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    };
    const { store, created } = makeStore([existing]);

    const result = persistReviewableSuggestions(store, "Org", "Repo", [suggestion]);

    expect(result.created).toBe(0);
    expect(result.skippedExisting).toBe(1);
    expect(created).toHaveLength(0);
  });

  it("keeps approved suggestions suppressed until they are applied", () => {
    const approved: CurationSuggestion = {
      id: "approved",
      orgId: "Org",
      repoId: "Repo",
      type: "add_links",
      priority: "low",
      status: "approved",
      memoryIds: ["mem-b", "mem-a"],
      reason: "Approved review item",
      confidence: 0.8,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    };
    const { store, created } = makeStore([approved]);

    const result = persistReviewableSuggestions(store, "Org", "Repo", [suggestion]);

    expect(result).toEqual({ created: 0, skippedExisting: 1 });
    expect(created).toHaveLength(0);
  });
});

describe("buildConsolidateSuggestionAction", () => {
  it("includes the required consolidated text option", () => {
    expect(buildConsolidateSuggestionAction("mem-a", "mem-b").command).toBe(
      'unforgit merge mem-a mem-b --text "<consolidated memory text>"',
    );
  });
});

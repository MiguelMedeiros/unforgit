import { describe, expect, it } from "vitest";
import {
  getClientHydrationSnapshot,
  getServerHydrationSnapshot,
} from "../../lib/hydration";
import { resolveDocsHash } from "../../lib/docs-navigation";

describe("hydration snapshots", () => {
  it("keeps the server render static until the client hydrates", () => {
    expect(getServerHydrationSnapshot()).toBe(false);
    expect(getClientHydrationSnapshot()).toBe(true);
  });
});

describe("documentation hash navigation", () => {
  const sectionIds = ["overview", "getting-started", "cli-core"];

  it("uses a valid hash section on initial navigation", () => {
    expect(resolveDocsHash("#cli-core", sectionIds)).toBe("cli-core");
  });

  it("ignores empty and unknown hash sections", () => {
    expect(resolveDocsHash("", sectionIds)).toBeNull();
    expect(resolveDocsHash("#missing", sectionIds)).toBeNull();
  });
});

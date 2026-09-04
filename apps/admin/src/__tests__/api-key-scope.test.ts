import { describe, expect, it } from "vitest";
import {
  buildRepositoryApiKeyPayload,
  filterRepositoryApiKeys,
} from "../../lib/api-key-scope";

describe("repository API key scope", () => {
  it("includes the repository in key creation payloads", () => {
    expect(
      buildRepositoryApiKeyPayload("Allowed-Org", "Allowed-Repo", "automation"),
    ).toEqual({
      name: "Allowed-Org/Allowed-Repo",
      orgId: "Allowed-Org",
      repoId: "Allowed-Repo",
      label: "automation",
    });
  });

  it("filters out organization-wide and sibling repository keys", () => {
    const keys = [
      { id: "target", orgId: "allowed-org", repoId: "allowed-repo" },
      { id: "org-wide", orgId: "allowed-org", repoId: null },
      { id: "sibling", orgId: "allowed-org", repoId: "other-repo" },
      { id: "other-org", orgId: "other-org", repoId: "allowed-repo" },
    ];

    expect(filterRepositoryApiKeys(keys, "Allowed-Org", "Allowed-Repo")).toEqual([
      keys[0],
    ]);
  });
});

import { describe, it, expect } from "vitest";
import {
  getTemplate,
  listTemplates,
  applyTemplate,
  formatTemplateList,
} from "../templates.js";

describe("getTemplate", () => {
  it("returns template for known name", () => {
    const t = getTemplate("decision");
    expect(t).toBeDefined();
    expect(t!.name).toBe("Decision");
    expect(t!.memoryType).toBe("semantic");
  });

  it("is case-insensitive", () => {
    expect(getTemplate("DECISION")).toBeDefined();
    expect(getTemplate("Decision")).toBeDefined();
  });

  it("returns undefined for unknown template", () => {
    expect(getTemplate("nonexistent")).toBeUndefined();
  });
});

describe("listTemplates", () => {
  it("returns all templates", () => {
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(10);
    const names = templates.map((t) => t.name);
    expect(names).toContain("Decision");
    expect(names).toContain("Gotcha");
    expect(names).toContain("Playbook");
  });
});

describe("applyTemplate", () => {
  it("prepends prefix if not already present", () => {
    const template = getTemplate("decision")!;
    const result = applyTemplate(template, "Use PostgreSQL for persistence");
    expect(result.text).toBe("Decision: Use PostgreSQL for persistence");
    expect(result.memoryType).toBe("semantic");
    expect(result.tags).toContain("decision");
  });

  it("does not duplicate prefix", () => {
    const template = getTemplate("decision")!;
    const result = applyTemplate(template, "Decision: Use PostgreSQL");
    expect(result.text).toBe("Decision: Use PostgreSQL");
  });

  it("merges additional tags without duplicates", () => {
    const template = getTemplate("gotcha")!;
    const result = applyTemplate(template, "some text", ["gotcha", "extra"]);
    const gotchaCount = result.tags.filter((t) => t === "gotcha").length;
    expect(gotchaCount).toBe(1);
    expect(result.tags).toContain("extra");
    expect(result.tags).toContain("warning");
  });

  it("uses template visibility", () => {
    const template = getTemplate("bug")!;
    const result = applyTemplate(template, "found a bug");
    expect(result.visibility).toBe("private");
  });

  it("handles templates without prefix", () => {
    const template = getTemplate("api")!;
    expect(template.prefix).toBeUndefined();
    const result = applyTemplate(template, "GET /users returns 200");
    expect(result.text).toBe("GET /users returns 200");
  });
});

describe("formatTemplateList", () => {
  it("produces formatted output", () => {
    const output = formatTemplateList();
    expect(output).toContain("Available templates:");
    expect(output).toContain("decision");
    expect(output).toContain("gotcha");
    expect(output).toContain("playbook");
  });
});

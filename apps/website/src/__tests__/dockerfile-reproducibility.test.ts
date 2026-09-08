import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("website Docker dependency installation", () => {
  it("installs dependencies from the committed lockfile", () => {
    const dockerfile = fs.readFileSync(
      path.resolve("apps/website/Dockerfile"),
      "utf-8",
    );
    const depsStage = dockerfile.slice(
      dockerfile.indexOf("FROM base AS deps"),
      dockerfile.indexOf("FROM base AS builder"),
    );

    expect(depsStage).toContain("COPY package.json package-lock.json ./");
    expect(depsStage).toContain("RUN npm ci");
  });
});

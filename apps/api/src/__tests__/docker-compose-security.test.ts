import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Docker Compose security defaults", () => {
  it("binds the development PostgreSQL port to loopback", () => {
    const compose = readFileSync(resolve(process.cwd(), "docker-compose.yml"), "utf8");

    expect(compose).toContain('"127.0.0.1:5432:5432"');
    expect(compose).not.toContain('"5432:5432"');
  });
});

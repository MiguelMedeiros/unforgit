import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, redactSecrets, setVerbosity } from "../logger.js";

const apiKeyName = "UNFORGIT" + "_API_KEY";
const authHeader = "Authorization" + ": Bearer";
const dbUrl = "postgresql://user:" + "sensitive-db-value" + "@example.com:5432/db";

describe("redactSecrets", () => {
  it("redacts common token and key formats", () => {
    const input = [
      `${apiKeyName}=sensitive-token-value`,
      `${authHeader} sensitive-bearer-value`,
      "client_secret=sensitive-client-value",
      dbUrl,
    ].join("\n");

    const output = redactSecrets(input);

    expect(output).not.toContain("sensitive-token-value");
    expect(output).not.toContain("sensitive-bearer-value");
    expect(output).not.toContain("sensitive-client-value");
    expect(output).not.toContain("sensitive-db-value");
    expect(output).toContain("[REDACTED]");
  });

  it("leaves non-sensitive output readable", () => {
    expect(redactSecrets("Pull complete: 3 memories updated")).toBe(
      "Pull complete: 3 memories updated",
    );
  });
});

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setVerbosity(1);
  });

  it("redacts sensitive values before writing errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logger.error(`${apiKeyName}=sensitive-error-value`);

    expect(spy).toHaveBeenCalledWith("error: UNFORGIT_API_KEY=[REDACTED]");
  });
});

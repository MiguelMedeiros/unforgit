import { afterEach, beforeEach, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { createTempDataDir, runCommand } from "../helpers.js";

describe("auth status command", () => {
  let tmp: ReturnType<typeof createTempDataDir> | undefined;
  let server: http.Server | undefined;
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.UNFORGIT_API_KEY;
    process.env.UNFORGIT_API_KEY = "test-api-key-for-auth-status";
  });

  afterEach(async () => {
    if (originalApiKey === undefined) delete process.env.UNFORGIT_API_KEY;
    else process.env.UNFORGIT_API_KEY = originalApiKey;
    tmp?.cleanup();
    tmp = undefined;
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      server = undefined;
    }
  });

  it("reports a connection timeout instead of hanging when the server never responds", async () => {
    server = http.createServer(() => {
      // Accept the connection but never respond.
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    tmp = createTempDataDir({
      remote: { url: `http://127.0.0.1:${port}`, orgId: "test-org", repoId: "test-repo" },
    });

    const started = Date.now();
    const result = await runCommand(["auth", "status"], { cwd: tmp.dir });

    expect(Date.now() - started).toBeLessThan(14_000);
    expect(result.exitCode).toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("Could not connect: Request timed out");
  }, 20_000);
});

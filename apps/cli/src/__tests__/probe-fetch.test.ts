import { afterEach, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { probeFetch } from "../utils.js";

describe("probeFetch", () => {
  let server: http.Server | undefined;

  afterEach(async () => {
    if (!server) return;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  });

  async function startServer(handler: http.RequestListener): Promise<string> {
    server = http.createServer(handler);
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it("fails with a timeout error when the remote accepts but never responds", async () => {
    const url = await startServer(() => {
      // Intentionally never respond.
    });

    const started = Date.now();
    await expect(probeFetch(`${url}/health`, {}, 200)).rejects.toThrow(
      "Request timed out after 200ms",
    );
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("returns the response when the remote answers in time", async () => {
    const url = await startServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"status":"ok"}');
    });

    const res = await probeFetch(`${url}/health`, {}, 2_000);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("forwards request headers", async () => {
    let authorization: string | undefined;
    const url = await startServer((req, res) => {
      authorization = req.headers.authorization;
      res.writeHead(204);
      res.end();
    });

    await probeFetch(`${url}/v1/api-keys`, { headers: { Authorization: "Bearer test-key" } }, 2_000);

    expect(authorization).toBe("Bearer test-key");
  });
});

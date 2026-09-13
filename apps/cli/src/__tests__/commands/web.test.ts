import { afterEach, describe, expect, it, vi } from "vitest";

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn((_command: string, _args: string[], _options?: unknown) => ({
    on: vi.fn(),
    unref: vi.fn(),
  })),
}));

vi.mock("node:child_process", () => ({ spawn: spawnMock }));
vi.mock("unforgit-config", () => ({ isInitialized: () => true }));

import { webCommand } from "../../commands/web.js";

describe("web command", () => {
  afterEach(() => {
    spawnMock.mockClear();
  });

  it("binds the dashboard to loopback by default", async () => {
    await webCommand.parseAsync([
      "node",
      "unforgit-web-test",
      "--no-open",
      "--port",
      "4848",
    ]);

    expect(spawnMock).toHaveBeenCalledOnce();
    expect(spawnMock.mock.calls[0]?.[1]).toEqual([
      expect.stringMatching(/^(start|dev)$/),
      "-p",
      "4848",
      "-H",
      "127.0.0.1",
    ]);
  });
});

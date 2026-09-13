import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";

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
    vi.restoreAllMocks();
  });

  it.each([
    { hasBuild: true, mode: "start" },
    { hasBuild: false, mode: "dev" },
  ])("binds the $mode dashboard to loopback by default", async ({ hasBuild, mode }) => {
    vi.spyOn(fs, "existsSync").mockImplementation((candidate) => {
      const pathname = String(candidate);
      if (pathname.endsWith(".env")) return false;
      if (pathname.endsWith(".next")) return hasBuild;
      return true;
    });

    await webCommand.parseAsync([
      "node",
      "unforgit-web-test",
      "--no-open",
      "--port",
      "4848",
    ]);

    expect(spawnMock).toHaveBeenCalledOnce();
    expect(spawnMock.mock.calls[0]?.[1]).toEqual([
      mode,
      "-p",
      "4848",
      "-H",
      "127.0.0.1",
    ]);
  });
});

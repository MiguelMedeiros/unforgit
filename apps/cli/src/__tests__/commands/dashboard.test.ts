import { describe, expect, it } from "vitest";
import {
  buildDashboardLaunchOptions,
  assertSafeDashboardBind,
  resolveDashboardAppDir,
} from "../../commands/dashboard.js";

describe("dashboard command launch options", () => {
  it("defaults to localhost and the local dashboard port", () => {
    const opts = buildDashboardLaunchOptions({ cwd: "/workspace/project" });

    expect(opts.host).toBe("127.0.0.1");
    expect(opts.port).toBe(3838);
    expect(opts.workspace).toBe("/workspace/project");
    expect(opts.url).toBe("http://127.0.0.1:3838");
  });

  it("supports explicit Tailscale/LAN host and custom port", () => {
    const opts = buildDashboardLaunchOptions({
      cwd: "/workspace/project",
      host: "100.81.12.32",
      port: "4848",
      workspace: "/home/miguel/.hermes/unforgit-memory",
    });

    expect(opts.host).toBe("100.81.12.32");
    expect(opts.port).toBe(4848);
    expect(opts.workspace).toBe("/home/miguel/.hermes/unforgit-memory");
    expect(opts.url).toBe("http://100.81.12.32:4848");
  });

  it("rejects wildcard network binding unless explicitly allowed", () => {
    expect(() => assertSafeDashboardBind("0.0.0.0", false)).toThrow(
      "Refusing to bind dashboard to 0.0.0.0 without --allow-network",
    );

    expect(() => assertSafeDashboardBind("0.0.0.0", true)).not.toThrow();
  });

  it("rejects invalid ports", () => {
    expect(() => buildDashboardLaunchOptions({ cwd: "/repo", port: "0" })).toThrow(
      "--port must be between 1 and 65535",
    );
    expect(() => buildDashboardLaunchOptions({ cwd: "/repo", port: "70000" })).toThrow(
      "--port must be between 1 and 65535",
    );
  });

  it("resolves apps/web from both source and bundled CLI locations", () => {
    expect(resolveDashboardAppDir("file:///repo/apps/cli/src/commands/dashboard.ts")).toBe(
      "/repo/apps/web",
    );
    expect(resolveDashboardAppDir("file:///repo/apps/cli/dist/index.js")).toBe(
      "/repo/apps/web",
    );
  });
});

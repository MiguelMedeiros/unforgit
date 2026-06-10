import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { logger } from "../logger.js";
import { EXIT_ERROR } from "../exit-codes.js";

export interface DashboardLaunchInput {
  cwd: string;
  host?: string;
  port?: string | number;
  workspace?: string;
  allowNetwork?: boolean;
}

export interface DashboardLaunchOptions {
  host: string;
  port: number;
  workspace: string;
  url: string;
}

export function assertSafeDashboardBind(host: string, allowNetwork = false): void {
  if ((host === "0.0.0.0" || host === "::") && !allowNetwork) {
    throw new Error(
      `Refusing to bind dashboard to ${host} without --allow-network. Use a specific Tailscale/LAN IP when possible.`,
    );
  }
}

export function parseDashboardPort(port: string | number | undefined): number {
  const value = port === undefined ? 3838 : Number(port);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error("--port must be between 1 and 65535");
  }
  return value;
}

export function buildDashboardLaunchOptions(input: DashboardLaunchInput): DashboardLaunchOptions {
  const host = input.host ?? "127.0.0.1";
  assertSafeDashboardBind(host, input.allowNetwork ?? false);
  const port = parseDashboardPort(input.port);
  const workspace = path.resolve(input.workspace ?? input.cwd);

  return {
    host,
    port,
    workspace,
    url: `http://${host}:${port}`,
  };
}

export function resolveDashboardAppDir(moduleUrl = import.meta.url): string {
  if (process.env.UNFORGIT_DASHBOARD_APP_DIR) {
    return path.resolve(process.env.UNFORGIT_DASHBOARD_APP_DIR);
  }

  const thisFile = fileURLToPath(moduleUrl);
  const dir = path.dirname(thisFile);
  if (path.basename(dir) === "dist") {
    // Bundled CLI: apps/cli/dist/index.js -> apps/web
    return path.resolve(dir, "../../web");
  }

  // Source tree: apps/cli/src/commands/dashboard.ts -> apps/web
  return path.resolve(dir, "../../../web");
}

export const dashboardCommand = new Command("dashboard")
  .description("Start the local Unforgit memory dashboard")
  .option("--host <host>", "Host/IP to bind (default: 127.0.0.1)")
  .option("--port <port>", "Port to listen on (default: 3838)")
  .option("--workspace <path>", "Workspace containing .unforgit/ (default: current directory)")
  .option(
    "--allow-network",
    "Allow wildcard binds such as 0.0.0.0. Prefer a specific Tailscale/LAN IP instead.",
  )
  .addHelpText("after", `
Examples:
  unforgit dashboard
  unforgit dashboard --port 4848
  unforgit dashboard --workspace ~/.hermes/unforgit-memory --host 100.81.12.32`)
  .action((opts) => {
    let launch: DashboardLaunchOptions;
    try {
      launch = buildDashboardLaunchOptions({
        cwd: process.cwd(),
        host: opts.host,
        port: opts.port,
        workspace: opts.workspace,
        allowNetwork: opts.allowNetwork,
      });
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      process.exit(EXIT_ERROR);
    }

    const dashboardAppDir = resolveDashboardAppDir();
    if (!fs.existsSync(path.join(dashboardAppDir, "package.json"))) {
      logger.error(`Dashboard app not found at ${dashboardAppDir}.`);
      logger.error("Set UNFORGIT_DASHBOARD_APP_DIR to the apps/web directory.");
      process.exit(EXIT_ERROR);
    }

    logger.info(`Starting Unforgit dashboard: ${launch.url}`);
    logger.info(`Workspace: ${launch.workspace}`);
    if (launch.host !== "127.0.0.1" && launch.host !== "localhost") {
      logger.warn("Dashboard is bound to a network address. Use only on trusted private networks such as Tailscale.");
    }

    const child = spawn(
      "pnpm",
      ["exec", "next", "dev", "-p", String(launch.port), "-H", launch.host],
      {
        cwd: dashboardAppDir,
        stdio: "inherit",
        env: {
          ...process.env,
          UNFORGIT_WORKSPACE: launch.workspace,
        },
      },
    );

    child.on("error", (err) => {
      logger.error(`Failed to start dashboard: ${err.message}`);
      process.exit(EXIT_ERROR);
    });

    child.on("exit", (code, signal) => {
      if (signal) process.kill(process.pid, signal);
      process.exit(code ?? 0);
    });
  });

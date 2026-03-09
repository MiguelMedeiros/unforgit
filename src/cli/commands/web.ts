import { Command } from "commander";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { isInitialized } from "../config.js";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR, EXIT_ERROR } from "../exit-codes.js";

export const webCommand = new Command("web")
  .description("Start the Unforgit web dashboard")
  .option("-p, --port <port>", "Port to run on", "3838")
  .option("--no-open", "Don't open browser automatically")
  .action(async (opts) => {
    const cwd = process.cwd();

    if (!isInitialized(cwd)) {
      logger.error("Unforgit not initialized in this directory. Run 'unforgit init' first.");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const webDir = findWebDir();
    if (!webDir) {
      logger.error("Web dashboard not found. Make sure unforgit is installed correctly.");
      process.exit(EXIT_ERROR);
    }

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      UNFORGIT_WORKSPACE: cwd,
      PORT: opts.port,
    };

    const dotenvPath = path.join(cwd, ".env");
    if (fs.existsSync(dotenvPath)) {
      const content = fs.readFileSync(dotenvPath, "utf-8");
      for (const line of content.split("\n")) {
        const match = line.match(/^\s*([^#=]+?)\s*=\s*(.+?)\s*$/);
        if (match) {
          env[match[1]] = match[2].replace(/^["']|["']$/g, "");
        }
      }
    }

    logger.info(`Starting Unforgit web dashboard on port ${opts.port}...`);
    logger.info(`Workspace: ${cwd}`);

    const hasNextBuild = fs.existsSync(path.join(webDir, ".next"));
    const cmd = hasNextBuild ? "next" : "next";
    const args = hasNextBuild
      ? ["start", "-p", opts.port]
      : ["dev", "-p", opts.port];

    const nextBin = path.join(webDir, "node_modules", ".bin", "next");
    const finalCmd = fs.existsSync(nextBin) ? nextBin : cmd;

    const child = spawn(finalCmd, args, {
      cwd: webDir,
      env,
      stdio: "inherit",
    });

    if (opts.open !== false) {
      setTimeout(() => {
        const url = `http://localhost:${opts.port}`;
        const openCmd =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "start"
              : "xdg-open";
        spawn(openCmd, [url], { stdio: "ignore", detached: true }).unref();
      }, 2000);
    }

    child.on("error", (err) => {
      logger.fatal(`Failed to start web dashboard: ${err.message}`);
      process.exit(EXIT_ERROR);
    });

    child.on("exit", (code) => {
      process.exit(code ?? 0);
    });
  });

function findWebDir(): string | null {
  const candidates = [
    path.resolve(import.meta.dirname, "../../../web"),
    path.resolve(import.meta.dirname, "../../web"),
    path.join(process.cwd(), "web"),
  ];

  for (const dir of candidates) {
    if (
      fs.existsSync(dir) &&
      fs.existsSync(path.join(dir, "package.json"))
    ) {
      return dir;
    }
  }

  return null;
}

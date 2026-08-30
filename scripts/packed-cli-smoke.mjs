import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 24) {
  throw new Error(`Packed CLI smoke requires Node 24+; found ${process.version}`);
}

const repoRoot = path.resolve(import.meta.dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "unforgit-packed-smoke-"));
const packDir = path.join(tempRoot, "pack");
const prefix = path.join(tempRoot, "prefix");
const repository = path.join(tempRoot, "repository");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repository,
    encoding: "utf-8",
    env: { ...process.env, NO_COLOR: "1" },
    shell: process.platform === "win32",
    ...options,
  });
}

function assertIncludes(output, expected, label) {
  if (!output.includes(expected)) {
    throw new Error(`${label} did not include ${JSON.stringify(expected)}:\n${output}`);
  }
}

try {
  fs.mkdirSync(packDir, { recursive: true });
  fs.mkdirSync(repository, { recursive: true });

  const tarballName = execFileSync(
    npm,
    ["pack", "./apps/cli", "--pack-destination", packDir, "--silent"],
    {
      cwd: repoRoot,
      encoding: "utf-8",
      shell: process.platform === "win32",
    },
  ).trim();
  const tarball = path.join(packDir, tarballName);

  const install = spawnSync(
    npm,
    ["install", "--global", "--prefix", prefix, tarball, "--loglevel", "warn"],
    {
      cwd: repository,
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
      shell: process.platform === "win32",
    },
  );
  const installOutput = `${install.stdout ?? ""}\n${install.stderr ?? ""}`;
  if (install.status !== 0) {
    throw new Error(`Packed CLI installation failed:\n${installOutput}`);
  }
  if (/prebuild-install|deprecated|allowScripts|approve-builds|blocked install script/i.test(installOutput)) {
    throw new Error(`Packed CLI installation emitted a forbidden warning:\n${installOutput}`);
  }

  const binDir = process.platform === "win32" ? prefix : path.join(prefix, "bin");
  const cli = path.join(binDir, process.platform === "win32" ? "unforgit.cmd" : "unforgit");
  if (!fs.existsSync(cli)) {
    throw new Error(`Global CLI binary was not installed at ${cli}`);
  }

  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "apps/cli/package.json"), "utf-8"),
  );
  assertIncludes(run(cli, ["--version"]), manifest.version, "unforgit --version");
  run(cli, ["init", "--org-id", "smoke-org", "--repo-id", "smoke-repo", "--no-ide"]);
  const doctor = spawnSync(cli, ["doctor"], {
    cwd: repository,
    encoding: "utf-8",
    env: { ...process.env, NO_COLOR: "1" },
    shell: process.platform === "win32",
  });
  const doctorOutput = `${doctor.stdout ?? ""}\n${doctor.stderr ?? ""}`;
  assertIncludes(doctorOutput, "SQLite database is accessible", "unforgit doctor");
  if (doctor.status !== 0 && doctor.status !== 1) {
    throw new Error(`unforgit doctor exited unexpectedly (${doctor.status}):\n${doctorOutput}`);
  }
  run(cli, ["add", "Packed node sqlite memory", "--type", "semantic", "--tags", "packed"]);
  assertIncludes(
    run(cli, ["recall", "node sqlite", "--local-only"]),
    "Packed node sqlite memory",
    "unforgit recall",
  );

  run(cli, ["reset", "--local", "--force"]);
  const backupRoot = path.join(repository, ".unforgit", "backups");
  const backupName = fs
    .readdirSync(backupRoot)
    .find((entry) => entry.startsWith("reset-"));
  if (!backupName) {
    throw new Error("unforgit reset did not create a local database backup");
  }
  assertIncludes(run(cli, ["backups", "list"]), backupName, "unforgit backups list");
  run(cli, ["backups", "restore", backupName, "--force"]);
  assertIncludes(
    run(cli, ["recall", "node sqlite", "--local-only"]),
    "Packed node sqlite memory",
    "restored unforgit recall",
  );

  const requireFromCli = createRequire(path.join(repoRoot, "apps/cli/package.json"));
  const clientModule = await import(
    pathToFileURL(requireFromCli.resolve("@modelcontextprotocol/sdk/client/index.js")).href
  );
  const transportModule = await import(
    pathToFileURL(requireFromCli.resolve("@modelcontextprotocol/sdk/client/stdio.js")).href
  );
  const packageRoot = process.platform === "win32"
    ? path.join(prefix, "node_modules", "unforgit")
    : path.join(prefix, "lib", "node_modules", "unforgit");
  const mcpEntry = path.join(packageRoot, "dist", "mcp.js");
  const transport = new transportModule.StdioClientTransport({
    command: process.execPath,
    args: [mcpEntry],
    cwd: repository,
    stderr: "pipe",
  });
  const client = new clientModule.Client({ name: "packed-cli-smoke", version: "1.0.0" });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    if (!tools.tools.some((tool) => tool.name === "unforgit_recall")) {
      throw new Error("Packed MCP server did not expose unforgit_recall");
    }
    const result = await client.callTool({
      name: "unforgit_recall",
      arguments: { query: "node sqlite", k: 5 },
    });
    const text = result.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");
    assertIncludes(text, "Packed node sqlite memory", "packed MCP recall");
  } finally {
    await client.close();
  }

  process.stdout.write(
    `Packed CLI smoke passed on ${process.platform} ${process.arch}, Node ${process.version}\n`,
  );
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

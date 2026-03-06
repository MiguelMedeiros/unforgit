import { Command } from "commander";
import { loadConfig, saveConfig, isInitialized, getConfigPath } from "../config.js";
import fs from "node:fs";
import YAML from "yaml";
import type { HippoConfig } from "../../core/types.js";
import { maskKey } from "../utils.js";

interface ExtendedHippoConfig extends HippoConfig {
  openaiApiKey?: string;
  branches?: string[];
  currentBranch?: string;
}

function loadExtendedConfig(): ExtendedHippoConfig {
  const configPath = getConfigPath();
  const raw = fs.readFileSync(configPath, "utf-8");
  return YAML.parse(raw) as ExtendedHippoConfig;
}

function saveExtendedConfig(config: ExtendedHippoConfig): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, YAML.stringify(config), "utf-8");
}

function checkConfigPermissions(): void {
  if (process.platform === "win32") return;
  try {
    const configPath = getConfigPath();
    const stat = fs.statSync(configPath);
    const mode = stat.mode & 0o777;
    if (mode & 0o044) {
      console.error(
        `warning: ${configPath} is readable by others (mode ${mode.toString(8)}). ` +
        `Consider running: chmod 600 ${configPath}`,
      );
    }
  } catch {
    // ignore — file might not exist yet
  }
}

export const authCommand = new Command("auth")
  .description("Configure authentication for remote server and APIs");

authCommand
  .command("set")
  .description("Set the API key for remote authentication")
  .argument("<api-key>", "API key to use for authentication")
  .action(async (apiKey) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      console.error("Run 'hippo init' first.");
      process.exit(1);
    }

    if (!apiKey.startsWith("hk_")) {
      console.error("warning: API key should start with 'hk_'");
    }

    const config = loadConfig();
    config.remote.apiKey = apiKey;
    saveConfig(config);

    checkConfigPermissions();
    console.log("API key configured successfully!");
    console.log(`  Remote: ${config.remote.url}`);
    console.log(`  Key: ${maskKey(apiKey)}`);
  });

authCommand
  .command("status")
  .description("Check authentication status")
  .action(async () => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadConfig();

    console.log("Authentication status:");
    console.log(`  Remote URL: ${config.remote.url || "(not configured)"}`);
    console.log(`  Org ID: ${config.remote.orgId || "(not configured)"}`);
    console.log(`  Repo ID: ${config.remote.repoId || "(not configured)"}`);

    const effectiveApiKey = config.remote.apiKey || process.env.HIPPO_API_KEY;

    if (effectiveApiKey) {
      const source = config.remote.apiKey ? "config" : "env (HIPPO_API_KEY)";
      console.log(`  API Key: ${maskKey(effectiveApiKey)} (from ${source})`);

      if (config.remote.url) {
        console.log("\nTesting connection...");
        try {
          const res = await fetch(`${config.remote.url}/health`);
          if (res.ok) {
            console.log("  ✓ Server reachable");

            const authRes = await fetch(`${config.remote.url}/v1/api-keys`, {
              headers: { Authorization: `Bearer ${effectiveApiKey}` },
            });
            if (authRes.ok) {
              console.log("  ✓ API key valid");
            } else if (authRes.status === 401) {
              console.log("  ✗ API key invalid or expired");
            } else {
              console.log(`  ? Could not verify API key (HTTP ${authRes.status})`);
            }
          } else {
            console.log(`  ✗ Server returned HTTP ${res.status}`);
          }
        } catch (err) {
          console.log(`  ✗ Could not connect: ${err instanceof Error ? err.message : err}`);
        }
      }
    } else {
      console.log("  API Key: (not configured)");
      console.log("\nRun 'hippo auth set <api-key>' or set HIPPO_API_KEY env var.");
    }

    checkConfigPermissions();
  });

authCommand
  .command("remove")
  .description("Remove the configured API key")
  .action(async () => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadConfig();

    if (!config.remote.apiKey) {
      console.log("No API key configured.");
      return;
    }

    delete config.remote.apiKey;
    saveConfig(config);

    console.log("API key removed.");
  });

authCommand
  .command("openai")
  .description("Set OpenAI API key for auto-consolidation")
  .argument("<api-key>", "OpenAI API key (starts with sk-)")
  .action((apiKey) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    if (!apiKey.startsWith("sk-")) {
      console.error("warning: OpenAI API key should start with 'sk-'");
    }

    const config = loadExtendedConfig();
    config.openaiApiKey = apiKey;
    saveExtendedConfig(config);

    checkConfigPermissions();
    console.log("OpenAI API key configured successfully!");
    console.log(`  Key: ${maskKey(apiKey)}`);
    console.log("\nYou can now use 'hippo auto-consolidate' for AI-powered consolidation.");
  });

authCommand
  .command("openai-remove")
  .description("Remove the OpenAI API key")
  .action(() => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadExtendedConfig();

    if (!config.openaiApiKey) {
      console.log("No OpenAI API key configured.");
      return;
    }

    delete config.openaiApiKey;
    saveExtendedConfig(config);

    console.log("OpenAI API key removed.");
  });

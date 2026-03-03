import { Command } from "commander";
import { loadConfig, isInitialized } from "../config.js";

export const keysCommand = new Command("keys")
  .description("Manage API keys for remote authentication");

keysCommand
  .command("create")
  .description("Create a new API key")
  .requiredOption("--name <name>", "Name for the API key")
  .requiredOption("--org <orgId>", "Organization ID for the key")
  .action(async (opts) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadConfig();

    if (!config.remote.url) {
      console.error("fatal: No remote configured.");
      console.error("Use 'hippo remote add origin <url>' to add a remote.");
      process.exit(1);
    }

    if (!config.remote.apiKey) {
      console.error("fatal: No API key configured for admin access.");
      console.error("You need an existing API key to create new ones.");
      console.error("Configure apiKey in .hippocampus/hippo.yaml first.");
      process.exit(1);
    }

    try {
      const res = await fetch(`${config.remote.url}/v1/api-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.remote.apiKey}`,
        },
        body: JSON.stringify({ name: opts.name, orgId: opts.org }),
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 401) {
          console.error("fatal: Authentication failed. Check your API key.");
        } else {
          console.error(`fatal: Failed to create API key: ${err}`);
        }
        process.exit(1);
      }

      const result = await res.json() as { id: string; key: string; name: string; orgId: string };

      console.log("API key created successfully!");
      console.log();
      console.log(`  ID:    ${result.id}`);
      console.log(`  Name:  ${result.name}`);
      console.log(`  Org:   ${result.orgId}`);
      console.log(`  Key:   ${result.key}`);
      console.log();
      console.log("Store this key securely. It will not be shown again.");
      console.log();
      console.log("To use this key, add it to .hippocampus/hippo.yaml:");
      console.log();
      console.log("  remote:");
      console.log(`    apiKey: "${result.key}"`);
    } catch (err) {
      console.error(`fatal: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

keysCommand
  .command("list")
  .description("List all API keys")
  .option("--org <orgId>", "Filter by organization ID")
  .action(async (opts) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadConfig();

    if (!config.remote.url) {
      console.error("fatal: No remote configured.");
      process.exit(1);
    }

    if (!config.remote.apiKey) {
      console.error("fatal: No API key configured.");
      process.exit(1);
    }

    try {
      const url = new URL(`${config.remote.url}/v1/api-keys`);
      if (opts.org) url.searchParams.set("orgId", opts.org);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${config.remote.apiKey}`,
        },
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 401) {
          console.error("fatal: Authentication failed. Check your API key.");
        } else {
          console.error(`fatal: Failed to list API keys: ${err}`);
        }
        process.exit(1);
      }

      const result = await res.json() as {
        keys: Array<{
          id: string;
          name: string;
          orgId: string;
          isActive: boolean;
          createdAt: string;
          lastUsedAt: string | null;
        }>;
      };

      if (result.keys.length === 0) {
        console.log("No API keys found.");
        return;
      }

      console.log(`Found ${result.keys.length} API key(s):\n`);

      for (const key of result.keys) {
        const status = key.isActive ? "\x1b[32m●\x1b[0m" : "\x1b[31m○\x1b[0m";
        const lastUsed = key.lastUsedAt
          ? `last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
          : "never used";
        console.log(`${status} ${key.id.slice(0, 8)}  ${key.name}`);
        console.log(`    org: ${key.orgId}  |  ${lastUsed}`);
      }
    } catch (err) {
      console.error(`fatal: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

keysCommand
  .command("revoke")
  .description("Revoke an API key")
  .argument("<id>", "API key ID to revoke")
  .action(async (id) => {
    if (!isInitialized()) {
      console.error("fatal: not a hippocampus repository");
      process.exit(1);
    }

    const config = loadConfig();

    if (!config.remote.url) {
      console.error("fatal: No remote configured.");
      process.exit(1);
    }

    if (!config.remote.apiKey) {
      console.error("fatal: No API key configured.");
      process.exit(1);
    }

    try {
      const res = await fetch(`${config.remote.url}/v1/api-keys/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${config.remote.apiKey}`,
        },
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 401) {
          console.error("fatal: Authentication failed. Check your API key.");
        } else if (res.status === 404) {
          console.error(`fatal: API key '${id}' not found.`);
        } else {
          console.error(`fatal: Failed to revoke API key: ${err}`);
        }
        process.exit(1);
      }

      console.log(`API key ${id.slice(0, 8)}... revoked successfully.`);
    } catch (err) {
      console.error(`fatal: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

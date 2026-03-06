import { Command } from "commander";
import { isInitialized, getConfigPath } from "../config.js";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR, EXIT_ERROR } from "../exit-codes.js";
import fs from "node:fs";
import YAML from "yaml";
import type { HippoConfig, HippoConfigV2, RemoteConfig } from "../../core/types.js";

export const remoteCommand = new Command("remote")
  .description("Manage set of tracked remote repositories")
  .action(() => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfigV2();
    const remotes = getRemotes(config);

    if (Object.keys(remotes).length === 0) {
      logger.info("No remotes configured.");
      logger.info("Use 'hippo remote add <name> <url>' to add a remote.");
      return;
    }

    for (const [name, remote] of Object.entries(remotes)) {
      logger.info(`${name}\t${remote.url}`);
    }
  });

export const remoteAddCommand = new Command("add")
  .description("Add a new remote")
  .argument("<name>", "Name for the remote (e.g., origin)")
  .argument("<url>", "URL of the remote hippocampus server")
  .option("--org <orgId>", "Organization ID")
  .option("--repo <repoId>", "Repository ID")
  .action((name, url, opts) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfigV2();
    const remotes = getRemotes(config);

    if (remotes[name]) {
      logger.fatal(`remote '${name}' already exists.`);
      logger.error(`Use 'hippo remote set-url ${name} <newurl>' to change the URL.`);
      process.exit(EXIT_ERROR);
    }

    remotes[name] = {
      url,
      orgId: opts.org || config.remote?.orgId || "",
      repoId: opts.repo || config.remote?.repoId || "",
    };

    saveConfigV2(config, remotes);
    logger.info(`Remote '${name}' added: ${url}`);
  });

export const remoteRemoveCommand = new Command("remove")
  .alias("rm")
  .description("Remove a remote")
  .argument("<name>", "Name of the remote to remove")
  .action((name) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfigV2();
    const remotes = getRemotes(config);

    if (!remotes[name]) {
      logger.fatal(`No such remote: '${name}'`);
      process.exit(EXIT_ERROR);
    }

    delete remotes[name];
    saveConfigV2(config, remotes);
    logger.info(`Remote '${name}' removed.`);
  });

export const remoteSetUrlCommand = new Command("set-url")
  .description("Change the URL for a remote")
  .argument("<name>", "Name of the remote")
  .argument("<newurl>", "New URL for the remote")
  .action((name, newurl) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfigV2();
    const remotes = getRemotes(config);

    if (!remotes[name]) {
      logger.fatal(`No such remote: '${name}'`);
      logger.error(`Use 'hippo remote add ${name} ${newurl}' to add it.`);
      process.exit(EXIT_ERROR);
    }

    remotes[name].url = newurl;
    saveConfigV2(config, remotes);
    logger.info(`Remote '${name}' URL changed to: ${newurl}`);
  });

export const remoteShowCommand = new Command("show")
  .description("Show information about a remote")
  .argument("<name>", "Name of the remote")
  .action((name) => {
    if (!isInitialized()) {
      logger.fatal("not a hippocampus repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfigV2();
    const remotes = getRemotes(config);

    if (!remotes[name]) {
      logger.fatal(`No such remote: '${name}'`);
      process.exit(EXIT_ERROR);
    }

    const remote = remotes[name];
    logger.info(`* remote ${name}`);
    logger.info(`  URL: ${remote.url}`);
    logger.info(`  Org ID: ${remote.orgId || "(not set)"}`);
    logger.info(`  Repo ID: ${remote.repoId || "(not set)"}`);
  });

remoteCommand.addCommand(remoteAddCommand);
remoteCommand.addCommand(remoteRemoveCommand);
remoteCommand.addCommand(remoteSetUrlCommand);
remoteCommand.addCommand(remoteShowCommand);

function loadConfigV2(): HippoConfig & Partial<HippoConfigV2> {
  const configPath = getConfigPath();
  const raw = fs.readFileSync(configPath, "utf-8");
  return YAML.parse(raw) as HippoConfig & Partial<HippoConfigV2>;
}

function getRemotes(config: HippoConfig & Partial<HippoConfigV2>): Record<string, RemoteConfig> {
  if (config.remotes) {
    return config.remotes;
  }
  
  if (config.remote?.url) {
    return {
      origin: {
        url: config.remote.url,
        orgId: config.remote.orgId,
        repoId: config.remote.repoId,
      },
    };
  }
  
  return {};
}

function saveConfigV2(
  config: HippoConfig & Partial<HippoConfigV2>,
  remotes: Record<string, RemoteConfig>,
): void {
  const configPath = getConfigPath();
  
  const newConfig: HippoConfigV2 = {
    remotes,
    currentBranch: config.currentBranch || "main",
    defaults: config.defaults,
  };

  if (remotes.origin) {
    (newConfig as HippoConfig & HippoConfigV2).remote = {
      url: remotes.origin.url,
      orgId: remotes.origin.orgId,
      repoId: remotes.origin.repoId,
    };
  }

  fs.writeFileSync(configPath, YAML.stringify(newConfig), "utf-8");
}

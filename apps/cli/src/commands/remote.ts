import { Command } from "commander";
import { isInitialized, loadConfig, saveConfig } from "@unforgit/config";
import { logger } from "../logger.js";
import { EXIT_CONFIG_ERROR, EXIT_ERROR } from "../exit-codes.js";
import type { HippoConfig, RemoteConfig } from "@unforgit/shared";

export const remoteCommand = new Command("remote")
  .description("Manage set of tracked remote repositories")
  .addHelpText("after", `
Examples:
  unforgit remote                        List remotes
  unforgit remote add origin <url>       Add a remote
  unforgit remote show origin            Show remote details`)
  .action(() => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const remotes = getRemotes(config);

    if (Object.keys(remotes).length === 0) {
      logger.info("No remotes configured.");
      logger.info("Use 'unforgit remote add <name> <url>' to add a remote.");
      return;
    }

    for (const [name, remote] of Object.entries(remotes)) {
      logger.info(`${name}\t${remote.url}`);
    }
  });

export const remoteAddCommand = new Command("add")
  .description("Add a new remote")
  .argument("<name>", "Name for the remote (e.g., origin)")
  .argument("<url>", "URL of the remote unforgit server")
  .option("--org <orgId>", "Organization ID")
  .option("--repo <repoId>", "Repository ID")
  .action((name, url, opts) => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const remotes = getRemotes(config);

    if (remotes[name]) {
      logger.fatal(`remote '${name}' already exists.`);
      logger.error(`Use 'unforgit remote set-url ${name} <newurl>' to change the URL.`);
      process.exit(EXIT_ERROR);
    }

    remotes[name] = {
      url,
      orgId: opts.org || config.remote?.orgId || "",
      repoId: opts.repo || config.remote?.repoId || "",
    };

    saveRemotes(config, remotes);
    logger.info(`Remote '${name}' added: ${url}`);
  });

export const remoteRemoveCommand = new Command("remove")
  .alias("rm")
  .description("Remove a remote")
  .argument("<name>", "Name of the remote to remove")
  .action((name) => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const remotes = getRemotes(config);

    if (!remotes[name]) {
      logger.fatal(`No such remote: '${name}'`);
      process.exit(EXIT_ERROR);
    }

    delete remotes[name];
    saveRemotes(config, remotes);
    logger.info(`Remote '${name}' removed.`);
  });

export const remoteSetUrlCommand = new Command("set-url")
  .description("Change the URL for a remote")
  .argument("<name>", "Name of the remote")
  .argument("<newurl>", "New URL for the remote")
  .action((name, newurl) => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
    const remotes = getRemotes(config);

    if (!remotes[name]) {
      logger.fatal(`No such remote: '${name}'`);
      logger.error(`Use 'unforgit remote add ${name} ${newurl}' to add it.`);
      process.exit(EXIT_ERROR);
    }

    remotes[name].url = newurl;
    saveRemotes(config, remotes);
    logger.info(`Remote '${name}' URL changed to: ${newurl}`);
  });

export const remoteShowCommand = new Command("show")
  .description("Show information about a remote")
  .argument("<name>", "Name of the remote")
  .action((name) => {
    if (!isInitialized()) {
      logger.fatal("not an unforgit repository");
      process.exit(EXIT_CONFIG_ERROR);
    }

    const config = loadConfig();
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

function getRemotes(config: HippoConfig): Record<string, RemoteConfig> {
  if (config.remotes) {
    return { ...config.remotes };
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

function saveRemotes(config: HippoConfig, remotes: Record<string, RemoteConfig>): void {
  config.remotes = remotes;

  if (remotes.origin) {
    config.remote = {
      ...config.remote,
      url: remotes.origin.url,
      orgId: remotes.origin.orgId,
      repoId: remotes.origin.repoId,
    };
  }

  saveConfig(config);
}

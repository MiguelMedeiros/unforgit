import { isJsonMode } from "./utils.js";

type Verbosity = 0 | 1 | 2;

let level: Verbosity = 1;

export function setVerbosity(v: Verbosity): void {
  level = v;
}

export function getVerbosity(): Verbosity {
  return level;
}

const REDACTED = "[REDACTED]";

const secretPatterns: RegExp[] = [
  /\b([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD))\s*=\s*([^\s]+)/gi,
  /\b(authorization\s*:\s*bearer)\s+([^\s]+)/gi,
  /\b(client_secret)\s*=\s*([^\s&]+)/gi,
  /(postgres(?:ql)?:\/\/[^:\s/@]+:)([^@\s]+)(@)/gi,
];

export function redactSecrets(msg: string): string {
  return msg
    .replace(secretPatterns[0], (_match, prefix) => `${prefix}=${REDACTED}`)
    .replace(secretPatterns[1], (_match, prefix) => `${prefix} ${REDACTED}`)
    .replace(secretPatterns[2], (_match, prefix) => `${prefix}=${REDACTED}`)
    .replace(secretPatterns[3], (_match, prefix, _secret, suffix) => `${prefix}${REDACTED}${suffix}`);
}

function safeMessage(msg: string): string {
  return redactSecrets(msg);
}

export const logger = {
  fatal(msg: string): void {
    if (!isJsonMode()) console.error(`fatal: ${safeMessage(msg)}`);
  },

  error(msg: string): void {
    if (!isJsonMode()) console.error(`error: ${safeMessage(msg)}`);
  },

  warn(msg: string): void {
    if (level >= 1 && !isJsonMode()) console.error(`warning: ${safeMessage(msg)}`);
  },

  info(msg: string): void {
    if (level >= 1 && !isJsonMode()) console.log(safeMessage(msg));
  },

  debug(msg: string): void {
    if (level >= 2 && !isJsonMode()) console.error(`debug: ${safeMessage(msg)}`);
  },

  progress(current: number, total: number, label?: string): void {
    if (level >= 1 && !isJsonMode()) {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      const suffix = label ? ` ${safeMessage(label)}` : "";
      process.stdout.write(`\rProcessing ${current}/${total} (${pct}%)${suffix}`);
      if (current === total) process.stdout.write("\n");
    }
  },
};

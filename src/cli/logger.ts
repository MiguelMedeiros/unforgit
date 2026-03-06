type Verbosity = 0 | 1 | 2;

let level: Verbosity = 1;

export function setVerbosity(v: Verbosity): void {
  level = v;
}

export function getVerbosity(): Verbosity {
  return level;
}

export const logger = {
  fatal(msg: string): void {
    console.error(`fatal: ${msg}`);
  },

  error(msg: string): void {
    console.error(`error: ${msg}`);
  },

  warn(msg: string): void {
    if (level >= 1) console.error(`warning: ${msg}`);
  },

  info(msg: string): void {
    if (level >= 1) console.log(msg);
  },

  debug(msg: string): void {
    if (level >= 2) console.error(`debug: ${msg}`);
  },

  progress(current: number, total: number, label?: string): void {
    if (level >= 1) {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      const suffix = label ? ` ${label}` : "";
      process.stdout.write(`\rProcessing ${current}/${total} (${pct}%)${suffix}`);
      if (current === total) process.stdout.write("\n");
    }
  },
};

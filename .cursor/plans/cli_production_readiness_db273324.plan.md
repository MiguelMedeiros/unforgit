---
name: CLI Production Readiness
overview: Systematic plan to bring the Hippocampus CLI from v0.1.0 prototype to production-ready, covering error handling, validation, testing, CI/CD, packaging, and UX improvements across 7 phases.
todos:
  - id: p1-global-error
    content: "Phase 1.1: Add global error handler and parseAsync in src/cli/index.ts"
    status: completed
  - id: p1-try-finally
    content: "Phase 1.2: Wrap all LocalStore usages in try/finally across ~20 command files"
    status: completed
  - id: p1-signal
    content: "Phase 1.3: Add SIGINT/SIGTERM signal handling with cleanup registry"
    status: completed
  - id: p2-config-schema
    content: "Phase 2.1: Create Zod schemas in src/cli/schemas.ts and integrate into loadConfig()"
    status: completed
  - id: p2-input-validation
    content: "Phase 2.2: Add input validation for CLI options (confidence, ttl, type, limit)"
    status: completed
  - id: p3-timeout
    content: "Phase 3.1: Add fetch timeout with AbortController in RemoteClient"
    status: completed
  - id: p3-retry
    content: "Phase 3.2: Add retry with exponential backoff for transient failures"
    status: completed
  - id: p3-env-apikey
    content: "Phase 3.3: Support HIPPO_API_KEY env var fallback in RemoteClient"
    status: completed
  - id: p4-infra
    content: "Phase 4.1: Create vitest.config.ts and test helpers (temp dir, mock fetch, runCommand)"
    status: completed
  - id: p4-unit-tests
    content: "Phase 4.2: Write unit tests for config, remote-client, policy, templates, schemas"
    status: completed
  - id: p4-integration
    content: "Phase 4.3: Write integration tests for init, add, recall, push/pull, lifecycle commands"
    status: completed
  - id: p5-ci
    content: "Phase 5.1: Create .github/workflows/ci.yml with typecheck + test + build"
    status: completed
  - id: p5-npm
    content: "Phase 5.2: Add engines, files, repository, prepublishOnly to package.json"
    status: completed
  - id: p5-version
    content: "Phase 5.3: Read version dynamically from package.json instead of hardcoding"
    status: completed
  - id: p6-logger
    content: "Phase 6.1: Create src/cli/logger.ts with verbosity levels and global --verbose/--quiet flags"
    status: completed
  - id: p6-progress
    content: "Phase 6.2: Add progress indicators for batch commands (push, pull, backfill)"
    status: completed
  - id: p6-exit-codes
    content: "Phase 6.3: Define exit code constants and standardize across all commands"
    status: completed
  - id: p7-config-migration
    content: "Phase 7.1: Add configVersion field and migration logic"
    status: completed
  - id: p7-security
    content: "Phase 7.2: Env var support for keys, mask output, permission check"
    status: completed
  - id: p7-dedup
    content: "Phase 7.3: Extract shared truncate() and other utils to src/cli/utils.ts"
    status: completed
isProject: false
---

# CLI Production Readiness Plan

## Phase 1 — Foundation: Error Handling and Resource Safety

The most critical changes — prevent data corruption, unhandled crashes, and confusing error messages.

### 1.1 Global error handler in [src/cli/index.ts](src/cli/index.ts)

Replace `program.parse()` with:

```typescript
process.on("uncaughtException", (err) => {
  console.error(`fatal: ${err.message}`);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error(`fatal: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
program.parseAsync().catch((err) => {
  console.error(`fatal: ${err.message}`);
  process.exit(1);
});
```

### 1.2 Resource cleanup with try/finally

Every command that opens `LocalStore` must close it in a `finally` block. This affects **~20 command files** under `src/cli/commands/`. The pattern:

```typescript
const store = new LocalStore(getDbPath());
try {
  // command logic
} finally {
  store.close();
}
```

Files to update: `add.ts`, `recall.ts`, `promote.ts`, `deprecate.ts`, `supersede.ts`, `delete.ts`, `link.ts`, `merge.ts`, `auto-consolidate.ts`, `unconsolidate.ts`, `status.ts`, `push.ts`, `pull.ts`, `log.ts`, `branch.ts`, `diff.ts`, `embeddings.ts`.

### 1.3 Signal handling (SIGINT/SIGTERM)

Add a cleanup registry in [src/cli/index.ts](src/cli/index.ts) so that Ctrl+C during push/pull closes the SQLite DB gracefully:

```typescript
const cleanupHandlers: Array<() => void> = [];
export function registerCleanup(fn: () => void) { cleanupHandlers.push(fn); }

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    for (const fn of cleanupHandlers) fn();
    process.exit(130);
  });
}
```

Commands register `store.close` on creation and unregister on normal exit.

---

## Phase 2 — Input Validation

### 2.1 Zod schemas for config validation

Create [src/cli/schemas.ts](src/cli/schemas.ts) with Zod schemas mirroring the types in [src/core/types.ts](src/core/types.ts):

```typescript
import { z } from "zod";

export const hippoConfigSchema = z.object({
  remote: z.object({
    url: z.string().url(),
    orgId: z.string(),
    repoId: z.string(),
    apiKey: z.string().optional(),
  }),
  defaults: z.object({
    visibility: z.enum(["private", "repo", "auto"]),
    memoryType: z.enum(["episodic", "semantic", "procedural"]),
  }),
  sync: z.object({
    enabled: z.boolean(),
    intervalMs: z.number().positive(),
    debounceMs: z.number().nonnegative(),
    autoResolveConflicts: z.enum(["last_write_wins", "local_wins", "remote_wins", "manual"]),
  }).optional(),
  embeddings: z.object({
    enabled: z.boolean(),
    model: z.string(),
    autoGenerate: z.boolean(),
  }).optional(),
});
```

Update `loadConfig()` in [src/cli/config.ts](src/cli/config.ts) to parse through the schema instead of a raw cast.

### 2.2 Command-level input validation

Create shared validators for common CLI option patterns:

- `--confidence <n>`: validate `0 <= n <= 1`, not NaN
- `--ttl <seconds>`: validate positive integer, not NaN
- `--type <type>`: validate against `"episodic" | "semantic" | "procedural"`
- `--limit <n>`: validate positive integer

Apply to: `add.ts`, `recall.ts`, `merge.ts`, `log.ts`, `embeddings.ts`.

---

## Phase 3 — RemoteClient Robustness

### 3.1 Timeout support

Add an `AbortController` with configurable timeout (default 30s) to every `fetch()` in [src/cli/remote-client.ts](src/cli/remote-client.ts):

```typescript
private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
```

### 3.2 Retry with exponential backoff

Add retry logic for transient failures (5xx, network errors) — max 3 attempts with exponential backoff (1s, 2s, 4s). Do NOT retry 4xx errors. Wrap `fetchWithTimeout` in a `fetchWithRetry` method.

### 3.3 Environment variable for API key

Support `HIPPO_API_KEY` environment variable as fallback in the constructor:

```typescript
constructor(baseUrl: string, apiKey?: string) {
  this.apiKey = apiKey || process.env.HIPPO_API_KEY;
}
```

---

## Phase 4 — Testing

### 4.1 Test infrastructure

- Create `vitest.config.ts` at root with proper config (globals, TypeScript, coverage thresholds)
- Create `src/cli/__tests__/` directory
- Create `src/core/__tests__/` directory
- Create a test helper `src/cli/__tests__/helpers.ts` with:
  - `createTempHippoDir()`: scaffolds a temp dir with `hippo.yaml` and `local.db`
  - `mockRemoteClient()`: mock fetch for remote tests
  - `runCommand(args)`: spawns `tsx src/cli/index.ts` with args and captures stdout/stderr/exitCode

### 4.2 Unit tests (highest priority)


| Test file                                 | Covers                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `src/cli/__tests__/config.test.ts`        | `loadConfig`, `saveConfig`, `detectGitInfo`, `isInitialized`, schema validation |
| `src/cli/__tests__/remote-client.test.ts` | All RemoteClient methods, error handling, timeout, retry                        |
| `src/core/__tests__/policy.test.ts`       | `resolveVisibility` — sensitive patterns, episodic rules, promotion hints       |
| `src/core/__tests__/templates.test.ts`    | `applyTemplate`, `getTemplate`, `formatTemplateList`                            |
| `src/cli/__tests__/schemas.test.ts`       | Zod schema validation — valid configs, invalid configs, edge cases              |


### 4.3 Integration tests (command-level)


| Test file                                      | Covers                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/cli/__tests__/commands/init.test.ts`      | `hippo init` — creates dir, config, DB; idempotent; cursor rule; git detection |
| `src/cli/__tests__/commands/add.test.ts`       | `hippo add` — basic, templates, tags, validation errors                        |
| `src/cli/__tests__/commands/recall.test.ts`    | `hippo recall` — local-only, remote-only, merged, empty results                |
| `src/cli/__tests__/commands/push-pull.test.ts` | `push`/`pull` — dry-run, conflicts, force, no remote                           |
| `src/cli/__tests__/commands/lifecycle.test.ts` | `deprecate`, `supersede`, `delete`, `restore`                                  |


### 4.4 Coverage target

Set vitest coverage thresholds: **80% lines, 80% branches** for `src/cli/` and `src/core/`.

---

## Phase 5 — CI/CD and Publishing

### 5.1 GitHub Actions workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec tsc --noEmit
      - run: pnpm test -- --coverage
      - run: pnpm build
```

### 5.2 NPM publish metadata

Update [package.json](package.json):

```json
{
  "engines": { "node": ">=20" },
  "files": ["dist/", "README.md", "LICENSE"],
  "repository": { "type": "git", "url": "..." },
  "homepage": "...",
  "bugs": { "url": "..." },
  "scripts": {
    "prepublishOnly": "pnpm build"
  }
}
```

### 5.3 Dynamic version

In [src/cli/index.ts](src/cli/index.ts), read version from `package.json` at build time via tsup `define` or import the JSON directly, instead of hardcoding `"0.1.0"`.

---

## Phase 6 — Logging and UX

### 6.1 Structured logger utility

Create [src/cli/logger.ts](src/cli/logger.ts) with:

```typescript
const verbosity = { quiet: 0, normal: 1, verbose: 2 };

export const logger = {
  fatal(msg: string) { console.error(`fatal: ${msg}`); },
  error(msg: string) { console.error(`error: ${msg}`); },
  warn(msg: string) { if (level >= 1) console.error(`warning: ${msg}`); },
  info(msg: string) { if (level >= 1) console.log(msg); },
  debug(msg: string) { if (level >= 2) console.error(`debug: ${msg}`); },
};
```

Add global `--verbose` and `--quiet` flags in [src/cli/index.ts](src/cli/index.ts) via `program.option()`.

### 6.2 Progress indicators

For batch commands (`push`, `pull`, `auto-consolidate`, `embeddings backfill`), add simple line-based progress: `Processing 3/42...`. No need for a full progress bar library — keep dependencies minimal.

### 6.3 Consistent exit codes

Define constants in [src/cli/exit-codes.ts](src/cli/exit-codes.ts):

- `0` — success
- `1` — general error / user error
- `2` — config/init error
- `130` — interrupted (SIGINT)

Replace all raw `process.exit(1)` with the appropriate code.

---

## Phase 7 — Config Migration and Polish

### 7.1 Config versioning

Add a `configVersion: 1` field to `hippo.yaml` on init. In `loadConfig()`, check the version and run migration functions if needed. This prepares for the `HippoConfigV2` type that already exists in [src/core/types.ts](src/core/types.ts).

### 7.2 API key security improvements

- Support `HIPPO_API_KEY` and `OPENAI_API_KEY` env vars (Phase 3.3 covers the remote client side)
- In `auth status`, always mask the key: show only first 6 + last 4 characters
- Warn if `.hippocampus/hippo.yaml` is world-readable (`fs.statSync` + permission check on Unix)

### 7.3 Truncate helper dedup

The `truncate()` function is duplicated in `push.ts` and `status.ts`. Extract to a shared [src/cli/utils.ts](src/cli/utils.ts).

---

## Dependency summary

No new npm dependencies are needed. Everything uses:

- `zod` (already installed) for validation
- `vitest` (already installed) for testing
- Native `AbortController` for timeouts
- Native `setTimeout` for retry backoff

```mermaid
flowchart LR
  subgraph p1 [Phase 1: Error Handling]
    A1[Global handler]
    A2[try/finally cleanup]
    A3[Signal handling]
  end
  subgraph p2 [Phase 2: Validation]
    B1[Config schema]
    B2[Input validators]
  end
  subgraph p3 [Phase 3: RemoteClient]
    C1[Timeout]
    C2[Retry]
    C3[Env var API key]
  end
  subgraph p4 [Phase 4: Testing]
    D1[Test infra]
    D2[Unit tests]
    D3[Integration tests]
  end
  subgraph p5 [Phase 5: CI/CD]
    E1[GitHub Actions]
    E2[NPM metadata]
    E3[Dynamic version]
  end
  subgraph p6 [Phase 6: UX]
    F1[Logger]
    F2[Progress]
    F3[Exit codes]
  end
  subgraph p7 [Phase 7: Polish]
    G1[Config migration]
    G2[Security]
    G3[Dedup utils]
  end
  p1 --> p2 --> p3 --> p4 --> p5 --> p6 --> p7
```




# Hippocampus

Repository memory system for agents and developers. Shared knowledge per repo, local private memory, and consolidation via PR.

## Concepts

### Memory Types

| Type | Description | Value |
|------|-------------|-------|
| `episodic` | Events/observations (noisy, short-lived) | Low |
| `semantic` | Facts/decisions (stable) | High |
| `procedural` | Playbooks/checklists/routines | High |

### Scopes

- **local (private)** — per workspace on your machine (`.hippocampus/local.db`)
- **remote (shared)** — per org + repo on PostgreSQL

### Statuses

- `active` — current and relevant
- `deprecated` — should not be used
- `superseded` — replaced by a newer memory

## Quick Start

### Install

```bash
pnpm install
pnpm run db:generate
```

### Initialize in a repo

```bash
hippo init
```

This creates `.hippocampus/` with `local.db` and `hippo.yaml`. The org and repo are auto-detected from the git remote (`origin`). You can override with `--org-id` and `--repo-id` if needed.

### Add memories

```bash
# Episodic (local by default)
hippo add "Found a race condition in the queue worker" --type episodic --tags "bug,queue"

# Semantic with source reference
hippo add "We use UTC timestamps everywhere" --type semantic --tags "convention" --source-pr "https://github.com/org/repo/pull/42"

# Procedural
hippo add "To deploy: run make release, then kubectl apply" --type procedural --tags "deploy,playbook"
```

### Recall

```bash
hippo recall "how to deploy" --types procedural,semantic --k 5

# Local only
hippo recall "race condition" --local-only

# Remote only
hippo recall "auth decisions" --remote-only
```

### Promote to shared

```bash
hippo promote <memory-id> --source-pr "https://github.com/org/repo/pull/99"
```

### Consolidate

```bash
hippo consolidate --from-pr "https://github.com/org/repo/pull/100"
```

### Curate

```bash
hippo deprecate <id> --reason "outdated after migration"
hippo supersede <old-id> --with <new-id>
```

## API Server

### Setup

```bash
# Set DATABASE_URL in .env
cp .env.example .env

# Run migrations
pnpm run db:migrate

# Start server
pnpm run dev:server
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/memory` | Create a memory |
| POST | `/v1/recall` | Search memories |
| POST | `/v1/memory/:id/deprecate` | Deprecate a memory |
| POST | `/v1/memory/:id/supersede` | Mark as superseded |
| POST | `/v1/memory/:id/pin` | Pin a memory |
| POST | `/v1/consolidate` | Consolidate memories |
| GET | `/health` | Health check |

### POST /v1/memory

```json
{
  "orgId": "uuid",
  "repoId": "my-repo",
  "memoryType": "semantic",
  "text": "Always use UTC timestamps",
  "tags": ["convention"],
  "sourceRefs": { "pr_url": "https://..." },
  "confidence": 0.9
}
```

### POST /v1/recall

```json
{
  "orgId": "uuid",
  "repoId": "my-repo",
  "query": "how do timestamps work",
  "types": ["semantic", "procedural"],
  "tags": ["convention"],
  "k": 10
}
```

## Agent Tools

Import and use the programmatic interface:

```typescript
import { createMemoryTools } from "hippocampus/tools";

const memory = createMemoryTools({
  localDbPath: ".hippocampus/local.db",
  remoteUrl: "http://localhost:3737",
  orgId: "your-org-id",
  repoId: "your-repo-id",
});

// Always recall before making big changes
const context = await memory.recall({
  query: "authentication flow",
  types: ["semantic", "procedural"],
  k: 5,
});

// Store observations during work
await memory.store({
  text: "The OAuth2 callback URL must use HTTPS in production",
  type: "semantic",
  tags: ["auth", "gotcha"],
  sourceRefs: { pr_url: "https://..." },
});

// Promote local knowledge to shared
await memory.promote({
  localId: "local-memory-uuid",
  sourceRefs: { pr_url: "https://..." },
});

// Consolidate after PR merge
await memory.consolidate({
  fromPr: "https://github.com/org/repo/pull/123",
});
```

## Auto-Visibility Policy

When `visibility` is set to `auto`, the system decides:

- **private** if: contains sensitive content, or episodic without source references
- **repo** if: semantic/procedural AND has source references or tags like `decision`, `adr`, `playbook`, `gotcha`
- **uncertain**: saves locally and suggests promotion

## Project Structure

```
src/
├── server/          # Fastify HTTP API
│   ├── routes/      # memory, recall, curate, consolidate
│   └── index.ts     # App factory + server start
├── cli/             # Commander CLI (hippo)
│   ├── commands/    # init, add, recall, promote, consolidate, deprecate, supersede
│   └── index.ts     # CLI entry point
├── core/            # Shared domain logic
│   ├── types.ts     # TypeScript types
│   ├── schemas.ts   # Zod validation schemas
│   ├── policy.ts    # Auto-visibility policy
│   └── recall.ts    # Merge + dedup + rank
├── db/              # Data access
│   ├── local.ts     # SQLite + FTS5
│   └── remote.ts    # Prisma + PostgreSQL
└── tools/           # Agent tool functions
    └── index.ts     # recall, store, promote, consolidate
```

## Development

```bash
pnpm dev:server    # Start API server with hot reload
pnpm dev:cli       # Run CLI in dev mode
pnpm build         # Build for production
pnpm test          # Run tests
```

## License

MIT

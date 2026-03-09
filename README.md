# Unforgit

Repository memory system for agents and developers. Shared knowledge per repo, local private memory, and a brain-like lifecycle that saves broadly, consolidates what matters, and forgets stale episodic noise.

## Concepts

### Memory Types

| Type | Description | Value |
|------|-------------|-------|
| `episodic` | Events/observations (noisy, short-lived) | Low |
| `semantic` | Facts/decisions (stable) | High |
| `procedural` | Playbooks/checklists/routines | High |

### Scopes

- **local (private)** — per workspace on your machine (`.unforgit/local.db`)
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
unforgit init
```

This creates `.unforgit/` with `local.db` and `unforgit.yaml`, plus Cursor IDE integration (`.cursor/rules/` and `.cursor/mcp.json`). The org and repo are auto-detected from the git remote (`origin`). You can override with `--org-id` and `--repo-id` if needed.

Use `--no-cursor-rule` to skip Cursor integration.

### Add memories

```bash
# Episodic (local by default)
unforgit add "Found a race condition in the queue worker" --type episodic --tags "bug,queue"

# Semantic with source reference
unforgit add "We use UTC timestamps everywhere" --type semantic --tags "convention" --source-pr "https://github.com/org/repo/pull/42"

# Procedural
unforgit add "To deploy: run make release, then kubectl apply" --type procedural --tags "deploy,playbook"
```

### Recall

```bash
unforgit recall "how to deploy" --types procedural,semantic --k 5

# Local only
unforgit recall "race condition" --local-only

# Remote only
unforgit recall "auth decisions" --remote-only
```

### Templates

Use templates for common memory types:

```bash
# Decision (semantic, auto-tagged)
unforgit add --template decision "We're using PostgreSQL instead of MySQL for better JSON support"

# Gotcha (episodic, warning)
unforgit add --template gotcha "OAuth callback requires HTTPS in production"

# Playbook (procedural, how-to)
unforgit add --template playbook "To deploy: make release && kubectl apply -f k8s/"

# Bug fix
unforgit add --template bug "Fixed race condition in queue worker by adding mutex"

# Other templates: adr, convention, workaround, perf, security, api
unforgit add --list-templates
```

### Brain-Like Lifecycle

Unforgit now treats memory more like a brain than a notes app:

- `episodic` memories are captured with low friction and get a default TTL
- frequently reused memories receive a small ranking boost on recall
- similar episodic memories can be consolidated into stronger semantic memories
- stale episodic noise can be previewed and cleaned up with a single lifecycle pass
- long-lived surfaces can auto-trigger maintenance in the background after save/recall, with debounce

```bash
# Preview lifecycle maintenance (default)
unforgit curate

# Execute expiry + consolidation locally
unforgit curate --execute

# Execute lifecycle maintenance on the remote server
unforgit curate --remote --execute
```

### Semantic Search with Embeddings

Unforgit uses OpenAI embeddings for semantic search, finding memories by meaning rather than just keywords.

```bash
# Generate embeddings for existing memories
unforgit embeddings backfill

# Check embedding coverage
unforgit embeddings stats

# Clear all embeddings (requires regeneration)
unforgit embeddings clear --yes
```

The system uses a hybrid scoring approach with a bounded usage boost:
- semantic similarity (embeddings)
- text match (FTS5)
- recency
- confidence
- small reuse-based boost for memories that keep proving useful

### Promote to shared

```bash
unforgit promote <memory-id> --source-pr "https://github.com/org/repo/pull/99"
```

### Consolidate

```bash
unforgit consolidate --from-pr "https://github.com/org/repo/pull/100"
```

### Curate

```bash
unforgit deprecate <id> --reason "outdated after migration"
unforgit supersede <old-id> --with <new-id>
```

### Reset

```bash
# Permanently delete ALL memories, links, embeddings, and sync state
unforgit reset                # reset local + remote
unforgit reset --local        # reset local store only
unforgit reset --remote       # reset remote store only
unforgit reset --force        # skip confirmation prompt
```

### Merge (Consolidate Memories)

Combine multiple related memories into a single unified memory while preserving the full history — like a Git commit for knowledge.

```bash
# Find similar memories (candidates for merging)
unforgit similar <memory-id> --limit 10 --threshold 0.3

# Merge multiple memories into one
unforgit merge <id1> <id2> <id3> -t "Unified deployment guide: run make release, kubectl apply, wait for health check, rollback on error"

# Update an existing consolidation with new info
unforgit remerge <consolidation-id> -t "Updated text with new insights" --add "<new-memory-id>"

# View consolidation history
unforgit history <memory-id>
```

The original memories are preserved and linked via `derived_from` relationships. By default, source memories are marked as `superseded` so they don't clutter recall results, but the history is always accessible.

## OpenAI API Key (Optional)

Unforgit works **without** an OpenAI API key, but some advanced features require it.

### What works WITHOUT OpenAI:

| Feature | Status |
|---------|--------|
| Add memories (`unforgit add`) | ✅ Full |
| Recall via text search (`unforgit recall`) | ✅ FTS5 |
| Promote, deprecate, supersede | ✅ Full |
| Manual consolidation (`unforgit merge`) | ✅ Full |
| Team sync (push/pull) | ✅ Full |
| Web dashboard | ✅ Full |
| MCP integration (Cursor) | ✅ Full |
| Links and history | ✅ Full |

### What REQUIRES OpenAI:

| Feature | Description |
|---------|-------------|
| Semantic search | `unforgit recall` uses AI embeddings for meaning-based search |
| Embedding generation | `unforgit embeddings backfill` creates vectors for existing memories |
| Auto-consolidation | AI-powered suggestions for merging similar memories |
| Hybrid scoring | 50% semantic + 20% FTS + 15% recency + 15% confidence |

### Configuration

```bash
# Set via CLI
unforgit auth openai sk-your-api-key

# Or in .unforgit/unforgit.yaml
openaiApiKey: sk-your-api-key

# Or via environment variable
export OPENAI_API_KEY=sk-your-api-key
```

When the key is not configured, Unforgit gracefully falls back to FTS-only search without errors.

## Sync with Remote Server

Unforgit supports syncing memories between local (SQLite) and remote (PostgreSQL) storage.

### Configuration

Use the `unforgit config` command to manage all settings:

```bash
# List all configuration
unforgit config list

# Set remote server URL
unforgit config set remote.url https://unforgit.example.com

# Get a specific value
unforgit config get remote.url
```

### Authentication

The remote server requires API key authentication:

```bash
# Set API key for this repository
unforgit auth set hk_your_api_key_here

# Check authentication status
unforgit auth status

# Remove API key
unforgit auth remove
```

### OpenAI API Key (for auto-consolidation)

Configure OpenAI for AI-powered memory consolidation:

```bash
# Set OpenAI API key
unforgit auth openai sk-your-openai-key

# Remove OpenAI API key
unforgit auth openai-remove
```

### Manual Configuration

You can also edit `.unforgit/unforgit.yaml` directly:

```yaml
remote:
  url: http://localhost:3737
  orgId: your-org
  repoId: your-repo
  apiKey: hk_your_api_key_here
openaiApiKey: sk-your-openai-key
defaults:
  visibility: auto
  memoryType: episodic
sync:
  enabled: true
  intervalMs: 60000           # Sync every 60 seconds
  debounceMs: 5000            # Wait 5s after changes before syncing
  autoResolveConflicts: last_write_wins  # or: local_wins, remote_wins, manual
embeddings:
  enabled: true
  model: text-embedding-3-small
  autoGenerate: true          # Generate embeddings on memory creation
lifecycle:
  ttlSecondsByType:
    episodic: 2592000         # 30 days
  usageBoost:
    topKToRecord: 5
    minUsageCount: 2
    maxBoost: 0.15
    halfLifeDays: 30
  maintenance:
    staleEpisodicDays: 30
    consolidationThreshold: 0.5
    consolidationMinGroupSize: 2
    consolidationMaxGroups: 5
    promoteRecallCount: 5
    pinRecallCount: 8
    dryRunDefault: true
    autoRunOnStore: true
    autoRunOnRecall: true
    debounceMs: 30000
```

### Push & Pull

```bash
# Push local memories to remote
unforgit push

# Pull remote memories to local
unforgit pull

# Preview changes before pushing
unforgit push --dry-run

# Show differences between local and remote
unforgit diff
```

### Managing API Keys

```bash
# Create a new API key (requires existing admin key)
unforgit keys create --name "My Key" --org "my-org"

# List all API keys
unforgit keys list

# Revoke an API key
unforgit keys revoke <key-id>
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

### Authentication

All API endpoints (except `/health`) require authentication via Bearer token:

```bash
curl -H "Authorization: Bearer hk_your_api_key" \
     -H "Content-Type: application/json" \
     http://localhost:3737/v1/recall \
     -d '{"orgId":"org","repoId":"repo","query":"test"}'
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
| POST | `/v1/lifecycle/run` | Preview or run lifecycle maintenance |
| DELETE | `/v1/memory/:id` | Delete a memory |
| POST | `/v1/memory/:id/restore` | Restore a deleted memory |
| POST | `/v1/memories/reset` | Reset all memories for org/repo |
| POST | `/v1/api-keys` | Create API key |
| GET | `/v1/api-keys` | List API keys |
| DELETE | `/v1/api-keys/:id` | Revoke API key |
| GET | `/health` | Health check (no auth required) |

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

## Server-Side AI (Team Mode)

When running the Unforgit server for a team, you can configure server-side OpenAI integration so individual developers don't need their own API keys.

### Configuration

Set these environment variables on the server:

```bash
# Required for AI features
OPENAI_API_KEY=sk-your-team-api-key

# Auto-generate embeddings when memories are created
AUTO_EMBEDDING_ENABLED=true

# LLM model for consolidation (default: gpt-4o-mini)
CONSOLIDATION_MODEL=gpt-4o-mini
```

### Server AI Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/recall` | **Semantic search** - hybrid FTS + embedding similarity |
| POST | `/v1/embeddings/generate/:memoryId` | Generate embedding for one memory |
| POST | `/v1/embeddings/backfill` | Generate embeddings for all memories |
| GET | `/v1/embeddings/stats` | Embedding coverage statistics |
| POST | `/v1/auto-consolidate/preview` | Find consolidation candidates |
| POST | `/v1/auto-consolidate` | Auto-consolidate with LLM |
| POST | `/v1/auto-consolidate/execute` | Execute specific group |
| POST | `/v1/lifecycle/run` | Run the brain-like maintenance loop |
| GET | `/v1/suggestions` | AI-powered curation suggestions |
| GET | `/v1/health/repo` | Repository health report |

### Example: Semantic Search

When `OPENAI_API_KEY` is set on the server, `/v1/recall` automatically uses hybrid scoring:

```bash
curl -X POST http://localhost:3737/v1/recall \
  -H "Authorization: Bearer hk_xxx" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"org","repoId":"repo","query":"how to release to production"}'
```

Response includes `searchType: "hybrid"` when semantic search is active.

### Example: Auto-Consolidation

```bash
# Preview candidates
curl -X POST http://localhost:3737/v1/auto-consolidate/preview \
  -H "Authorization: Bearer hk_xxx" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"org","repoId":"repo","threshold":0.5}'

# Execute consolidation
curl -X POST http://localhost:3737/v1/auto-consolidate \
  -H "Authorization: Bearer hk_xxx" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"org","repoId":"repo","maxGroups":5}'
```

### Example: Health Check

```bash
curl "http://localhost:3737/v1/health/repo?orgId=org&repoId=repo" \
  -H "Authorization: Bearer hk_xxx"
```

Returns:

```json
{
  "overall": "healthy",
  "score": 85,
  "metrics": {
    "totalMemories": 150,
    "embeddingCoverage": 92,
    "consolidationRatio": 15
  },
  "recommendations": ["Consider consolidating similar memories"],
  "serverCapabilities": {
    "semanticSearch": true,
    "autoConsolidation": true,
    "autoEmbedding": true
  }
}
```

## Agent Tools

Import and use the programmatic interface:

```typescript
import { createMemoryTools } from "unforgit/tools";

const memory = createMemoryTools({
  localDbPath: ".unforgit/local.db",
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

## MCP Server (Cursor IDE)

Unforgit includes an MCP (Model Context Protocol) server for native integration with Cursor IDE. When configured, the AI agent gets direct access to `unforgit_recall` and `unforgit_add` tools — no shell commands needed.

### Setup

`unforgit init` automatically creates `.cursor/mcp.json` with the MCP server config. If you need to set it up manually:

```json
{
  "mcpServers": {
    "unforgit": {
      "command": "unforgit-mcp",
      "args": []
    }
  }
}
```

Restart Cursor after adding the MCP config.

### Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `unforgit_recall` | Search memories by query | `query`, `types?`, `tags?`, `k?`, `expandHistory?` |
| `unforgit_add` | Store a new memory | `text`, `type?`, `tags?`, `template?` |
| `unforgit_curate` | Preview or run lifecycle maintenance | `dryRun?`, `model?`, `preserveOriginals?` |
| `unforgit_embedding_recall` | Semantic search using embeddings | `query`, `types?`, `tags?`, `k?` |
| `unforgit_consolidate` | Merge multiple memories into one | `sourceIds`, `consolidatedText`, `memoryType?`, `tags?` |
| `unforgit_reconsolidate` | Update existing consolidation | `existingConsolidationId`, `newText`, `additionalSourceIds?`, `tags?` |
| `unforgit_find_similar` | Find memories similar to a given one | `memoryId`, `threshold?`, `k?` |
| `unforgit_history` | Get consolidation history | `memoryId` |
| `unforgit_link` | Create link between memories | `sourceId`, `targetId`, `linkType` |
| `unforgit_unlink` | Remove link between memories | `sourceId`, `targetId`, `linkType` |
| `unforgit_links` | Get all links for a memory | `memoryId`, `linkType?` |
| `unforgit_sync_status` | Get sync status and embedding coverage | - |
| `unforgit_suggestions` | Get AI-powered curation suggestions | `maxSuggestions?` |
| `unforgit_health` | Get repository memory health report | - |
| `unforgit_notifications` | Get pending notifications | - |
| `unforgit_templates` | List available memory templates | - |

The MCP server works with the local SQLite store only (no remote dependency). It reads the config from `.unforgit/unforgit.yaml` in the current workspace.

### Cursor Rule

`unforgit init` also creates `.cursor/rules/unforgit-memory.mdc` which instructs the AI agent to:
- Recall relevant memories at the start of every conversation
- Save noteworthy decisions, bugs, and procedures during the conversation

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
├── mcp/             # MCP server (unforgit-mcp)
│   └── index.ts     # Stdio transport + tools
├── cli/             # Commander CLI (unforgit)
│   ├── commands/    # init, add, recall, promote, consolidate, deprecate, supersede, reset, embeddings
│   └── index.ts     # CLI entry point
├── core/            # Shared domain logic
│   ├── types.ts     # TypeScript types
│   ├── schemas.ts   # Zod validation schemas
│   ├── policy.ts    # Auto-visibility policy
│   ├── recall.ts    # Merge + dedup + rank + hybrid scoring
│   ├── embeddings.ts    # OpenAI embeddings generation & similarity
│   ├── quality.ts       # Memory quality scoring
│   ├── suggestions.ts   # Curation suggestions generation
│   ├── notifications.ts # Notification system
│   ├── templates.ts     # Memory templates (decision, gotcha, playbook, etc.)
│   └── sync-service.ts  # Background sync service
├── db/              # Data access
│   ├── local.ts     # SQLite + FTS5 + embeddings + usage tracking
│   └── remote.ts    # Prisma + PostgreSQL + pgvector
└── tools/           # Agent tool functions
    └── index.ts     # recall, store, promote, consolidate

web/                 # Local dashboard (Next.js)
├── app/
│   ├── curation/    # Curation dashboard with suggestions
│   ├── team/        # Team leaderboard and metrics
│   └── ...
└── components/

website/             # Public website and docs (Next.js)
├── app/
│   ├── docs/        # Documentation
│   └── ...
└── components/
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

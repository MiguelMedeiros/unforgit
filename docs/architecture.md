# Architecture

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
│   ├── embeddings.ts    # Local/OpenAI embedding providers & similarity
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

## Semantic Search

Unforgit uses local-first embeddings for semantic search, finding memories by meaning rather than just keywords without requiring cloud credentials. OpenAI embeddings remain available when explicitly configured.

The system uses a hybrid scoring approach with a bounded usage boost:
- Semantic similarity (embeddings)
- Text match (FTS5)
- Recency
- Confidence
- Small reuse-based boost for memories that keep proving useful

## Development

```bash
pnpm dev:server    # Start API server with hot reload
pnpm dev:cli       # Run CLI in dev mode
pnpm build         # Build for production
pnpm test          # Run tests
```

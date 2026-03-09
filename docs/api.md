# API Server

## Setup

```bash
# Set DATABASE_URL in .env
cp .env.example .env

# Run migrations
pnpm run db:migrate

# Start server
pnpm run dev:server
```

## Authentication

All API endpoints (except `/health`) require authentication via Bearer token:

```bash
curl -H "Authorization: Bearer hk_your_api_key" \
     -H "Content-Type: application/json" \
     http://localhost:3737/v1/recall \
     -d '{"orgId":"org","repoId":"repo","query":"test"}'
```

## Endpoints

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

## Request Examples

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

# Server-Side AI (Team Mode)

When running the Unforgit server for a team, you can configure server-side OpenAI integration so individual developers don't need their own API keys.

## Configuration

Set these environment variables on the server:

```bash
# Required for AI features
OPENAI_API_KEY=sk-your-team-api-key

# Auto-generate embeddings when memories are created
AUTO_EMBEDDING_ENABLED=true

# LLM model for consolidation (default: gpt-5.4)
CONSOLIDATION_MODEL=gpt-5.4
```

## Server AI Endpoints

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

## Examples

### Semantic Search

When `OPENAI_API_KEY` is set on the server, `/v1/recall` automatically uses hybrid scoring:

```bash
curl -X POST http://localhost:3737/v1/recall \
  -H "Authorization: Bearer hk_xxx" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"org","repoId":"repo","query":"how to release to production"}'
```

Response includes `searchType: "hybrid"` when semantic search is active.

### Auto-Consolidation

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

### Health Check

```bash
curl "http://localhost:3737/v1/health/repo?orgId=org&repoId=repo" \
  -H "Authorization: Bearer hk_xxx"
```

Response:

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

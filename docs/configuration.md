# Configuration

## CLI Configuration

Use the `unforgit config` command to manage all settings:

```bash
# List all configuration
unforgit config list

# Set remote server URL
unforgit config set remote.url https://unforgit.example.com

# Get a specific value
unforgit config get remote.url
```

## Authentication

The remote server requires API key authentication:

```bash
# Set API key for this repository
unforgit auth set hk_your_api_key_here

# Check authentication status
unforgit auth status

# Remove API key
unforgit auth remove
```

## OpenAI API Key

Unforgit works **without** an OpenAI API key, but some advanced features require it.

### What works WITHOUT OpenAI

| Feature | Status |
|---------|--------|
| Add memories (`unforgit add`) | Full |
| Recall via text search (`unforgit recall`) | FTS5 |
| Promote, deprecate, supersede | Full |
| Manual consolidation (`unforgit merge`) | Full |
| Team sync (push/pull) | Full |
| Web dashboard | Full |
| MCP integration (Cursor) | Full |
| Links and history | Full |

### What REQUIRES OpenAI

| Feature | Description |
|---------|-------------|
| Semantic search | `unforgit recall` uses AI embeddings for meaning-based search |
| Embedding generation | `unforgit embeddings backfill` creates vectors for existing memories |
| Auto-consolidation | AI-powered suggestions for merging similar memories |
| Hybrid scoring | 50% semantic + 20% FTS + 15% recency + 15% confidence |

### Setting the Key

```bash
# Set via CLI
unforgit auth openai sk-your-api-key

# Or in .unforgit/unforgit.yaml
openaiApiKey: sk-your-api-key

# Or via environment variable
export OPENAI_API_KEY=sk-your-api-key
```

When the key is not configured, Unforgit gracefully falls back to FTS-only search without errors.

## YAML Configuration File

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

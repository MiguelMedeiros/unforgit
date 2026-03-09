# MCP Server (Cursor IDE)

Unforgit includes an MCP (Model Context Protocol) server for native integration with Cursor IDE. When configured, the AI agent gets direct access to `unforgit_recall` and `unforgit_add` tools — no shell commands needed.

## Setup

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

## Available Tools

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

## Cursor Rule

`unforgit init` also creates `.cursor/rules/unforgit-memory.mdc` which instructs the AI agent to:
- Recall relevant memories at the start of every conversation
- Save noteworthy decisions, bugs, and procedures during the conversation

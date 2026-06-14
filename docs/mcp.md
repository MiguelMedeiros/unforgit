# MCP Server

Unforgit includes an MCP (Model Context Protocol) server for native integration with AI-powered IDEs. When configured, the AI agent gets direct access to `unforgit_recall` and `unforgit_add` tools — no shell commands needed.

## Setup

`unforgit init` automatically detects which IDEs you use and creates the appropriate config files. You can also specify IDEs explicitly:

```bash
unforgit init                        # auto-detect IDEs
unforgit init --ide cursor           # Cursor only
unforgit init --ide claude           # Claude Code only
unforgit init --ide cursor,claude    # multiple IDEs
unforgit init --ide all              # all supported IDEs
unforgit init --no-ide               # skip IDE integration
```

### Supported IDEs

| IDE | Rules File | MCP Config |
|-----|-----------|------------|
| **Cursor** | `.cursor/rules/unforgit-memory.mdc` | `.cursor/mcp.json` |
| **Claude Code** | `CLAUDE.md` | `.mcp.json` |
| **VS Code (Copilot)** | `.github/copilot-instructions.md` | `.vscode/mcp.json` |
| **Windsurf** | `.windsurfrules` | `.windsurf/mcp.json` |

### Project-level vs global config

The MCP config should always be **project-level** (inside the repo), not global. This is because:

- Each repo has its own `.unforgit/` directory and configuration
- Each repo may use a different `OPENAI_API_KEY` or other environment variables
- Project-level configs ensure the IDE launches `unforgit-mcp` with the correct working directory

### Environment variables and `.env`

The MCP server **automatically loads the `.env` file** from the repository root. You don't need to put API keys in the MCP config — just add them to your `.env` file:

```bash
# .env (at repo root, already in .gitignore)
OPENAI_API_KEY=sk-your-key-here
```

This keeps secrets out of committed config files. The `.cursor/mcp.json` (or equivalent) can be safely committed to the repo since it contains no secrets.

### Repo root discovery

The MCP server walks up the filesystem from its working directory to find the `.unforgit/` folder, similar to how `git` finds `.git/`. This means it works even if the IDE launches the process from a subdirectory.

### Manual setup

If you need to configure an IDE manually, the MCP server config always follows the same pattern:

- **Transport:** stdio (stdin/stdout)
- **Command:** `unforgit-mcp`
- **Arguments:** none required
- **Working directory:** the project root where `.unforgit/` lives (auto-discovered)
- **Environment:** loaded automatically from the repo's `.env` file

Example for Cursor (`.cursor/mcp.json`):

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

Example for Claude Code (`.mcp.json` at project root):

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

Example for VS Code (`.vscode/mcp.json`):

```json
{
  "servers": {
    "unforgit": {
      "type": "stdio",
      "command": "unforgit-mcp"
    }
  }
}
```

Restart your IDE after adding the MCP config.

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

The MCP server works with the local SQLite store only (no remote dependency). It automatically discovers the `.unforgit/unforgit.yaml` config by walking up the filesystem from the working directory, and loads environment variables from the repo's `.env` file. A broken or offline `remote.url` affects CLI/API sync commands such as `push` and `pull`, but it does not stop local MCP recall/add tools from working.

## IDE Rules

`unforgit init` creates IDE-specific instruction files that teach the AI agent to:
- Recall relevant memories at the start of every conversation
- Save noteworthy decisions, bugs, and procedures during the conversation

| IDE | Rules file |
|-----|-----------|
| Cursor | `.cursor/rules/unforgit-memory.mdc` |
| Claude Code | `CLAUDE.md` (appended) |
| VS Code | `.github/copilot-instructions.md` (appended) |
| Windsurf | `.windsurfrules` (appended) |

For IDEs that use shared files (like `CLAUDE.md`), `unforgit init` safely appends the memory instructions without overwriting existing content.

# Installing Unforgit MCP

This file gives coding agents and MCP marketplaces the shortest reliable path to install and verify Unforgit.

## What Unforgit provides

Unforgit is a Git-backed memory system for AI coding agents. The published `unforgit` npm package includes:

- `unforgit` — CLI for initializing and managing repository memory.
- `unforgit-mcp` — MCP stdio server for durable memory tools.
- Agent/IDE setup helpers for Claude Code, Cursor, VS Code/Copilot, Windsurf, Cline, Roo Code, Codex CLI, and OpenCode.

## Requirements

- Node.js 20+
- npm or another Node package manager
- A Git repository or project directory where memory should live

No API key is required for local SQLite-backed memory. Remote sync and hosted embeddings are optional and can be configured later.

## Install

```bash
npm install -g unforgit
```

Verify the binaries are available:

```bash
unforgit --version
unforgit-mcp --help
```

## Initialize a repository

From the repository or project directory where the agent will work:

```bash
unforgit init
```

To create config/rules for a specific agent or IDE:

```bash
unforgit init --ide cline       # Cline workspace rules + MCP config
unforgit init --ide roo-code    # Roo Code rules + MCP config
unforgit init --ide cursor      # Cursor rules + MCP config
unforgit init --ide vscode      # VS Code / Copilot instructions + MCP config
unforgit init --ide windsurf    # Windsurf rules + MCP config
unforgit init --ide claude-code # Claude Code project files
unforgit init --ide codex       # Codex AGENTS.md + MCP config
unforgit init --ide opencode    # OpenCode AGENTS.md + MCP config
unforgit init --ide all         # all supported project integrations
```

## MCP server configuration

Use this stdio server definition when an MCP client asks for manual configuration:

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

For clients that use the newer `servers` shape:

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

## Verify with MCP tools

After the client starts the MCP server, verify these tools are visible:

- `unforgit_add` / `unforgit_remember`
- `unforgit_recall` / `unforgit_search`
- `unforgit_status`
- `unforgit_health`
- `unforgit_sync_status`

A basic smoke test is:

1. Ask the agent to call Unforgit status/health.
2. Store a non-secret test memory such as `Unforgit MCP installation smoke test`.
3. Search for that same phrase and confirm it is returned.

## Safety notes

- Do not store secrets, tokens, private keys, or temporary task progress as memory.
- Repository facts, decisions, conventions, gotchas, and reusable playbooks are good memories.
- Generated MCP config files do not include secrets.
- Local-first memory works without network access after the npm package is installed.

## Troubleshooting

If the MCP client cannot start the server:

1. Run `which unforgit-mcp` to confirm it is on `PATH`.
2. Run `unforgit-mcp --help` outside the client.
3. Run `unforgit init` in the project directory if `.unforgit/` does not exist.
4. Restart the MCP client after changing config files.
5. See the docs: https://unforgit.com/docs/mcp

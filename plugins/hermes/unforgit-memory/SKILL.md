---
name: unforgit-memory
description: Configure and use Unforgit as repository-scoped memory from Hermes Agent.
version: 0.1.0
platforms: [linux, macos, windows]
---

# Unforgit Memory for Hermes

Use this skill when configuring Hermes Agent to use Unforgit MCP tools, or when a Hermes conversation is working inside a repository that should keep durable project memory.

## Configuration

Add an MCP server to the active Hermes profile config:

```yaml
mcp_servers:
  unforgit:
    command: "unforgit-mcp"
    args: []
    timeout: 120
    connect_timeout: 60
```

For repository-scoped memory, prefer launching Hermes with the project as the working directory or use a small wrapper script that `cd`s to the project root before execing `unforgit-mcp`. The MCP server discovers `.unforgit/unforgit.yaml` by walking up from its current working directory and loads the repository `.env` file automatically.

## Usage policy

- Search Unforgit before substantive repository work using `unforgit_search` or the MCP recall tool.
- Save stable decisions, conventions, gotchas, and playbooks with `unforgit_remember` or the MCP add tool.
- Treat Unforgit as repository-scoped memory. Keep Hermes built-in memory for global user/profile facts and personal preferences.
- Do not save temporary task progress, command output dumps, secrets, tokens, or data likely to be stale soon.
- Prefer English memory text unless the repository has a different documented convention.

## Verification

After configuring Hermes, restart the gateway/session and verify:

```bash
hermes mcp test unforgit
```

Then ask Hermes to recall a known repository memory. If the tools do not appear, check Hermes startup logs, the `mcp_servers` key, PATH visibility for `unforgit-mcp`, and whether the process starts in a directory that can discover `.unforgit/`.

## Troubleshooting

- `unforgit-mcp: command not found`: use an absolute command path or ensure Hermes inherits the PATH where npm global binaries are installed.
- `Repository is not initialized`: run `unforgit init` in the repo or configure a wrapper that starts the MCP server from the initialized repo.
- Remote sync errors do not necessarily break local MCP recall/add; local SQLite memory is independent from remote push/pull.

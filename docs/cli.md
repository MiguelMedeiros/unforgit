# CLI Reference

## Initialize

```bash
unforgit init
```

Creates `.unforgit/` with `local.db` and `unforgit.yaml`, plus IDE-specific integration files. The org and repo are auto-detected from the git remote (`origin`). You can override with `--org-id` and `--repo-id` if needed.

By default, `unforgit init` auto-detects which IDEs are present in the project (Cursor, Claude Code, VS Code, Windsurf) and creates the appropriate rules and MCP config files for each. You can control this with `--ide`:

```bash
unforgit init --ide cursor           # Cursor only
unforgit init --ide claude           # Claude Code only
unforgit init --ide cursor,claude    # multiple IDEs
unforgit init --ide all              # all supported IDEs
unforgit init --no-ide               # skip all IDE integration
```

| IDE | Rules | MCP Config |
|-----|-------|------------|
| Cursor | `.cursor/rules/unforgit-memory.mdc` | `.cursor/mcp.json` |
| Claude Code | `CLAUDE.md` | `.mcp.json` |
| VS Code (Copilot) | `.github/copilot-instructions.md` | `.vscode/mcp.json` |
| Windsurf | `.windsurfrules` | `.windsurf/mcp.json` |

## Add Memories

```bash
# Episodic (local by default)
unforgit add "Found a race condition in the queue worker" --type episodic --tags "bug,queue"

# Semantic with source reference
unforgit add "We use UTC timestamps everywhere" --type semantic --tags "convention" --source-pr "https://github.com/org/repo/pull/42"

# Procedural
unforgit add "To deploy: run make release, then kubectl apply" --type procedural --tags "deploy,playbook"
```

## Recall

```bash
unforgit recall "how to deploy" --types procedural,semantic --k 5

# Local only
unforgit recall "race condition" --local-only

# Remote only
unforgit recall "auth decisions" --remote-only
```

## Templates

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

## Doctor (Diagnostics)

Use `doctor` before troubleshooting sync, embeddings, local database, or remote API issues. It validates initialization, config shape and permissions, deprecated secret-bearing config keys, SQLite access, memory counts, embedding coverage, tombstone/sync state, remote reachability, and required environment variables without printing secret values.

```bash
# Human-readable diagnostics with suggested fixes
unforgit doctor

# Machine-readable diagnostics for agents/CI
unforgit doctor --json
```

`doctor --json` returns a `summary` plus per-check `results`. Checks with known remediations include a `fix` field.

## Curate (Lifecycle)

```bash
# Preview lifecycle maintenance (default)
unforgit curate

# Execute expiry + consolidation locally
unforgit curate --execute

# Execute lifecycle maintenance on the remote server
unforgit curate --remote --execute
```

## Suggestions (Reviewable Curation)

Use `suggestions` as a review inbox for memory curation operations. Generated suggestions are stored as pending items first, so agents can propose cleanup without immediately changing durable memory.

```bash
# Generate pending review items from current local memory quality signals
unforgit suggestions generate

# List pending suggestions
unforgit suggestions list

# Show other review states
unforgit suggestions list --status approved,rejected,applied

# Approve or reject a suggestion after review
unforgit suggestions review <suggestion-id> --approve --reviewer miguel --note "Safe to apply"
unforgit suggestions review <suggestion-id> --reject --reviewer miguel --note "Not actually related"

# Mark a suggestion as applied after executing the underlying operation
unforgit suggestions review <suggestion-id> --applied --reviewer hermes
```

Duplicate pending suggestions for the same type and memory IDs are skipped, keeping the inbox from filling with repeated agent proposals.

## Embeddings

```bash
# Generate embeddings for existing memories
unforgit embeddings backfill

# Check embedding coverage
unforgit embeddings stats

# Clear all embeddings (requires regeneration)
unforgit embeddings clear --yes
```

## Promote

```bash
unforgit promote <memory-id> --source-pr "https://github.com/org/repo/pull/99"
```

## Consolidate

```bash
unforgit consolidate --from-pr "https://github.com/org/repo/pull/100"
```

## Deprecate & Supersede

```bash
unforgit deprecate <id> --reason "outdated after migration"
unforgit supersede <old-id> --with <new-id>
```

## Merge (Consolidate Memories)

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

## Reset

```bash
# Permanently delete ALL memories, links, embeddings, and sync state
unforgit reset                # reset local + remote
unforgit reset --local        # reset local store only
unforgit reset --remote       # reset remote store only
unforgit reset --force        # skip confirmation prompt
unforgit reset --no-backup    # skip automatic local backup before reset
```

Local resets create a timestamped SQLite backup by default under `.unforgit/backups/reset-YYYYMMDD-HHMMSS/`. Keep this backup if you may need to recover memories after a destructive reset.

## Backups

```bash
# List local reset backups
unforgit backups list

# Restore a specific local backup; creates another safety backup first
unforgit backups restore reset-20260610-123456
unforgit backups restore reset-20260610-123456 --force
```

Backup restore accepts only backup directory names, not paths, so accidental path traversal outside `.unforgit/backups/` is rejected. Restoring replaces the active local SQLite database, so use `unforgit backups list` first and keep the safety backup path printed by the restore command.

## Sync (Push & Pull)

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

## Dashboard

```bash
# Start local dashboard for the current workspace on localhost
unforgit dashboard

# Use a custom port
unforgit dashboard --port 4848

# Dogfood a specific memory repo over Tailscale/LAN
unforgit dashboard --workspace ~/.hermes/unforgit-memory --host 100.81.12.32
```

The dashboard binds to `127.0.0.1:3838` by default. Binding to a specific Tailscale/LAN IP is allowed explicitly with `--host`; wildcard binds such as `0.0.0.0` require `--allow-network` so the local memory console is not accidentally exposed.

## API Keys

```bash
# Create a new API key (requires existing admin key)
unforgit keys create --name "My Key" --org "my-org"

# List all API keys
unforgit keys list

# Revoke an API key
unforgit keys revoke <key-id>
```

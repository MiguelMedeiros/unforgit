# Concepts

## Memory Types

| Type | Description | Value |
|------|-------------|-------|
| `episodic` | Events/observations (noisy, short-lived) | Low |
| `semantic` | Facts/decisions (stable) | High |
| `procedural` | Playbooks/checklists/routines | High |

## Scopes

- **local (private)** — per workspace on your machine (`.unforgit/local.db`)
- **remote (shared)** — per org + repo on PostgreSQL

## Statuses

- `active` — current and relevant
- `deprecated` — should not be used
- `superseded` — replaced by a newer memory

## Auto-Visibility Policy

When `visibility` is set to `auto`, the system decides:

- **private** if: contains sensitive content, or episodic without source references
- **repo** if: semantic/procedural AND has source references or tags like `decision`, `adr`, `playbook`, `gotcha`
- **uncertain**: saves locally and suggests promotion

## Brain-Like Lifecycle

Unforgit treats memory more like a brain than a notes app:

- `episodic` memories are captured with low friction and get a default TTL
- Frequently reused memories receive a small ranking boost on recall
- Similar episodic memories can be consolidated into stronger semantic memories
- Stale episodic noise can be previewed and cleaned up with a single lifecycle pass
- Long-lived surfaces can auto-trigger maintenance in the background after save/recall, with debounce

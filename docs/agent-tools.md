# Agent Tools

Import and use the programmatic interface:

```typescript
import { createMemoryTools } from "unforgit/tools";

const memory = createMemoryTools({
  localDbPath: ".unforgit/local.db",
  remoteUrl: "http://localhost:3737",
  orgId: "your-org-id",
  repoId: "your-repo-id",
});

// Always recall before making big changes
const context = await memory.recall({
  query: "authentication flow",
  types: ["semantic", "procedural"],
  k: 5,
});

// Store observations during work
await memory.store({
  text: "The OAuth2 callback URL must use HTTPS in production",
  type: "semantic",
  tags: ["auth", "gotcha"],
  sourceRefs: { pr_url: "https://..." },
});

// Promote local knowledge to shared
await memory.promote({
  localId: "local-memory-uuid",
  sourceRefs: { pr_url: "https://..." },
});

// Consolidate after PR merge
await memory.consolidate({
  fromPr: "https://github.com/org/repo/pull/123",
});
```

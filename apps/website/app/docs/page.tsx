"use client";

import { motion } from "framer-motion";
import { Terminal } from "@/components/terminal";
import { CommandReference } from "@/components/command-reference";
import { ApiEndpoint } from "@/components/api-endpoint";
import { UnforgitBrand } from "@/components/unforgit-brand";
import { Section, Subsection } from "@/components/doc-section";
import {
  Database,
  Terminal as TerminalIcon,
  Server,
  Settings,
} from "lucide-react";
import Link from "next/link";

const templates = [
  "decision",
  "adr",
  "gotcha",
  "bug",
  "playbook",
  "deploy",
  "convention",
  "api",
  "workaround",
  "perf",
  "security",
];

export default function DocsPage() {
  return (
    <div>
      <Section id="overview" title="Overview">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <p className="text-dracula-foreground/80 text-lg leading-relaxed mb-6">
            <UnforgitBrand /> is a local-first repository memory system for agents and
            developers. It stores private workspace memory in SQLite, can sync
            shared memory to a remote API, and now exposes a full lifecycle
            loop: capture broadly, strengthen reused knowledge, consolidate
            overlaps, and expire stale episodic noise safely.
          </p>

          <div className="grid lg:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border border-dracula-comment/20 bg-dracula-background p-5">
              <div className="flex items-center gap-2 text-dracula-foreground mb-3">
                <Database className="w-5 h-5" />
                <h4 className="font-semibold">Local Store</h4>
              </div>
              <p className="text-sm text-dracula-foreground/70">
                SQLite with FTS5, embeddings, usage tracking, link graphs,
                tombstones, and sync state in <code>.unforgit/local.db</code>.
              </p>
            </div>
            <div className="rounded-xl border border-dracula-comment/20 bg-dracula-background p-5">
              <div className="flex items-center gap-2 text-dracula-foreground mb-3">
                <TerminalIcon className="w-5 h-5" />
                <h4 className="font-semibold">Agent Interfaces</h4>
              </div>
              <p className="text-sm text-dracula-foreground/70">
                The CLI, MCP server, and programmatic tools all speak the same
                memory model and can trigger lifecycle maintenance after store
                and recall events.
              </p>
            </div>
            <div className="rounded-xl border border-dracula-comment/20 bg-dracula-background p-5">
              <div className="flex items-center gap-2 text-dracula-foreground mb-3">
                <Server className="w-5 h-5" />
                <h4 className="font-semibold">Remote Team Store</h4>
              </div>
              <p className="text-sm text-dracula-foreground/70">
                Fastify + PostgreSQL for shared memory, link APIs, conflict-aware
                sync, server-side AI recall, auto-consolidation, suggestions,
                and repo health reporting.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
              <h4 className="font-semibold text-dracula-foreground mb-2">
                Memory Types
              </h4>
              <ul className="text-sm text-dracula-foreground/70 space-y-1">
                <li>
                  <code className="text-dracula-foreground/80">episodic</code> for notes,
                  bugs, observations, and short-lived context
                </li>
                <li>
                  <code className="text-dracula-foreground/80">semantic</code> for
                  decisions, facts, conventions, and durable knowledge
                </li>
                <li>
                  <code className="text-dracula-foreground/80">procedural</code> for
                  playbooks, deploy flows, and repeatable workflows
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
              <h4 className="font-semibold text-dracula-foreground mb-2">
                Visibility
              </h4>
              <ul className="text-sm text-dracula-foreground/70 space-y-1">
                <li>
                  <code className="text-dracula-foreground/80">private</code> keeps
                  memory local
                </li>
                <li>
                  <code className="text-dracula-foreground/80">repo</code> shares memory
                  through the remote server
                </li>
                <li>
                  <code className="text-dracula-foreground/80">auto</code> applies the
                  policy engine: sensitive stays private, stable sourced
                  knowledge is promoted toward shared memory
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
              <h4 className="font-semibold text-dracula-foreground mb-2">
                Lifecycle Signals
              </h4>
              <ul className="text-sm text-dracula-foreground/70 space-y-1">
                <li>TTL for episodic memory</li>
                <li>Reuse-based ranking boost</li>
                <li>Consolidation candidates and history</li>
                <li>Soft deletion through tombstones</li>
                <li>Automatic debounced maintenance hooks</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </Section>

      <Section id="getting-started" title="Getting Started">
        <Subsection id="init-flow" title="Install And First Flow">
          <p className="text-dracula-foreground/70 mb-4">
            The default setup is local-first. <code>unforgit init</code> creates
            the local database, config file, and IDE-specific rules and MCP
            config. It auto-detects which IDEs are present (Cursor, Claude Code,
            VS Code, Windsurf) and configures each one. Org and repo are
            auto-detected from your git remote when available.
          </p>
          <div className="space-y-4">
            <Terminal
              title="Install"
              code="$ npm install -g unforgit"
            />
            <Terminal
              title="Initialize in a repository"
              code="$ unforgit init --remote-url http://localhost:3737"
            />
            <Terminal
              title="Capture a memory"
              code={`$ unforgit add "Decision: use UUIDs for external resource IDs" --template decision
$ unforgit add "OAuth callback needs HTTPS in production" --template gotcha --tags auth`}
            />
            <Terminal
              title="Recall it later"
              code={`$ unforgit recall "external IDs"
$ unforgit recall "oauth https" --local-only`}
            />
          </div>
        </Subsection>

        <Subsection id="lifecycle-loop" title="Lifecycle Loop">
          <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4 mb-4">
            <ul className="text-sm text-dracula-foreground/70 space-y-2">
              <li>
                <span className="text-dracula-foreground font-semibold">
                  Capture broadly
                </span>{" "}
                with low-friction episodic notes.
              </li>
              <li>
                <span className="text-dracula-foreground font-semibold">
                  Strengthen reuse
                </span>{" "}
                by recording recall activity and boosting proven memories.
              </li>
              <li>
                <span className="text-dracula-foreground font-semibold">
                  Consolidate
                </span>{" "}
                repeated episodic fragments into denser semantic or procedural
                memory.
              </li>
              <li>
                <span className="text-dracula-foreground font-semibold">
                  Forget safely
                </span>{" "}
                by hiding expired TTL-based memories and deleting through
                tombstones instead of unsafe hard resets.
              </li>
            </ul>
          </div>
          <Terminal
            title="Preview or execute lifecycle maintenance"
            code={`$ unforgit curate
$ unforgit curate --execute
$ unforgit curate --remote --execute --model gpt-5.4`}
          />
        </Subsection>

        <Subsection id="templates" title="Templates">
          <p className="text-dracula-foreground/70 mb-4">
            Templates set the memory type, default tags, and preferred
            visibility for common repository knowledge patterns.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {templates.map((template) => (
              <div
                key={template}
                className="rounded-lg border border-dracula-current/40 bg-dracula-background px-3 py-2 text-sm text-dracula-foreground/80"
              >
                <code className="text-dracula-foreground/80">{template}</code>
              </div>
            ))}
          </div>
          <Terminal
            title="Use templates"
            code={`$ unforgit add --template playbook "To release: run pnpm build && kubectl apply -f k8s/"
$ unforgit add --template security "Never commit OAuth client secrets into repo config"`}
          />
        </Subsection>
      </Section>

      <Section id="recall" title="Recall & Ranking">
        <Subsection id="recall-behavior" title="How Recall Works">
          <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
            <ul className="text-sm text-dracula-foreground/70 space-y-2">
              <li>
                Local recall uses SQLite FTS5 with a fallback string search when
                needed.
              </li>
              <li>
                The CLI merges local recall with remote recall and re-ranks the
                combined result set.
              </li>
              <li>
                Remote <code>/v1/recall</code> becomes hybrid when the server
                has <code>OPENAI_API_KEY</code> configured.
              </li>
              <li>
                Ranking factors include text match, embedding similarity when
                available, recency, confidence, and bounded reuse boost from
                prior recalls.
              </li>
              <li>
                Consolidated memories are intentionally favored, and MCP recall
                can expand the source history behind them.
              </li>
            </ul>
          </div>
        </Subsection>

        <Subsection id="embeddings" title="Embeddings And Hybrid Search">
          <p className="text-dracula-foreground/70 mb-4">
            Embeddings are local-first. <UnforgitBrand /> can generate semantic
            recall vectors without <code>OPENAI_API_KEY</code>; OpenAI remains
            optional for teams that explicitly want cloud-backed embeddings or
            LLM-based consolidation flows.
          </p>
          <div className="space-y-4">
            <Terminal
              title="Recall examples"
              code={`$ unforgit recall "deploy" --types procedural,semantic --page 1 --per-page 5
$ unforgit recall "auth" --remote-only
$ unforgit recall "race condition" --local-only`}
            />
            <Terminal
              title="Embedding maintenance"
              code={`$ unforgit embeddings backfill
$ unforgit embeddings backfill --provider local
$ unforgit embeddings backfill --provider openai --model text-embedding-3-small
$ unforgit embeddings stats
$ unforgit embeddings clear --yes`}
            />
          </div>
        </Subsection>
      </Section>

      <Section id="cli" title="CLI Reference">
        <p className="text-dracula-foreground/70 mb-6">
          The <code className="text-dracula-foreground/80">unforgit</code> CLI is the main
          user interface for repository memory. The commands below reflect the
          current implementation, including lifecycle, links, diagnostics, and
          shell completion.
        </p>

        <Subsection id="cli-core" title="Core Commands">
          <div className="space-y-4">
            <CommandReference
              name="unforgit init"
              description="Initialize unforgit in the current repository with auto-detected IDE integrations"
              usage="unforgit init [options]"
              options={[
                { flag: "--org-id <orgId>", description: "Override detected org ID" },
                { flag: "--repo-id <repoId>", description: "Override detected repo ID" },
                {
                  flag: "--remote-url <url>",
                  description: "Remote API URL",
                  default: "http://localhost:3737",
                },
                {
                  flag: "--ide <ides>",
                  description: "IDE integrations: cursor, claude, vscode, windsurf, all (default: auto-detect)",
                },
                {
                  flag: "--no-ide",
                  description: "Skip all IDE integrations",
                },
              ]}
              example="unforgit init --ide all --remote-url http://localhost:3737"
            />

            <CommandReference
              name="unforgit add"
              description="Create a memory locally using types, tags, and templates"
              usage="unforgit add <text> [options]"
              args={[
                { name: "text", description: "Memory content", required: true },
              ]}
              options={[
                {
                  flag: "-t, --type <type>",
                  description: "episodic | semantic | procedural",
                  default: "episodic",
                },
                { flag: "--tags <tags>", description: "Comma-separated tags" },
                {
                  flag: "--template <name>",
                  description:
                    "decision | adr | gotcha | bug | playbook | deploy | convention | api | workaround | perf | security",
                },
                {
                  flag: "--visibility <visibility>",
                  description: "private | repo | auto",
                  default: "auto",
                },
                { flag: "--source-pr <url>", description: "Source PR URL" },
                { flag: "--source-commit <sha>", description: "Source commit SHA" },
                { flag: "--confidence <n>", description: "Confidence from 0 to 1" },
                { flag: "--ttl <seconds>", description: "Override TTL" },
                { flag: "--list-templates", description: "List template metadata" },
              ]}
              example='unforgit add --template decision "Use opaque IDs in public APIs"'
            />

            <CommandReference
              name="unforgit recall"
              description="Search local and remote memory, then merge and rank results"
              usage="unforgit recall <query> [options]"
              args={[
                { name: "query", description: "Search query", required: true },
              ]}
              options={[
                { flag: "--types <types>", description: "Filter types" },
                { flag: "--tags <tags>", description: "Filter tags" },
                { flag: "-k, --limit <n>", description: "Top-k results", default: "10" },
                { flag: "--remote-only", description: "Skip local recall" },
                { flag: "--local-only", description: "Skip remote recall" },
                { flag: "--page <n>", description: "Page number", default: "1" },
                { flag: "--per-page <n>", description: "Items per page", default: "10" },
              ]}
              example='unforgit recall "release flow" --types procedural,semantic --page 1'
            />

            <CommandReference
              name="unforgit promote"
              description="Promote a local memory to shared repo memory"
              usage="unforgit promote <id> [options]"
              args={[
                { name: "id", description: "Local memory ID", required: true },
              ]}
              options={[
                { flag: "--source-pr <url>", description: "Attach source PR" },
                { flag: "--source-commit <sha>", description: "Attach source commit" },
              ]}
              example='unforgit promote abc123 --source-pr "https://github.com/org/repo/pull/42"'
            />
          </div>
        </Subsection>

        <Subsection id="cli-lifecycle" title="Lifecycle And Consolidation">
          <div className="space-y-4">
            <Terminal
              title="Maintenance and curation"
              code={`$ unforgit curate
$ unforgit curate --execute
$ unforgit curate --remote --execute`}
            />
            <Terminal
              title="Reviewable curation suggestions"
              code={`$ unforgit suggestions generate
$ unforgit suggestions list
$ unforgit suggestions review <suggestion-id> --approve --reviewer miguel
$ unforgit suggestions review <suggestion-id> --reject --note "Not actually related"
$ unforgit suggestions review <suggestion-id> --applied --reviewer hermes`}
            />
            <p className="text-sm text-dracula-foreground/70">
              Suggestions are stored as a review inbox before any durable memory
              operation is applied. Duplicate pending suggestions for the same
              operation are skipped, so agents can propose curation without
              spamming repeated review items.
            </p>
            <Terminal
              title="Server and local consolidation flows"
              code={`$ unforgit consolidate --from-pr "https://github.com/org/repo/pull/100"
$ unforgit auto-consolidate --threshold 0.5 --dry-run
$ unforgit merge id1 id2 -t "Unified deployment checklist"
$ unforgit remerge <consolidation-id> -t "Updated guide" --add "<new-id>"
$ unforgit unconsolidate <consolidation-id> --dry-run`}
            />
            <Terminal
              title="State transitions"
              code={`$ unforgit deprecate <id> --reason "outdated after migration"
$ unforgit supersede <old-id> --with <new-id>
$ unforgit delete <id>
$ unforgit delete <id> --hard --force
$ unforgit delete <id> --hard --force --no-backup
$ unforgit backups list
$ unforgit restore <id>`}
            />
          </div>
        </Subsection>

        <Subsection id="cli-links" title="Links And History">
          <div className="space-y-4">
            <Terminal
              title="Relationship commands"
              code={`$ unforgit link <source-id> <target-id> --type related_to
$ unforgit unlink <source-id> <target-id> --type related_to
$ unforgit links <memory-id>
$ unforgit similar <memory-id> --threshold 0.5
$ unforgit history <memory-id>`}
            />
            <p className="text-sm text-dracula-foreground/70">
              Supported link types are{" "}
              <code className="text-dracula-foreground/80">related_to</code>,{" "}
              <code className="text-dracula-foreground/80">derived_from</code>,{" "}
              <code className="text-dracula-foreground/80">contradicts</code>, and{" "}
              <code className="text-dracula-foreground/80">depends_on</code>.
            </p>
          </div>
        </Subsection>

        <Subsection id="cli-sync" title="Sync, Remotes, And Inspection">
          <div className="space-y-4">
            <Terminal
              title="Sync and remotes"
              code={`$ unforgit status -s
$ unforgit status --json
$ unforgit push origin --dry-run
$ unforgit pull origin
$ unforgit diff --stat
$ unforgit remote
$ unforgit remote add staging https://unforgit.example.com --org my-org --repo my-repo`}
            />
            <Terminal
              title="Inspection and diagnostics"
              code={`$ unforgit log --all --page 2
$ unforgit doctor
$ unforgit doctor --json
$ unforgit completion zsh >> ~/.zshrc
$ unforgit auth status`}
            />
            <p className="text-sm text-dracula-foreground/70">
              <code className="text-dracula-foreground/80">status --json</code> exposes
              stable automation fields for remote configuration, pending push/pull,
              conflicts, clean state, recommendations, and per-memory previews.
              <code className="text-dracula-foreground/80"> doctor</code> checks initialization,
              config shape and permissions, deprecated secret-bearing config keys,
              SQLite access, memory counts, embedding coverage, tombstones, sync state,
              remote health, and required environment variables. JSON output includes a
              summary plus per-check suggested fixes and never prints raw secret values.
            </p>
          </div>
        </Subsection>
      </Section>

      <Section id="mcp" title="MCP Server">
        <p className="text-dracula-foreground/70 mb-6">
          The MCP server gives the AI agent in your IDE direct access to local
          repository memory without shelling out. We have a dedicated setup
          guide covering Cursor, Claude Desktop, Windsurf, VS Code, API keys,
          and remote server configuration.
        </p>
        <Link href="/docs/mcp">
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="p-6 rounded-xl bg-dracula-foreground/5 border border-dracula-comment/30 flex items-center justify-between gap-4 cursor-pointer group transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-dracula-foreground/10 group-hover:bg-dracula-foreground/15 transition-colors">
                <Server className="w-6 h-6 text-dracula-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dracula-foreground">
                  MCP Server Setup Guide
                </h3>
                <p className="text-sm text-muted-foreground">
                  IDE integrations, API keys, remote setup, tools reference, and
                  troubleshooting
                </p>
              </div>
            </div>
            <span className="text-dracula-foreground group-hover:translate-x-1 transition-transform">
              &rarr;
            </span>
          </motion.div>
        </Link>
      </Section>

      <Section id="api" title="API Reference">
        <p className="text-dracula-foreground/70 mb-6">
          The remote API defaults to port <code>3737</code>. Everything except{" "}
          <code>/health</code> requires Bearer authentication.
        </p>

        <Subsection id="api-auth" title="Authentication">
          <Terminal
            title="Authenticated recall request"
            code={`curl -X POST http://localhost:3737/v1/recall \\
  -H "Authorization: Bearer hk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"orgId":"org","repoId":"repo","query":"release flow"}'`}
          />
        </Subsection>

        <Subsection id="api-memory" title="Memory Endpoints">
          <div className="space-y-3">
            <ApiEndpoint
              method="GET"
              path="/health"
              description="Server health check."
              auth={false}
              responseExample={`{
  "status": "ok",
  "capabilities": {
    "semanticSearch": true,
    "autoConsolidation": true,
    "autoEmbedding": true
  }
}`}
            />
            <ApiEndpoint
              method="GET"
              path="/v1/memories"
              description="List memories with filters, paging, and sorting."
              requestBody={`Query params:
  orgId, repoId (required)
  types?, status?, visibility?, tags?
  search?, limit?, offset?
  sortBy? = createdAt | updatedAt | confidence
  sortOrder? = asc | desc`}
            />
            <ApiEndpoint
              method="GET"
              path="/v1/memory/:id"
              description="Get one memory by ID."
            />
            <ApiEndpoint
              method="POST"
              path="/v1/memory"
              description="Create a memory."
              requestBody={`{
  "orgId": "org",
  "repoId": "repo",
  "memoryType": "semantic",
  "text": "Use UTC timestamps for persisted audit fields",
  "tags": ["convention"],
  "sourceRefs": { "pr_url": "https://github.com/org/repo/pull/42" },
  "visibility": "repo",
  "confidence": 0.9
}`}
              responseExample={`{ "id": "new-memory-uuid" }`}
            />
            <ApiEndpoint
              method="POST"
              path="/v1/recall"
              description="Recall memory. Returns searchType as fts or hybrid."
              requestBody={`{
  "orgId": "org",
  "repoId": "repo",
  "query": "how do we deploy",
  "types": ["procedural", "semantic"],
  "tags": ["deploy"],
  "k": 10
}`}
              responseExample={`{
  "results": [
    {
      "id": "uuid",
      "memoryType": "procedural",
      "text": "Deploy: run pnpm build, then kubectl apply",
      "score": 0.94,
      "source": "remote"
    }
  ],
  "searchType": "hybrid"
}`}
            />
          </div>
        </Subsection>

        <Subsection id="api-lifecycle" title="Lifecycle And Curation Endpoints">
          <div className="space-y-3">
            <ApiEndpoint
              method="POST"
              path="/v1/memory/:id/deprecate"
              description="Mark a memory as deprecated."
              requestBody={`{ "reason": "outdated after migration" }`}
            />
            <ApiEndpoint
              method="POST"
              path="/v1/memory/:id/supersede"
              description="Point one memory at its replacement."
              requestBody={`{ "newId": "replacement-memory-id" }`}
            />
            <ApiEndpoint
              method="POST"
              path="/v1/memory/:id/pin"
              description="Pin a memory by adding the persistent signal used in lifecycle flows."
            />
            <ApiEndpoint
              method="POST"
              path="/v1/consolidate"
              description="Create a semantic consolidation from recent episodic memory selected by source filters or window."
              requestBody={`{
  "orgId": "org",
  "repoId": "repo",
  "lastN": 50,
  "source": { "prUrl": "https://github.com/org/repo/pull/100" }
}`}
            />
            <ApiEndpoint
              method="POST"
              path="/v1/lifecycle/run"
              description="Preview or execute the remote lifecycle loop."
              requestBody={`{
  "orgId": "org",
  "repoId": "repo",
  "dryRun": true,
  "preserveOriginals": true,
  "model": "gpt-5.4"
}`}
            />
            <ApiEndpoint
              method="POST"
              path="/v1/memories/reset"
              description="Delete all memory, links, embeddings, and sync data for one org/repo."
              requestBody={`{ "orgId": "org", "repoId": "repo" }`}
            />
          </div>
        </Subsection>

        <Subsection id="api-links" title="Links Endpoints">
          <div className="space-y-3">
            <ApiEndpoint
              method="GET"
              path="/v1/links"
              description="List all links for an org/repo."
              requestBody={`Query params: orgId, repoId`}
            />
            <ApiEndpoint
              method="POST"
              path="/v1/memory/:id/link"
              description="Create a relationship from one memory to another."
              requestBody={`{
  "targetId": "other-memory-id",
  "linkType": "derived_from",
  "metadata": { "reason": "consolidation" }
}`}
            />
            <ApiEndpoint
              method="DELETE"
              path="/v1/memory/:id/link"
              description="Remove a relationship."
              requestBody={`{
  "targetId": "other-memory-id",
  "linkType": "derived_from"
}`}
            />
            <ApiEndpoint
              method="GET"
              path="/v1/memory/:id/links"
              description="List links for one memory, optionally filtered by type."
            />
          </div>
        </Subsection>

        <Subsection id="api-ai" title="Embeddings, Auto-Consolidation, Suggestions, And Health">
          <div className="space-y-3">
            <ApiEndpoint
              method="POST"
              path="/v1/embeddings/generate/:memoryId"
              description="Generate one missing embedding."
            />
            <ApiEndpoint
              method="POST"
              path="/v1/embeddings/backfill"
              description="Backfill embeddings in batches."
              requestBody={`{
  "orgId": "org",
  "repoId": "repo",
  "batchSize": 10,
  "limit": 200
}`}
            />
            <ApiEndpoint
              method="GET"
              path="/v1/embeddings/stats"
              description="Embedding coverage statistics."
            />
            <ApiEndpoint
              method="POST"
              path="/v1/auto-consolidate/preview"
              description="Find consolidation groups without executing."
            />
            <ApiEndpoint
              method="POST"
              path="/v1/auto-consolidate"
              description="Run LLM-based consolidation across candidate groups."
            />
            <ApiEndpoint
              method="POST"
              path="/v1/auto-consolidate/execute"
              description="Execute consolidation for a specific set of source IDs."
            />
            <ApiEndpoint
              method="GET"
              path="/v1/suggestions"
              description="Return curation suggestions such as add_tags, generate_embedding, consolidate, deprecate, and promote."
            />
            <ApiEndpoint
              method="GET"
              path="/v1/health/repo"
              description="Return repo-level memory health, metrics, and recommendations."
            />
          </div>
        </Subsection>

        <Subsection id="api-sync" title="Sync Endpoints">
          <div className="space-y-3">
            <ApiEndpoint
              method="GET"
              path="/v1/sync/pull"
              description="Pull memories modified since an optional timestamp."
              requestBody={`Query params: orgId, repoId, since?`}
            />
            <ApiEndpoint
              method="POST"
              path="/v1/sync/push"
              description="Push one local memory payload to the remote store."
            />
            <ApiEndpoint
              method="GET"
              path="/v1/sync/tombstones"
              description="Pull tombstones for deletions."
            />
            <ApiEndpoint
              method="POST"
              path="/v1/sync/tombstones"
              description="Push one tombstone."
            />
            <ApiEndpoint
              method="GET"
              path="/v1/sync/links"
              description="Pull all remote links for sync."
            />
            <ApiEndpoint
              method="DELETE"
              path="/v1/memory/:id"
              description="Soft delete by default, or hard delete with hardDelete=true."
              requestBody={`{ "deletedBy": "cli:user", "hardDelete": false }`}
            />
            <ApiEndpoint
              method="POST"
              path="/v1/memory/:id/restore"
              description="Restore a soft-deleted memory."
            />
          </div>
        </Subsection>
      </Section>

      <Section id="config" title="Configuration">
        <Subsection id="config-yaml" title="unforgit.yaml">
          <p className="text-sm text-dracula-foreground/70 mb-4">
            The repository config lives at{" "}
            <code className="text-dracula-foreground/80">.unforgit/unforgit.yaml</code>.
            It controls the default remote, lifecycle tuning, and sync
            settings. Secrets are configured via environment variables.
          </p>
          <Terminal
            title=".unforgit/unforgit.yaml"
            language="yaml"
            code={`configVersion: 1

remote:
  url: http://localhost:3737
  orgId: your-org
  repoId: your-repo

remotes:
  origin:
    url: http://localhost:3737
    orgId: your-org
    repoId: your-repo

defaults:
  visibility: auto
  memoryType: episodic

lifecycle:
  ttlSecondsByType:
    episodic: 2592000
  usageBoost:
    enabled: true
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

sync:
  enabled: true
  intervalMs: 60000
  debounceMs: 5000
  autoResolveConflicts: last_write_wins

embeddings:
  enabled: true
  model: text-embedding-3-small
  autoGenerate: true`}
          />
          <div className="mt-4 rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
            <ul className="text-sm text-dracula-foreground/70 space-y-2">
              <li>
                <code className="text-dracula-foreground/80">remote.*</code> controls the
                default shared server used by CLI and tools.
              </li>
              <li>
                <code className="text-dracula-foreground/80">remotes</code> stores named
                additional remotes managed by <code>unforgit remote</code>.
              </li>
              <li>
                <code className="text-dracula-foreground/80">lifecycle.*</code> tunes TTL,
                reuse boost, consolidation thresholds, and automatic maintenance
                scheduling.
              </li>
              <li>
                Secrets like API keys are configured via environment variables
                (<code className="text-dracula-foreground/80">UNFORGIT_API_KEY</code>,{" "}
                <code className="text-dracula-foreground/80">OPENAI_API_KEY</code>),
                not stored in the config file.
              </li>
            </ul>
          </div>
        </Subsection>

        <Subsection id="config-env" title="Environment Variables">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
              <div className="flex items-center gap-2 mb-3 text-dracula-foreground">
                <Settings className="w-4 h-4" />
                <h4 className="font-semibold">CLI / MCP</h4>
              </div>
              <ul className="text-sm text-dracula-foreground/70 space-y-2">
                <li>
                  <code className="text-dracula-foreground/80">UNFORGIT_DEBUG</code> enables
                  MCP debug logs to stderr.
                </li>
                <li>
                  <code className="text-dracula-foreground/80">UNFORGIT_API_KEY</code> is the
                  remote auth fallback when no key is stored in config.
                </li>
                <li>
                  <code className="text-dracula-foreground/80">OPENAI_API_KEY</code> enables
                  embeddings and auto-consolidation. The MCP server loads this
                  from the repo&apos;s <code className="text-dracula-foreground/80">.env</code> file
                  automatically.
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
              <div className="flex items-center gap-2 mb-3 text-dracula-foreground">
                <Server className="w-4 h-4" />
                <h4 className="font-semibold">API Server</h4>
              </div>
              <ul className="text-sm text-dracula-foreground/70 space-y-2">
                <li>
                  <code className="text-dracula-foreground/80">DATABASE_URL</code> is
                  required for PostgreSQL.
                </li>
                <li>
                  <code className="text-dracula-foreground/80">PORT</code> and{" "}
                  <code className="text-dracula-foreground/80">HOST</code> control the
                  listener.
                </li>
                <li>
                  <code className="text-dracula-foreground/80">OPENAI_API_KEY</code>{" "}
                  enables hybrid recall and LLM consolidation.
                </li>
                <li>
                  <code className="text-dracula-foreground/80">AUTO_EMBEDDING_ENABLED</code>{" "}
                  auto-generates embeddings on memory creation.
                </li>
                <li>
                  <code className="text-dracula-foreground/80">CONSOLIDATION_MODEL</code>{" "}
                  selects the default model for server-side consolidation.
                </li>
              </ul>
            </div>
          </div>
        </Subsection>
      </Section>

      <Section id="deployment" title="Deployment & AI">
        <Subsection id="deployment-docker" title="Docker Services">
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dracula-current/50">
                  <th className="text-left py-3 px-4 text-dracula-comment font-semibold">
                    Service
                  </th>
                  <th className="text-left py-3 px-4 text-dracula-comment font-semibold">
                    Port
                  </th>
                  <th className="text-left py-3 px-4 text-dracula-comment font-semibold">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dracula-current/30">
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-foreground">postgres</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">5432</td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Shared memory, links, sync state, and embeddings
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-foreground/80">api</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">3737</td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Fastify API for memory, lifecycle, sync, health, and AI
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-foreground">website</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">3000</td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Public docs and product site
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Terminal
            title="Common commands"
            code={`$ docker-compose up -d
$ pnpm run db:migrate
$ docker-compose logs -f api
$ docker-compose down`}
          />
        </Subsection>

        <Subsection id="deployment-ai" title="Server-Side AI">
          <p className="text-dracula-foreground/70 mb-4">
            Configure AI once on the server to give every developer hybrid
            recall, embedding backfill, auto-consolidation, suggestions, and
            health reporting.
          </p>
          <Terminal
            title="Server .env"
            code={`OPENAI_API_KEY=sk-your-team-api-key
AUTO_EMBEDDING_ENABLED=true
CONSOLIDATION_MODEL=gpt-5.4`}
          />
          <div className="mt-4 rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
            <ul className="text-sm text-dracula-foreground/70 space-y-2">
              <li>
                <code className="text-dracula-foreground/80">POST /v1/recall</code>{" "}
                returns <code>searchType: "hybrid"</code> when embeddings are
                active.
              </li>
              <li>
                <code className="text-dracula-foreground/80">POST /v1/embeddings/backfill</code>{" "}
                and <code>GET /v1/embeddings/stats</code> keep coverage visible.
              </li>
              <li>
                <code className="text-dracula-foreground/80">GET /v1/health/repo</code>{" "}
                reports score, stale memory, consolidation ratio, and server
                capabilities.
              </li>
            </ul>
          </div>
        </Subsection>
      </Section>
    </div>
  );
}

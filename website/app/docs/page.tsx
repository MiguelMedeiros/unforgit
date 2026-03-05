"use client";

import { motion } from "framer-motion";
import { Terminal, TerminalInline } from "@/components/terminal";
import { CommandReference } from "@/components/command-reference";
import { ApiEndpoint } from "@/components/api-endpoint";
import {
  Brain,
  Database,
  Server,
  Terminal as TerminalIcon,
  ArrowRight,
  Cpu,
} from "lucide-react";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="text-2xl font-bold text-dracula-foreground mb-6 flex items-center gap-3"
      >
        <span className="w-1 h-6 bg-dracula-purple rounded-full" />
        {title}
      </motion.h2>
      {children}
    </section>
  );
}

function Subsection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24 mb-8">
      <h3 className="text-lg font-semibold text-dracula-foreground mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div>
      {/* Overview Section */}
      <Section id="overview" title="Overview">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <p className="text-dracula-foreground/80 text-lg leading-relaxed mb-6">
            Hippocampus is a repository memory system for AI agents and
            developers. It provides persistent knowledge across sessions with
            local private memory and shared team knowledge.
          </p>

          {/* Architecture Diagram */}
          <div className="rounded-xl border border-dracula-current/50 bg-dracula-current/10 p-6 mb-8">
            <h4 className="text-sm font-semibold text-dracula-comment uppercase tracking-wider mb-4">
              Architecture
            </h4>
            <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
              {/* Local */}
              <div className="flex-1 rounded-lg border border-dracula-cyan/30 bg-dracula-background p-4">
                <div className="text-xs text-dracula-cyan font-semibold mb-3 uppercase tracking-wider">
                  Local Machine
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Cpu className="w-4 h-4 text-dracula-purple" />
                    <span>Cursor IDE</span>
                    <ArrowRight className="w-3 h-3 text-dracula-comment" />
                    <span className="text-dracula-green">hippo-mcp</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TerminalIcon className="w-4 h-4 text-dracula-orange" />
                    <span>hippo CLI</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Database className="w-4 h-4 text-dracula-pink" />
                    <span>local.db (SQLite)</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden lg:flex flex-col items-center gap-1">
                <ArrowRight className="w-6 h-6 text-dracula-purple" />
                <span className="text-xs text-dracula-comment">HTTP</span>
              </div>

              {/* Remote */}
              <div className="flex-1 rounded-lg border border-dracula-orange/30 bg-dracula-background p-4">
                <div className="text-xs text-dracula-orange font-semibold mb-3 uppercase tracking-wider">
                  Remote Server (Docker)
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Server className="w-4 h-4 text-dracula-cyan" />
                    <span>API Server :3737</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Database className="w-4 h-4 text-dracula-green" />
                    <span>PostgreSQL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
              <h4 className="font-semibold text-dracula-green mb-2">
                Memory Types
              </h4>
              <ul className="text-sm text-dracula-foreground/70 space-y-1">
                <li>
                  <code className="text-dracula-cyan">episodic</code> - Events,
                  observations
                </li>
                <li>
                  <code className="text-dracula-cyan">semantic</code> - Facts,
                  decisions
                </li>
                <li>
                  <code className="text-dracula-cyan">procedural</code> -
                  Playbooks, how-tos
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
              <h4 className="font-semibold text-dracula-orange mb-2">Scopes</h4>
              <ul className="text-sm text-dracula-foreground/70 space-y-1">
                <li>
                  <code className="text-dracula-cyan">private</code> - Local
                  only
                </li>
                <li>
                  <code className="text-dracula-cyan">repo</code> - Shared with
                  team
                </li>
                <li>
                  <code className="text-dracula-cyan">auto</code> - System
                  decides
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
              <h4 className="font-semibold text-dracula-pink mb-2">Statuses</h4>
              <ul className="text-sm text-dracula-foreground/70 space-y-1">
                <li>
                  <code className="text-dracula-cyan">active</code> - Current
                </li>
                <li>
                  <code className="text-dracula-cyan">deprecated</code> -
                  Outdated
                </li>
                <li>
                  <code className="text-dracula-cyan">superseded</code> -
                  Replaced
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* Semantic Search Section */}
      <Section id="semantic-search" title="Semantic Search">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <p className="text-dracula-foreground/80 text-lg leading-relaxed mb-6">
            Hippocampus uses AI embeddings for semantic search, finding memories by meaning rather than just keywords.
            This means searching for "deployment process" will find memories about "release workflow" even without exact word matches.
          </p>

          <Subsection id="embeddings-overview" title="How It Works">
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4 mb-4">
              <ol className="text-sm text-dracula-foreground/70 space-y-2 list-decimal list-inside">
                <li>When you add a memory, Hippocampus generates a vector embedding using OpenAI's <code className="text-dracula-cyan">text-embedding-3-small</code> model</li>
                <li>Embeddings are stored alongside the memory (SQLite locally, pgvector in PostgreSQL for teams)</li>
                <li>On recall, both text search (FTS5) and embedding similarity are combined for best results</li>
              </ol>
            </div>
          </Subsection>

          <Subsection id="embeddings-commands" title="CLI Commands">
            <div className="space-y-4">
              <Terminal
                title="Generate embeddings for existing memories"
                code="$ hippo embeddings backfill"
              />
              <Terminal
                title="Check embedding coverage"
                code="$ hippo embeddings stats"
              />
            </div>
          </Subsection>

          <Subsection id="hybrid-scoring" title="Hybrid Scoring">
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
              <p className="text-sm text-dracula-foreground/70 mb-3">
                Results are ranked using a hybrid scoring algorithm:
              </p>
              <ul className="text-sm text-dracula-foreground/70 space-y-1">
                <li><span className="text-dracula-purple font-bold">50%</span> - Semantic similarity (embeddings)</li>
                <li><span className="text-dracula-cyan font-bold">20%</span> - Text match (FTS5)</li>
                <li><span className="text-dracula-green font-bold">15%</span> - Recency</li>
                <li><span className="text-dracula-orange font-bold">15%</span> - Confidence score</li>
              </ul>
            </div>
          </Subsection>
        </motion.div>
      </Section>

      {/* Curation & Health Section */}
      <Section id="curation" title="Curation & Health">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <p className="text-dracula-foreground/80 text-lg leading-relaxed mb-6">
            Keep your memory base healthy with AI-powered curation suggestions, quality scoring, and memory templates.
          </p>

          <Subsection id="quality-score" title="Quality Score">
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4 mb-4">
              <p className="text-sm text-dracula-foreground/70 mb-3">
                Each memory gets a quality score (0-100%) based on:
              </p>
              <ul className="text-sm text-dracula-foreground/70 space-y-1">
                <li><span className="text-dracula-purple">Text Quality</span> - Length and clarity</li>
                <li><span className="text-dracula-cyan">Usage</span> - How often it's recalled</li>
                <li><span className="text-dracula-green">Links</span> - Connections to other memories</li>
                <li><span className="text-dracula-orange">Tags</span> - Discoverability</li>
                <li><span className="text-dracula-pink">Embeddings</span> - Semantic search ready</li>
                <li><span className="text-dracula-yellow">Age</span> - Recent use vs. stale</li>
              </ul>
            </div>
          </Subsection>

          <Subsection id="suggestions" title="AI Suggestions">
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4 mb-4">
              <p className="text-sm text-dracula-foreground/70 mb-3">
                Hippocampus proactively suggests improvements:
              </p>
              <ul className="text-sm text-dracula-foreground/70 space-y-1">
                <li><span className="text-dracula-purple">Consolidate</span> - Merge similar memories (&gt;70% similarity)</li>
                <li><span className="text-dracula-red">Deprecate</span> - Old memories with no recalls</li>
                <li><span className="text-dracula-cyan">Add Tags</span> - Improve discoverability</li>
                <li><span className="text-dracula-green">Promote</span> - Share popular private memories with team</li>
                <li><span className="text-dracula-orange">Generate Embeddings</span> - Enable semantic search</li>
              </ul>
            </div>
            <Terminal
              title="MCP Tool"
              code="hippo_suggestions  # Get AI-powered curation suggestions"
            />
          </Subsection>

          <Subsection id="templates" title="Memory Templates">
            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4 mb-4">
              <p className="text-sm text-dracula-foreground/70 mb-3">
                Templates auto-configure memory type and tags:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><code className="text-dracula-green">decision</code> - Technical decisions</div>
                <div><code className="text-dracula-orange">gotcha</code> - Non-obvious issues</div>
                <div><code className="text-dracula-cyan">playbook</code> - Step-by-step guides</div>
                <div><code className="text-dracula-red">bug</code> - Bug fixes</div>
                <div><code className="text-dracula-purple">adr</code> - Architecture decisions</div>
                <div><code className="text-dracula-pink">convention</code> - Coding standards</div>
                <div><code className="text-dracula-yellow">workaround</code> - Temporary fixes</div>
                <div><code className="text-dracula-green">perf</code> - Performance notes</div>
              </div>
            </div>
            <Terminal
              title="Using templates"
              code={`$ hippo add --template decision "Using PostgreSQL for JSON support"\n$ hippo add --template gotcha "OAuth needs HTTPS in prod"`}
            />
          </Subsection>
        </motion.div>
      </Section>

      {/* CLI Reference Section */}
      <Section id="cli" title="CLI Reference">
        <p className="text-dracula-foreground/70 mb-6">
          The <code className="text-dracula-cyan">hippo</code> CLI is the
          primary interface for managing memories. Install globally with{" "}
          <code className="text-dracula-cyan">npm i -g hippocampus</code>.
        </p>

        <Subsection id="cli-core" title="Core Commands">
          <div className="space-y-4">
            <CommandReference
              name="hippo init"
              description="Initialize Hippocampus in the current repository"
              usage="hippo init [options]"
              options={[
                { flag: "--org-id <orgId>", description: "Organization ID" },
                { flag: "--repo-id <repoId>", description: "Repository ID" },
                {
                  flag: "--remote-url <url>",
                  description: "Remote server URL",
                  default: "http://localhost:3737",
                },
                {
                  flag: "--no-cursor-rule",
                  description: "Skip Cursor IDE integration",
                },
              ]}
              example="hippo init --org-id my-org --repo-id my-repo"
            />

            <CommandReference
              name="hippo add"
              description="Add a new memory to the local store"
              usage="hippo add <text> [options]"
              args={[
                {
                  name: "text",
                  description: "The memory content",
                  required: true,
                },
              ]}
              options={[
                {
                  flag: "-t, --type <type>",
                  description: "Memory type (episodic|semantic|procedural)",
                  default: "episodic",
                },
                { flag: "--tags <tags>", description: "Comma-separated tags" },
                {
                  flag: "--template <name>",
                  description: "Use template (decision, gotcha, playbook, bug, adr, convention, workaround, perf, security, api)",
                },
                {
                  flag: "--visibility <visibility>",
                  description: "Visibility (private|repo|auto)",
                  default: "auto",
                },
                { flag: "--source-pr <url>", description: "Source PR URL" },
                {
                  flag: "--source-commit <sha>",
                  description: "Source commit SHA",
                },
                {
                  flag: "--confidence <n>",
                  description: "Confidence score (0-1)",
                },
                { flag: "--ttl <seconds>", description: "Time to live" },
                { flag: "--list-templates", description: "List available templates" },
              ]}
              example='hippo add --template decision "Using PostgreSQL for better JSON support"'
            />

            <CommandReference
              name="hippo recall"
              description="Search memories by query"
              usage="hippo recall <query> [options]"
              args={[
                {
                  name: "query",
                  description: "Search query",
                  required: true,
                },
              ]}
              options={[
                {
                  flag: "--types <types>",
                  description: "Filter by memory types",
                },
                { flag: "--tags <tags>", description: "Filter by tags" },
                {
                  flag: "-k, --limit <n>",
                  description: "Number of results",
                  default: "10",
                },
                {
                  flag: "--remote-only",
                  description: "Search remote only",
                },
                { flag: "--local-only", description: "Search local only" },
              ]}
              example="hippo recall 'how to deploy' --types procedural,semantic -k 5"
            />

            <CommandReference
              name="hippo promote"
              description="Promote a local memory to shared (remote)"
              usage="hippo promote <id> [options]"
              args={[
                {
                  name: "id",
                  description: "Memory ID to promote",
                  required: true,
                },
              ]}
              options={[
                {
                  flag: "--to <scope>",
                  description: "Target scope",
                  default: "repo",
                },
                { flag: "--source-pr <url>", description: "Source PR URL" },
                {
                  flag: "--source-commit <sha>",
                  description: "Source commit SHA",
                },
              ]}
              example='hippo promote abc123 --source-pr "https://github.com/org/repo/pull/99"'
            />
          </div>
        </Subsection>

        <Subsection id="cli-lifecycle" title="Memory Lifecycle">
          <div className="space-y-4">
            <CommandReference
              name="hippo consolidate"
              description="Consolidate episodic memories to semantic/procedural (server-side)"
              usage="hippo consolidate [options]"
              options={[
                { flag: "--from-pr <url>", description: "Filter by PR URL" },
                {
                  flag: "--from-commit <sha>",
                  description: "Filter by commit",
                },
                {
                  flag: "--last-n <n>",
                  description: "Last N memories to consider",
                },
              ]}
              example='hippo consolidate --from-pr "https://github.com/org/repo/pull/100"'
            />

            <CommandReference
              name="hippo deprecate"
              description="Mark a memory as deprecated"
              usage="hippo deprecate <id> [options]"
              args={[
                {
                  name: "id",
                  description: "Memory ID",
                  required: true,
                },
              ]}
              options={[
                {
                  flag: "--reason <reason>",
                  description: "Deprecation reason",
                },
                {
                  flag: "--remote",
                  description: "Apply to remote memory",
                },
              ]}
              example='hippo deprecate abc123 --reason "outdated after migration"'
            />

            <CommandReference
              name="hippo supersede"
              description="Mark a memory as superseded by another"
              usage="hippo supersede <old-id> --with <new-id> [options]"
              args={[
                {
                  name: "old-id",
                  description: "Memory to supersede",
                  required: true,
                },
              ]}
              options={[
                {
                  flag: "--with <new-id>",
                  description: "Superseding memory ID (required)",
                },
                {
                  flag: "--remote",
                  description: "Apply to remote",
                },
              ]}
              example="hippo supersede old123 --with new456"
            />

            <CommandReference
              name="hippo delete"
              description="Soft delete a memory (restorable)"
              usage="hippo delete <id> [options]"
              args={[
                {
                  name: "id",
                  description: "Memory ID",
                  required: true,
                },
              ]}
              options={[
                { flag: "--hard", description: "Permanent delete" },
                { flag: "--remote", description: "Delete from remote" },
                { flag: "--by <author>", description: "Author of deletion" },
              ]}
              example="hippo delete abc123 --hard"
            />

            <CommandReference
              name="hippo restore"
              description="Restore a soft-deleted memory"
              usage="hippo restore <id> [options]"
              args={[
                {
                  name: "id",
                  description: "Memory ID",
                  required: true,
                },
              ]}
              options={[
                { flag: "--remote", description: "Restore from remote" },
              ]}
              example="hippo restore abc123"
            />
          </div>
        </Subsection>

        <Subsection id="cli-links" title="Links">
          <div className="space-y-4">
            <CommandReference
              name="hippo link"
              description="Create a link between two memories"
              usage="hippo link <source-id> <target-id> --type <link-type> [options]"
              args={[
                {
                  name: "source-id",
                  description: "Source memory",
                  required: true,
                },
                {
                  name: "target-id",
                  description: "Target memory",
                  required: true,
                },
              ]}
              options={[
                {
                  flag: "--type <link-type>",
                  description:
                    "Link type: related_to|derived_from|contradicts|depends_on (required)",
                },
                { flag: "--remote", description: "Create on remote" },
              ]}
              example="hippo link abc123 def456 --type derived_from"
            />

            <CommandReference
              name="hippo unlink"
              description="Remove a link between memories"
              usage="hippo unlink <source-id> <target-id> --type <link-type> [options]"
              args={[
                {
                  name: "source-id",
                  description: "Source memory",
                  required: true,
                },
                {
                  name: "target-id",
                  description: "Target memory",
                  required: true,
                },
              ]}
              options={[
                {
                  flag: "--type <link-type>",
                  description: "Link type (required)",
                },
                { flag: "--remote", description: "Remove from remote" },
              ]}
              example="hippo unlink abc123 def456 --type related_to"
            />

            <CommandReference
              name="hippo links"
              description="List links for a memory"
              usage="hippo links <memory-id> [options]"
              args={[
                {
                  name: "memory-id",
                  description: "Memory ID",
                  required: true,
                },
              ]}
              options={[
                { flag: "--type <link-type>", description: "Filter by type" },
                { flag: "--remote", description: "List from remote" },
              ]}
              example="hippo links abc123 --type derived_from"
            />
          </div>
        </Subsection>

        <Subsection id="cli-consolidation" title="Consolidation">
          <div className="space-y-4">
            <CommandReference
              name="hippo merge"
              description="Merge multiple memories into one (local)"
              usage="hippo merge <id1> <id2> [id3...] -t <text> [options]"
              args={[
                {
                  name: "ids",
                  description: "Memory IDs to merge (min 2)",
                  required: true,
                },
              ]}
              options={[
                {
                  flag: "-t, --text <text>",
                  description: "Merged text (required)",
                },
                { flag: "--type <type>", description: "Memory type" },
                { flag: "--tags <tags>", description: "Tags" },
                {
                  flag: "--no-supersede",
                  description: "Keep originals active",
                },
              ]}
              example='hippo merge id1 id2 id3 -t "Unified deployment guide"'
            />

            <CommandReference
              name="hippo remerge"
              description="Update an existing merged memory"
              usage="hippo remerge <consolidation-id> -t <text> [options]"
              args={[
                {
                  name: "consolidation-id",
                  description: "Existing consolidation ID",
                  required: true,
                },
              ]}
              options={[
                {
                  flag: "-t, --text <text>",
                  description: "New text (required)",
                },
                {
                  flag: "--add <ids>",
                  description: "Add more source memories",
                },
                { flag: "--tags <tags>", description: "Update tags" },
              ]}
              example='hippo remerge abc123 -t "Updated guide" --add newid'
            />

            <CommandReference
              name="hippo similar"
              description="Find similar memories (merge candidates)"
              usage="hippo similar <memory-id> [options]"
              args={[
                {
                  name: "memory-id",
                  description: "Memory ID",
                  required: true,
                },
              ]}
              options={[
                {
                  flag: "-k, --limit <n>",
                  description: "Number of results",
                  default: "10",
                },
                {
                  flag: "--threshold <score>",
                  description: "Similarity threshold",
                  default: "0.3",
                },
              ]}
              example="hippo similar abc123 --threshold 0.5"
            />

            <CommandReference
              name="hippo history"
              description="Show consolidation history for a memory"
              usage="hippo history <memory-id>"
              args={[
                {
                  name: "memory-id",
                  description: "Memory ID",
                  required: true,
                },
              ]}
              example="hippo history abc123"
            />

            <CommandReference
              name="hippo auto-consolidate"
              description="AI-driven consolidation of similar memories"
              usage="hippo auto-consolidate [options]"
              options={[
                {
                  flag: "--threshold <score>",
                  description: "Similarity threshold",
                  default: "0.4",
                },
                {
                  flag: "--min-group <n>",
                  description: "Min group size",
                  default: "2",
                },
                {
                  flag: "--max-groups <n>",
                  description: "Max groups to process",
                  default: "10",
                },
                { flag: "--type <type>", description: "Filter by type" },
                { flag: "--dry-run", description: "Preview only" },
                { flag: "-y, --yes", description: "Skip confirmation" },
                {
                  flag: "--model <model>",
                  description: "OpenAI model",
                  default: "gpt-4o-mini",
                },
                {
                  flag: "--no-preserve",
                  description: "Don't keep originals",
                },
              ]}
              example="hippo auto-consolidate --threshold 0.5 --dry-run"
            />

            <CommandReference
              name="hippo unconsolidate"
              description="Undo a consolidation (restore original memories)"
              usage="hippo unconsolidate <consolidation-id> [options]"
              args={[
                {
                  name: "consolidation-id",
                  description: "Consolidation ID",
                  required: true,
                },
              ]}
              options={[{ flag: "--dry-run", description: "Preview only" }]}
              example="hippo unconsolidate abc123 --dry-run"
            />
          </div>
        </Subsection>

        <Subsection id="cli-sync" title="Sync">
          <div className="space-y-4">
            <CommandReference
              name="hippo status"
              description="Show working tree status (pending sync)"
              usage="hippo status [options]"
              options={[
                { flag: "-s, --short", description: "Short format" },
              ]}
              example="hippo status -s"
            />

            <CommandReference
              name="hippo push"
              description="Push local memories to remote"
              usage="hippo push [remote] [options]"
              args={[
                {
                  name: "remote",
                  description: "Remote name",
                  required: false,
                },
              ]}
              options={[
                { flag: "-f, --force", description: "Force push" },
                { flag: "--dry-run", description: "Preview only" },
                { flag: "-a, --all", description: "Push all" },
              ]}
              example="hippo push origin --dry-run"
            />

            <CommandReference
              name="hippo pull"
              description="Pull remote memories to local"
              usage="hippo pull [remote] [options]"
              args={[
                {
                  name: "remote",
                  description: "Remote name",
                  required: false,
                },
              ]}
              options={[
                { flag: "-f, --force", description: "Force pull" },
                { flag: "--dry-run", description: "Preview only" },
              ]}
              example="hippo pull origin"
            />

            <CommandReference
              name="hippo diff"
              description="Show differences between local and remote"
              usage="hippo diff [memoryId] [options]"
              args={[
                {
                  name: "memoryId",
                  description: "Specific memory",
                  required: false,
                },
              ]}
              options={[
                { flag: "--stat", description: "Show stats only" },
              ]}
              example="hippo diff --stat"
            />
          </div>
        </Subsection>

        <Subsection id="cli-remote" title="Remote Config">
          <div className="space-y-4">
            <CommandReference
              name="hippo remote"
              description="List configured remotes"
              usage="hippo remote"
              example="hippo remote"
            />

            <CommandReference
              name="hippo remote add"
              description="Add a new remote"
              usage="hippo remote add <name> <url> [options]"
              args={[
                { name: "name", description: "Remote name", required: true },
                { name: "url", description: "Remote URL", required: true },
              ]}
              options={[
                { flag: "--org <orgId>", description: "Organization ID" },
                { flag: "--repo <repoId>", description: "Repository ID" },
              ]}
              example="hippo remote add origin https://hippo.example.com --org my-org"
            />

            <CommandReference
              name="hippo remote remove"
              description="Remove a remote"
              usage="hippo remote remove <name>"
              args={[
                { name: "name", description: "Remote name", required: true },
              ]}
              example="hippo remote remove origin"
            />

            <CommandReference
              name="hippo remote set-url"
              description="Change remote URL"
              usage="hippo remote set-url <name> <newurl>"
              args={[
                { name: "name", description: "Remote name", required: true },
                { name: "newurl", description: "New URL", required: true },
              ]}
              example="hippo remote set-url origin https://new-hippo.example.com"
            />

            <CommandReference
              name="hippo remote show"
              description="Show remote info"
              usage="hippo remote show <name>"
              args={[
                { name: "name", description: "Remote name", required: true },
              ]}
              example="hippo remote show origin"
            />
          </div>
        </Subsection>

        <Subsection id="cli-branches" title="Branches">
          <div className="space-y-4">
            <CommandReference
              name="hippo branch"
              description="List or manage branches"
              usage="hippo branch [branchName] [options]"
              args={[
                {
                  name: "branchName",
                  description: "Branch name",
                  required: false,
                },
              ]}
              options={[
                { flag: "-d, --delete", description: "Delete branch" },
                { flag: "-a, --all", description: "List all branches" },
              ]}
              example="hippo branch -a"
            />

            <CommandReference
              name="hippo checkout"
              description="Switch branches"
              usage="hippo checkout <branchName> [options]"
              args={[
                {
                  name: "branchName",
                  description: "Branch name",
                  required: true,
                },
              ]}
              options={[
                { flag: "-b", description: "Create and checkout" },
              ]}
              example="hippo checkout -b feature/new-memory"
            />
          </div>
        </Subsection>

        <Subsection id="cli-viewing" title="Viewing">
          <div className="space-y-4">
            <CommandReference
              name="hippo log"
              description="Show memory history log"
              usage="hippo log [options]"
              options={[
                {
                  flag: "-n, --max-count <n>",
                  description: "Max entries",
                  default: "10",
                },
                { flag: "--oneline", description: "One line per entry" },
                { flag: "--all", description: "Include deleted" },
                { flag: "--type <type>", description: "Filter by type" },
                { flag: "--tags <tags>", description: "Filter by tags" },
              ]}
              example="hippo log --oneline --type semantic"
            />

            <CommandReference
              name="hippo web"
              description="Start the web dashboard"
              usage="hippo web [options]"
              options={[
                {
                  flag: "-p, --port <port>",
                  description: "Port",
                  default: "3838",
                },
                { flag: "--no-open", description: "Don't open browser" },
              ]}
              example="hippo web -p 4000"
            />
          </div>
        </Subsection>

        <Subsection id="cli-auth" title="Auth & Config">
          <div className="space-y-4">
            <CommandReference
              name="hippo keys create"
              description="Create a new API key"
              usage="hippo keys create [options]"
              options={[
                { flag: "--name <name>", description: "Key name" },
                {
                  flag: "--org <orgId>",
                  description: "Organization ID (required)",
                },
              ]}
              example='hippo keys create --name "CI Key" --org my-org'
            />

            <CommandReference
              name="hippo keys list"
              description="List all API keys"
              usage="hippo keys list [options]"
              options={[
                { flag: "--org <orgId>", description: "Filter by org" },
              ]}
              example="hippo keys list --org my-org"
            />

            <CommandReference
              name="hippo keys revoke"
              description="Revoke an API key"
              usage="hippo keys revoke <id>"
              args={[
                { name: "id", description: "Key ID", required: true },
              ]}
              example="hippo keys revoke key123"
            />

            <CommandReference
              name="hippo auth set"
              description="Set the remote API key for this repository"
              usage="hippo auth set <api-key>"
              args={[
                { name: "api-key", description: "API key", required: true },
              ]}
              example="hippo auth set hk_your_api_key_here"
            />

            <CommandReference
              name="hippo auth status"
              description="Check authentication status"
              usage="hippo auth status"
              example="hippo auth status"
            />

            <CommandReference
              name="hippo auth remove"
              description="Remove the API key"
              usage="hippo auth remove"
              example="hippo auth remove"
            />

            <CommandReference
              name="hippo auth openai"
              description="Set OpenAI API key for auto-consolidation"
              usage="hippo auth openai <api-key>"
              args={[
                {
                  name: "api-key",
                  description: "OpenAI API key",
                  required: true,
                },
              ]}
              example="hippo auth openai sk-your-openai-key"
            />

            <CommandReference
              name="hippo config list"
              description="List all configuration values"
              usage="hippo config list"
              example="hippo config list"
            />

            <CommandReference
              name="hippo config get"
              description="Get a configuration value"
              usage="hippo config get <key>"
              args={[
                { name: "key", description: "Config key", required: true },
              ]}
              example="hippo config get remote.url"
            />

            <CommandReference
              name="hippo config set"
              description="Set a configuration value"
              usage="hippo config set <key> <value>"
              args={[
                { name: "key", description: "Config key", required: true },
                { name: "value", description: "Config value", required: true },
              ]}
              example="hippo config set remote.url https://hippo.example.com"
            />

            <CommandReference
              name="hippo config unset"
              description="Remove a configuration value"
              usage="hippo config unset <key>"
              args={[
                { name: "key", description: "Config key", required: true },
              ]}
              example="hippo config unset remote.url"
            />
          </div>
        </Subsection>
      </Section>

      {/* MCP Server Section */}
      <Section id="mcp" title="MCP Server">
        <p className="text-dracula-foreground/70 mb-6">
          The MCP (Model Context Protocol) server provides native integration
          with Cursor IDE. The AI agent gets direct access to memory tools
          without shell commands.
        </p>

        <Subsection id="mcp-setup" title="Setup in Cursor">
          <div className="space-y-4">
            <div className="rounded-lg border border-dracula-green/30 bg-dracula-green/5 p-4">
              <h4 className="text-dracula-green font-semibold mb-2">
                Automatic Setup (Recommended)
              </h4>
              <p className="text-sm text-dracula-foreground/70 mb-3">
                Running <code className="text-dracula-cyan">hippo init</code>{" "}
                automatically creates the MCP configuration.
              </p>
              <Terminal code="$ hippo init" title="Terminal" />
            </div>

            <div className="space-y-3">
              <h4 className="text-dracula-orange font-semibold">
                Manual Configuration
              </h4>
              <p className="text-sm text-dracula-foreground/70">
                Create{" "}
                <code className="text-dracula-cyan">.cursor/mcp.json</code> in
                your project:
              </p>
              <Terminal
                code={`{
  "mcpServers": {
    "hippocampus": {
      "command": "hippo-mcp",
      "args": [],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}`}
                title=".cursor/mcp.json"
                language="json"
              />
              <p className="text-xs text-dracula-comment">
                After adding the config, restart Cursor.
              </p>
            </div>

            <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
              <h4 className="text-dracula-foreground font-semibold mb-2">
                Prerequisites
              </h4>
              <ol className="text-sm text-dracula-foreground/70 space-y-2 list-decimal list-inside">
                <li>
                  Install Hippocampus:{" "}
                  <code className="text-dracula-cyan">
                    npm i -g hippocampus
                  </code>
                </li>
                <li>
                  Initialize in project:{" "}
                  <code className="text-dracula-cyan">hippo init</code>
                </li>
                <li>
                  Ensure <code className="text-dracula-cyan">hippo-mcp</code> is
                  on PATH
                </li>
                <li>Restart Cursor IDE</li>
              </ol>
            </div>
          </div>
        </Subsection>

        <Subsection id="mcp-tools" title="Available Tools">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dracula-current/50">
                  <th className="text-left py-3 px-4 text-dracula-comment font-semibold">
                    Tool
                  </th>
                  <th className="text-left py-3 px-4 text-dracula-comment font-semibold">
                    Description
                  </th>
                  <th className="text-left py-3 px-4 text-dracula-comment font-semibold">
                    Parameters
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dracula-current/30">
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">hippo_recall</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Search local memories
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    query, types?, tags?, k?, expandHistory?
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">hippo_add</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Store a new memory
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    text, type?, tags?, template?, autoLink?
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">hippo_link</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Link two memories
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    sourceId, targetId, linkType, metadata?
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">hippo_unlink</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Remove a link
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    sourceId, targetId, linkType
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">hippo_links</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    List links for a memory
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    memoryId, linkType?
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">hippo_consolidate</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Merge memories into one
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    sourceIds, consolidatedText, memoryType?, tags?,
                    preserveOriginals?
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">
                      hippo_reconsolidate
                    </code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Update existing consolidation
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    existingConsolidationId, newText, additionalSourceIds?,
                    tags?
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">hippo_find_similar</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Find similar memories
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    memoryId, threshold?, k?
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">hippo_history</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Consolidation history
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    memoryId
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">hippo_delete</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Soft or hard delete
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    memoryId, reason?, hardDelete?
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">hippo_restore</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Restore deleted memory
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    memoryId
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">hippo_list_deleted</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    List soft-deleted memories
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    -
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">
                      hippo_unconsolidate
                    </code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Revert a consolidation
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    consolidationId, dryRun?
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-green">
                      hippo_auto_consolidate
                    </code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    AI consolidation
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    threshold?, minGroupSize?, maxGroups?, types?, dryRun?,
                    execute?, model?
                  </td>
                </tr>
                <tr className="bg-dracula-purple/10">
                  <td className="py-3 px-4">
                    <code className="text-dracula-purple">hippo_embedding_recall</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Semantic search with embeddings
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    query, types?, tags?, k?
                  </td>
                </tr>
                <tr className="bg-dracula-purple/10">
                  <td className="py-3 px-4">
                    <code className="text-dracula-purple">hippo_sync_status</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Sync status & embedding coverage
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    -
                  </td>
                </tr>
                <tr className="bg-dracula-purple/10">
                  <td className="py-3 px-4">
                    <code className="text-dracula-purple">hippo_suggestions</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    AI curation suggestions
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    maxSuggestions?
                  </td>
                </tr>
                <tr className="bg-dracula-purple/10">
                  <td className="py-3 px-4">
                    <code className="text-dracula-purple">hippo_health</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Repository health report
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    -
                  </td>
                </tr>
                <tr className="bg-dracula-purple/10">
                  <td className="py-3 px-4">
                    <code className="text-dracula-purple">hippo_notifications</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Pending notifications
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    -
                  </td>
                </tr>
                <tr className="bg-dracula-purple/10">
                  <td className="py-3 px-4">
                    <code className="text-dracula-purple">hippo_templates</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    List memory templates
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Subsection>

        <Subsection id="mcp-cursor-rule" title="Cursor Rule">
          <p className="text-sm text-dracula-foreground/70 mb-4">
            <code className="text-dracula-cyan">hippo init</code> creates{" "}
            <code className="text-dracula-cyan">
              .cursor/rules/hippocampus-memory.mdc
            </code>{" "}
            which instructs the AI agent to:
          </p>
          <ul className="text-sm text-dracula-foreground/70 space-y-2 list-disc list-inside mb-4">
            <li>Recall relevant memories at the start of every conversation</li>
            <li>
              Save noteworthy decisions, bugs, and procedures during the
              conversation
            </li>
            <li>Use meaningful tags for discoverability</li>
            <li>Prefer semantic for stable facts, procedural for how-tos</li>
          </ul>
          <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
            <p className="text-xs text-dracula-comment">
              The MCP server works with the local SQLite store only (no remote
              dependency). It reads config from{" "}
              <code className="text-dracula-cyan">.hippocampus/hippo.yaml</code>
              .
            </p>
          </div>
        </Subsection>
      </Section>

      {/* Docker Section */}
      <Section id="docker" title="Docker Deployment">
        <p className="text-dracula-foreground/70 mb-6">
          The API server and PostgreSQL database can be deployed using Docker.
          Note that the MCP server runs locally via stdio and does not run in
          Docker.
        </p>

        <Subsection id="docker-services" title="Services">
          <div className="overflow-x-auto">
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
                    <code className="text-dracula-green">postgres</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">5432</td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    PostgreSQL database for shared memories
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-cyan">api</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">3737</td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    HTTP API server (Fastify)
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <code className="text-dracula-pink">website</code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">3000</td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    Marketing website
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Subsection>

        <Subsection id="docker-env" title="Environment Variables">
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dracula-current/50">
                    <th className="text-left py-3 px-4 text-dracula-comment font-semibold">
                      Variable
                    </th>
                    <th className="text-left py-3 px-4 text-dracula-comment font-semibold">
                      Required
                    </th>
                    <th className="text-left py-3 px-4 text-dracula-comment font-semibold">
                      Default
                    </th>
                    <th className="text-left py-3 px-4 text-dracula-comment font-semibold">
                      Purpose
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dracula-current/30">
                  <tr>
                    <td className="py-3 px-4">
                      <code className="text-dracula-orange">DATABASE_URL</code>
                    </td>
                    <td className="py-3 px-4 text-dracula-foreground/70">Yes</td>
                    <td className="py-3 px-4 text-dracula-foreground/60">-</td>
                    <td className="py-3 px-4 text-dracula-foreground/70">
                      PostgreSQL connection string
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">
                      <code className="text-dracula-cyan">PORT</code>
                    </td>
                    <td className="py-3 px-4 text-dracula-foreground/70">No</td>
                    <td className="py-3 px-4 text-dracula-foreground/60">3737</td>
                    <td className="py-3 px-4 text-dracula-foreground/70">
                      API server port
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">
                      <code className="text-dracula-cyan">HOST</code>
                    </td>
                    <td className="py-3 px-4 text-dracula-foreground/70">No</td>
                    <td className="py-3 px-4 text-dracula-foreground/60">
                      0.0.0.0
                    </td>
                    <td className="py-3 px-4 text-dracula-foreground/70">
                      Listen host
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">
                      <code className="text-dracula-cyan">OPENAI_API_KEY</code>
                    </td>
                    <td className="py-3 px-4 text-dracula-foreground/70">No</td>
                    <td className="py-3 px-4 text-dracula-foreground/60">-</td>
                    <td className="py-3 px-4 text-dracula-foreground/70">
                      For auto-consolidation feature
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-dracula-foreground mb-2">
                Example .env file
              </h4>
              <Terminal
                code={`# Required for server-side AI features
OPENAI_API_KEY=sk-your-openai-key

# Optional: auto-generate embeddings on memory creation
AUTO_EMBEDDING_ENABLED=true

# Note: DATABASE_URL is already set in docker-compose.yml
# Only add if running without Docker:
# DATABASE_URL=postgresql://user:pass@localhost:5432/hippocampus`}
                title=".env"
                language="yaml"
              />
            </div>
          </div>
        </Subsection>

        <Subsection id="docker-commands" title="Commands">
          <div className="space-y-4">
            <Terminal
              code={`# Start all services
$ docker-compose up -d

# Run database migrations
$ pnpm run db:migrate

# View logs
$ docker-compose logs -f api

# Stop services
$ docker-compose down`}
              title="Docker Commands"
            />

            <div className="rounded-lg border border-dracula-orange/30 bg-dracula-orange/5 p-4">
              <p className="text-sm text-dracula-orange">
                <strong>Note:</strong> The MCP server (hippo-mcp) runs locally
                via stdio and does NOT run in Docker. It uses the local SQLite
                database at <code>.hippocampus/local.db</code>.
              </p>
            </div>
          </div>
        </Subsection>
      </Section>

      {/* API Reference Section */}
      <Section id="api" title="API Reference">
        <p className="text-dracula-foreground/70 mb-6">
          The HTTP API runs on port 3737 by default. All endpoints except{" "}
          <code className="text-dracula-cyan">/health</code> require
          authentication.
        </p>

        <Subsection id="api-auth" title="Authentication">
          <div className="space-y-4">
            <p className="text-sm text-dracula-foreground/70">
              All protected endpoints require an{" "}
              <code className="text-dracula-cyan">Authorization</code> header
              with a Bearer token:
            </p>
            <Terminal
              code={`$ curl -H "Authorization: Bearer hk_your_api_key" \\
       -H "Content-Type: application/json" \\
       http://localhost:3737/v1/recall \\
       -d '{"orgId":"org","repoId":"repo","query":"test"}'`}
              title="API Request"
            />
          </div>
        </Subsection>

        <Subsection id="api-memory" title="Memory Endpoints">
          <div className="space-y-3">
            <ApiEndpoint
              method="GET"
              path="/health"
              description="Health check endpoint. Returns server status."
              auth={false}
              responseExample={`{ "status": "ok" }`}
            />

            <ApiEndpoint
              method="GET"
              path="/v1/memories"
              description="List all memories for an organization and repository."
              requestBody={`Query params:
  orgId: string (required)
  repoId: string (required)
  types?: string (comma-separated)
  tags?: string (comma-separated)
  limit?: number`}
              responseExample={`{
  "memories": [
    {
      "id": "uuid",
      "text": "Memory content",
      "memoryType": "semantic",
      "tags": ["tag1"],
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}`}
            />

            <ApiEndpoint
              method="GET"
              path="/v1/memory/:id"
              description="Get a specific memory by ID."
              responseExample={`{
  "id": "uuid",
  "text": "Memory content",
  "memoryType": "semantic",
  "tags": ["tag1"],
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z"
}`}
            />

            <ApiEndpoint
              method="POST"
              path="/v1/memory"
              description="Create a new memory."
              requestBody={`{
  "orgId": "uuid",
  "repoId": "my-repo",
  "memoryType": "semantic",
  "text": "Always use UTC timestamps",
  "tags": ["convention"],
  "sourceRefs": { "pr_url": "https://..." },
  "confidence": 0.9
}`}
              responseExample={`{
  "id": "new-uuid",
  "text": "Always use UTC timestamps",
  "memoryType": "semantic",
  "status": "active"
}`}
            />

            <ApiEndpoint
              method="POST"
              path="/v1/recall"
              description="Search memories by query with semantic matching."
              requestBody={`{
  "orgId": "uuid",
  "repoId": "my-repo",
  "query": "how do timestamps work",
  "types": ["semantic", "procedural"],
  "tags": ["convention"],
  "k": 10
}`}
              responseExample={`{
  "memories": [
    {
      "id": "uuid",
      "text": "Always use UTC timestamps",
      "score": 0.95,
      "memoryType": "semantic"
    }
  ]
}`}
            />

            <ApiEndpoint
              method="POST"
              path="/v1/consolidate"
              description="Consolidate multiple memories into one."
              requestBody={`{
  "orgId": "uuid",
  "repoId": "my-repo",
  "sourceIds": ["id1", "id2"],
  "text": "Consolidated content",
  "memoryType": "semantic"
}`}
            />

            <ApiEndpoint
              method="POST"
              path="/v1/curate/:id/deprecate"
              description="Mark a memory as deprecated."
              requestBody={`{
  "reason": "outdated after migration"
}`}
            />

            <ApiEndpoint
              method="POST"
              path="/v1/curate/:id/supersede"
              description="Mark a memory as superseded by another."
              requestBody={`{
  "supersededById": "new-memory-id"
}`}
            />

            <ApiEndpoint
              method="DELETE"
              path="/v1/memory/:id"
              description="Delete a memory (soft delete by default)."
              requestBody={`{
  "hard": false,
  "reason": "no longer needed"
}`}
            />

            <ApiEndpoint
              method="POST"
              path="/v1/memory/:id/restore"
              description="Restore a soft-deleted memory."
            />
          </div>
        </Subsection>

        <Subsection id="api-sync" title="Sync Endpoints">
          <div className="space-y-3">
            <ApiEndpoint
              method="GET"
              path="/v1/sync/pull"
              description="Pull memories from remote (used by CLI)."
              requestBody={`Query params:
  orgId: string (required)
  repoId: string (required)
  since?: ISO date string`}
            />

            <ApiEndpoint
              method="POST"
              path="/v1/sync/push"
              description="Push local memories to remote."
              requestBody={`{
  "orgId": "uuid",
  "repoId": "my-repo",
  "memories": [...]
}`}
            />

            <ApiEndpoint
              method="POST"
              path="/v1/sync/tombstones"
              description="Push deletion tombstones to remote."
              requestBody={`{
  "orgId": "uuid",
  "repoId": "my-repo",
  "tombstones": [...]
}`}
            />

            <ApiEndpoint
              method="GET"
              path="/v1/sync/diff"
              description="Get diff between local and remote."
              requestBody={`Query params:
  orgId: string (required)
  repoId: string (required)`}
            />
          </div>
        </Subsection>

        <Subsection id="api-keys" title="API Keys">
          <div className="space-y-3">
            <ApiEndpoint
              method="POST"
              path="/v1/api-keys"
              description="Create a new API key."
              requestBody={`{
  "name": "My API Key",
  "orgId": "my-org"
}`}
              responseExample={`{
  "id": "key-uuid",
  "key": "hk_xxxxxxxxxxxxx",
  "name": "My API Key"
}`}
            />

            <ApiEndpoint
              method="GET"
              path="/v1/api-keys"
              description="List all API keys for an organization."
              requestBody={`Query params:
  orgId?: string`}
            />

            <ApiEndpoint
              method="DELETE"
              path="/v1/api-keys/:id"
              description="Revoke an API key."
            />
          </div>
        </Subsection>
      </Section>

      {/* Configuration Section */}
      <Section id="config" title="Configuration">
        <Subsection id="config-yaml" title="hippo.yaml">
          <p className="text-sm text-dracula-foreground/70 mb-4">
            The main configuration file is located at{" "}
            <code className="text-dracula-cyan">.hippocampus/hippo.yaml</code>:
          </p>
          <Terminal
            code={`remote:
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
  debounceMs: 5000            # Wait 5s after changes
  autoResolveConflicts: last_write_wins  # local_wins, remote_wins, manual

embeddings:
  enabled: true
  model: text-embedding-3-small
  autoGenerate: true`}
            title=".hippocampus/hippo.yaml"
            language="yaml"
            showLineNumbers
          />

          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold text-dracula-foreground">
              Configuration Fields
            </h4>
            <ul className="text-sm text-dracula-foreground/70 space-y-1 list-disc list-inside">
              <li>
                <code className="text-dracula-cyan">remote.url</code> - API
                server URL
              </li>
              <li>
                <code className="text-dracula-cyan">remote.orgId</code> -
                Organization identifier
              </li>
              <li>
                <code className="text-dracula-cyan">remote.repoId</code> -
                Repository identifier
              </li>
              <li>
                <code className="text-dracula-cyan">remote.apiKey</code> - API
                key for authentication
              </li>
              <li>
                <code className="text-dracula-cyan">openaiApiKey</code> - For
                auto-consolidation
              </li>
              <li>
                <code className="text-dracula-cyan">defaults.visibility</code> -
                Default visibility for new memories
              </li>
              <li>
                <code className="text-dracula-cyan">defaults.memoryType</code> -
                Default memory type
              </li>
              <li>
                <code className="text-dracula-cyan">sync.enabled</code> -
                Enable/disable automatic sync
              </li>
              <li>
                <code className="text-dracula-cyan">sync.intervalMs</code> -
                Sync interval in milliseconds
              </li>
              <li>
                <code className="text-dracula-cyan">sync.autoResolveConflicts</code> -
                Conflict resolution strategy
              </li>
              <li>
                <code className="text-dracula-cyan">embeddings.enabled</code> -
                Enable semantic search
              </li>
              <li>
                <code className="text-dracula-cyan">embeddings.autoGenerate</code> -
                Auto-generate embeddings on add
              </li>
            </ul>
          </div>
        </Subsection>

        <Subsection id="config-env" title="Environment Variables">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-dracula-foreground">
              MCP Server
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dracula-current/50">
                    <th className="text-left py-2 px-3 text-dracula-comment font-semibold">
                      Variable
                    </th>
                    <th className="text-left py-2 px-3 text-dracula-comment font-semibold">
                      Purpose
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dracula-current/30">
                  <tr>
                    <td className="py-2 px-3">
                      <code className="text-dracula-cyan">HIPPO_DEBUG</code>
                    </td>
                    <td className="py-2 px-3 text-dracula-foreground/70">
                      Set to 1 for debug logs to stderr
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">
                      <code className="text-dracula-cyan">OPENAI_API_KEY</code>
                    </td>
                    <td className="py-2 px-3 text-dracula-foreground/70">
                      For hippo_auto_consolidate with execute=true
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="text-sm font-semibold text-dracula-foreground mt-6">
              API Server
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dracula-current/50">
                    <th className="text-left py-2 px-3 text-dracula-comment font-semibold">
                      Variable
                    </th>
                    <th className="text-left py-2 px-3 text-dracula-comment font-semibold">
                      Purpose
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dracula-current/30">
                  <tr>
                    <td className="py-2 px-3">
                      <code className="text-dracula-orange">DATABASE_URL</code>
                    </td>
                    <td className="py-2 px-3 text-dracula-foreground/70">
                      PostgreSQL connection string (required)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">
                      <code className="text-dracula-cyan">PORT</code>
                    </td>
                    <td className="py-2 px-3 text-dracula-foreground/70">
                      Server port (default: 3737)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">
                      <code className="text-dracula-cyan">HOST</code>
                    </td>
                    <td className="py-2 px-3 text-dracula-foreground/70">
                      Listen host (default: 0.0.0.0)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">
                      <code className="text-dracula-cyan">OPENAI_API_KEY</code>
                    </td>
                    <td className="py-2 px-3 text-dracula-foreground/70">
                      For server-side semantic search & auto-consolidation
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">
                      <code className="text-dracula-cyan">AUTO_EMBEDDING_ENABLED</code>
                    </td>
                    <td className="py-2 px-3 text-dracula-foreground/70">
                      Auto-generate embeddings on memory creation (true/false)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">
                      <code className="text-dracula-cyan">CONSOLIDATION_MODEL</code>
                    </td>
                    <td className="py-2 px-3 text-dracula-foreground/70">
                      LLM model for consolidation (default: gpt-4o-mini)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Subsection>
      </Section>

      <Section id="server-ai" title="Server-Side AI (Teams)">
        <p className="text-dracula-foreground/80 mb-6">
          For team deployments, configure the server with a single OpenAI API key
          to provide semantic search and auto-consolidation for all developers.
        </p>

        <Subsection id="server-ai-config" title="Configuration">
          <Terminal code={`# .env on server
OPENAI_API_KEY=sk-your-team-api-key
AUTO_EMBEDDING_ENABLED=true
CONSOLIDATION_MODEL=gpt-4o-mini`} title="Environment" />
          <p className="text-sm text-dracula-foreground/70 mt-4">
            With these settings, every memory created via the API automatically gets an embedding,
            and all search requests use hybrid semantic + FTS scoring.
          </p>
        </Subsection>

        <Subsection id="server-ai-endpoints" title="AI Endpoints">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dracula-current/50">
                  <th className="text-left py-2 px-3 text-dracula-comment font-semibold">
                    Endpoint
                  </th>
                  <th className="text-left py-2 px-3 text-dracula-comment font-semibold">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dracula-current/30">
                <tr>
                  <td className="py-2 px-3">
                    <code className="text-dracula-cyan">POST /v1/recall</code>
                  </td>
                  <td className="py-2 px-3 text-dracula-foreground/70">
                    Hybrid search (semantic + FTS) when OpenAI key is set
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3">
                    <code className="text-dracula-cyan">POST /v1/embeddings/backfill</code>
                  </td>
                  <td className="py-2 px-3 text-dracula-foreground/70">
                    Generate embeddings for all memories without one
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3">
                    <code className="text-dracula-cyan">GET /v1/embeddings/stats</code>
                  </td>
                  <td className="py-2 px-3 text-dracula-foreground/70">
                    Embedding coverage statistics
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3">
                    <code className="text-dracula-cyan">POST /v1/auto-consolidate/preview</code>
                  </td>
                  <td className="py-2 px-3 text-dracula-foreground/70">
                    Find consolidation candidates without executing
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3">
                    <code className="text-dracula-cyan">POST /v1/auto-consolidate</code>
                  </td>
                  <td className="py-2 px-3 text-dracula-foreground/70">
                    Auto-consolidate with LLM
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3">
                    <code className="text-dracula-cyan">GET /v1/suggestions</code>
                  </td>
                  <td className="py-2 px-3 text-dracula-foreground/70">
                    AI-powered curation suggestions
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3">
                    <code className="text-dracula-cyan">GET /v1/health/repo</code>
                  </td>
                  <td className="py-2 px-3 text-dracula-foreground/70">
                    Repository health report with recommendations
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Subsection>

        <Subsection id="server-ai-example" title="Example: Health Check">
          <Terminal code={`curl "http://localhost:3737/v1/health/repo?orgId=org&repoId=repo" \\
  -H "Authorization: Bearer hk_xxx"`} title="Terminal" />
          <p className="text-sm text-dracula-foreground/70 mt-4">
            Returns overall health score, embedding coverage, consolidation ratio,
            and recommendations for improving memory quality.
          </p>
          <div className="rounded-lg bg-dracula-current/30 p-4 mt-4 overflow-x-auto">
            <pre className="text-sm text-dracula-foreground/90 font-mono">{`{
  "overall": "healthy",
  "score": 85,
  "metrics": {
    "totalMemories": 150,
    "embeddingCoverage": 92,
    "consolidationRatio": 15,
    "staleCount": 5
  },
  "recommendations": [
    "Consider consolidating similar memories"
  ],
  "serverCapabilities": {
    "semanticSearch": true,
    "autoConsolidation": true,
    "autoEmbedding": true
  }
}`}</pre>
          </div>
        </Subsection>
      </Section>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { Terminal } from "@/components/terminal";
import {
  ArrowLeft,
  Monitor,
  AlertTriangle,
  Download,
} from "lucide-react";
import { UnforgitBrand } from "@/components/unforgit-brand";
import Link from "next/link";

const MCP_CONFIG_BASE64 = "eyJjb21tYW5kIjoidW5mb3JnaXQtbWNwIiwiYXJncyI6W119";
const CURSOR_INSTALL_LINK = `cursor://anysphere.cursor-deeplink/mcp/install?name=unforgit&config=${MCP_CONFIG_BASE64}`;
const VSCODE_INSTALL_LINK = `https://vscode.dev/redirect/mcp/install?name=unforgit&config=${MCP_CONFIG_BASE64}`;

function InstallButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-dracula-foreground/10 border border-dracula-comment/30 hover:bg-dracula-foreground/20 hover:border-dracula-comment/50 transition-all"
    >
      <Download className="w-4 h-4" />
      {label}
    </a>
  );
}

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
        <span className="w-1 h-6 bg-dracula-foreground rounded-full" />
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

const mcpTools = [
  {
    name: "unforgit_recall",
    description: "Search local memory with filters and optional history expansion.",
    params: "query, types?, tags?, k?, expandHistory?",
  },
  {
    name: "unforgit_add",
    description: "Store a memory locally with templates and auto-linking.",
    params: "text, type?, tags?, template?, autoLink?",
  },
  {
    name: "unforgit_curate",
    description: "Preview or run lifecycle maintenance.",
    params: "dryRun?, model?, preserveOriginals?",
  },
  {
    name: "unforgit_embedding_recall",
    description: "Semantic local recall using stored embeddings.",
    params: "query, types?, tags?, k?",
  },
  {
    name: "unforgit_link",
    description: "Create a relationship between two memories.",
    params: "sourceId, targetId, linkType, metadata?",
  },
  {
    name: "unforgit_unlink",
    description: "Remove a relationship between memories.",
    params: "sourceId, targetId, linkType",
  },
  {
    name: "unforgit_links",
    description: "List all links for a memory.",
    params: "memoryId, linkType?",
  },
  {
    name: "unforgit_consolidate",
    description: "Merge multiple memories into one.",
    params: "sourceIds, consolidatedText, memoryType?, tags?",
  },
  {
    name: "unforgit_reconsolidate",
    description: "Update an existing consolidation.",
    params: "existingConsolidationId, newText, additionalSourceIds?",
  },
  {
    name: "unforgit_unconsolidate",
    description: "Revert a consolidation and restore originals.",
    params: "consolidationId",
  },
  {
    name: "unforgit_find_similar",
    description: "Find merge candidates for a memory.",
    params: "memoryId, threshold?, k?",
  },
  {
    name: "unforgit_history",
    description: "Inspect consolidation history.",
    params: "memoryId",
  },
  {
    name: "unforgit_sync_status",
    description: "Sync state and embedding coverage.",
    params: "-",
  },
  {
    name: "unforgit_suggestions",
    description: "AI-powered curation suggestions.",
    params: "maxSuggestions?",
  },
  {
    name: "unforgit_health",
    description: "Repository memory health report.",
    params: "-",
  },
  {
    name: "unforgit_notifications",
    description: "Pending notifications.",
    params: "-",
  },
  {
    name: "unforgit_templates",
    description: "List available memory templates.",
    params: "-",
  },
];

export default function McpSetupPage() {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 text-sm text-dracula-comment hover:text-dracula-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Docs
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-dracula-foreground mb-3">
          MCP Server Setup
        </h1>
        <p className="text-lg text-dracula-foreground/70">
          Connect <UnforgitBrand capitalize /> to your IDE so AI agents can recall and store
          memories natively, without shell commands.
        </p>
      </motion.div>

      {/* ── Overview ─────────────────────────────────── */}
      <Section id="mcp-overview" title="How It Works">
        <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-5 mb-6">
          <ul className="text-sm text-dracula-foreground/70 space-y-3">
            <li>
              <UnforgitBrand capitalize /> ships a local{" "}
              <code className="text-dracula-foreground/80">unforgit-mcp</code>{" "}
              binary that speaks the{" "}
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-dracula-foreground transition-colors"
              >
                Model Context Protocol
              </a>{" "}
              over <strong>stdio</strong>.
            </li>
            <li>
              Your IDE starts this process and communicates with it via
              stdin/stdout. No network ports, no HTTP.
            </li>
            <li>
              The MCP server reads{" "}
              <code className="text-dracula-foreground/80">
                .unforgit/unforgit.yaml
              </code>{" "}
              and operates on the local SQLite database in the workspace.
            </li>
            <li>
              If a remote server is configured, the MCP server still works
              locally. Use the CLI for remote operations like{" "}
              <code className="text-dracula-foreground/80">push</code>,{" "}
              <code className="text-dracula-foreground/80">pull</code>, and{" "}
              <code className="text-dracula-foreground/80">promote</code>.
            </li>
          </ul>
        </div>
      </Section>

      {/* ── Prerequisites ────────────────────────────── */}
      <Section id="mcp-prerequisites" title="Prerequisites">
        <p className="text-dracula-foreground/70 mb-4">
          Install <UnforgitBrand capitalize /> globally and initialize it in your project before
          configuring any IDE.
        </p>
        <div className="space-y-4">
          <Terminal
            title="Install and initialize"
            code={`$ npm install -g unforgit
$ cd your-project
$ unforgit init`}
          />
        </div>
        <p className="text-sm text-dracula-foreground/60 mt-4">
          <code className="text-dracula-foreground/70">unforgit init</code>{" "}
          creates the <code>.unforgit/</code> directory with the local database
          and config file. For Cursor, it also auto-generates the MCP config
          and Cursor rules.
        </p>
      </Section>

      {/* ── IDE Integrations ─────────────────────────── */}
      <Section id="mcp-ides" title="IDE Setup">
        <Subsection id="mcp-cursor" title="Cursor">
          <div className="rounded-lg border border-dracula-comment/20 bg-dracula-comment/5 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-dracula-foreground" />
              <span className="text-sm font-semibold text-dracula-foreground">
                Automatic Setup
              </span>
            </div>
            <p className="text-sm text-dracula-foreground/70 mb-3">
              <code className="text-dracula-foreground/80">unforgit init</code>{" "}
              already creates{" "}
              <code className="text-dracula-foreground/80">
                .cursor/mcp.json
              </code>{" "}
              and{" "}
              <code className="text-dracula-foreground/80">
                .cursor/rules/unforgit-memory.mdc
              </code>{" "}
              for you. Just restart Cursor and the tools will appear.
            </p>
            <InstallButton
              href={CURSOR_INSTALL_LINK}
              label="Install in Cursor"
            />
          </div>

          <p className="text-sm text-dracula-foreground/70 mb-3">
            If you need to set it up manually, create or edit{" "}
            <code className="text-dracula-foreground/80">.cursor/mcp.json</code>{" "}
            in your project root:
          </p>
          <Terminal
            title=".cursor/mcp.json"
            language="json"
            code={`{
  "mcpServers": {
    "unforgit": {
      "command": "unforgit-mcp",
      "args": [],
      "env": {
        "UNFORGIT_API_KEY": "hk_your_api_key",
        "OPENAI_API_KEY": "sk-your-openai-key"
      }
    }
  }
}`}
          />
          <p className="text-sm text-dracula-foreground/60 mt-3">
            Restart Cursor after saving. The tools will be available in Agent
            mode.
          </p>
        </Subsection>

        <Subsection id="mcp-claude-desktop" title="Claude Desktop">
          <p className="text-sm text-dracula-foreground/70 mb-3">
            Edit the Claude Desktop config file. The location depends on your
            OS:
          </p>
          <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4 mb-4">
            <ul className="text-sm text-dracula-foreground/70 space-y-1">
              <li>
                <strong>macOS:</strong>{" "}
                <code className="text-dracula-foreground/80">
                  ~/Library/Application Support/Claude/claude_desktop_config.json
                </code>
              </li>
              <li>
                <strong>Windows:</strong>{" "}
                <code className="text-dracula-foreground/80">
                  %APPDATA%\Claude\claude_desktop_config.json
                </code>
              </li>
              <li>
                <strong>Linux:</strong>{" "}
                <code className="text-dracula-foreground/80">
                  ~/.config/Claude/claude_desktop_config.json
                </code>
              </li>
            </ul>
          </div>
          <Terminal
            title="claude_desktop_config.json"
            language="json"
            code={`{
  "mcpServers": {
    "unforgit": {
      "command": "unforgit-mcp",
      "args": [],
      "cwd": "/absolute/path/to/your-project",
      "env": {
        "UNFORGIT_API_KEY": "hk_your_api_key",
        "OPENAI_API_KEY": "sk-your-openai-key"
      }
    }
  }
}`}
          />
          <div className="mt-3 rounded-lg border border-dracula-current/50 bg-dracula-comment/5 p-3">
            <p className="text-sm text-dracula-foreground/70">
              <strong>Important:</strong> Claude Desktop requires an absolute{" "}
              <code className="text-dracula-foreground/80">cwd</code> path
              because it doesn&apos;t open projects like an IDE. Point it to the
              repo where you ran{" "}
              <code className="text-dracula-foreground/80">unforgit init</code>.
            </p>
          </div>
        </Subsection>

        <Subsection id="mcp-windsurf" title="Windsurf">
          <p className="text-sm text-dracula-foreground/70 mb-3">
            Windsurf uses a global MCP config at{" "}
            <code className="text-dracula-foreground/80">
              ~/.codeium/windsurf/mcp_config.json
            </code>
            :
          </p>
          <Terminal
            title="~/.codeium/windsurf/mcp_config.json"
            language="json"
            code={`{
  "mcpServers": {
    "unforgit": {
      "command": "unforgit-mcp",
      "args": [],
      "env": {
        "UNFORGIT_API_KEY": "hk_your_api_key",
        "OPENAI_API_KEY": "sk-your-openai-key"
      }
    }
  }
}`}
          />
          <p className="text-sm text-dracula-foreground/60 mt-3">
            Restart Windsurf after saving. The MCP server will use the
            workspace&apos;s <code>.unforgit/</code> directory automatically.
          </p>
        </Subsection>

        <Subsection id="mcp-vscode-copilot" title="VS Code + GitHub Copilot">
          <div className="mb-4">
            <InstallButton
              href={VSCODE_INSTALL_LINK}
              label="Install in VS Code"
            />
          </div>
          <p className="text-sm text-dracula-foreground/70 mb-3">
            Or configure manually — VS Code supports MCP servers in Copilot Chat
            (agent mode). Add to your project&apos;s{" "}
            <code className="text-dracula-foreground/80">
              .vscode/settings.json
            </code>
            :
          </p>
          <Terminal
            title=".vscode/settings.json"
            language="json"
            code={`{
  "github.copilot.chat.mcpServers": {
    "unforgit": {
      "command": "unforgit-mcp",
      "args": [],
      "env": {
        "UNFORGIT_API_KEY": "hk_your_api_key",
        "OPENAI_API_KEY": "sk-your-openai-key"
      }
    }
  }
}`}
          />
        </Subsection>

        <Subsection id="mcp-continue" title="Continue (VS Code / JetBrains)">
          <p className="text-sm text-dracula-foreground/70 mb-3">
            Continue supports MCP via its config file at{" "}
            <code className="text-dracula-foreground/80">
              ~/.continue/config.yaml
            </code>
            :
          </p>
          <Terminal
            title="~/.continue/config.yaml"
            language="yaml"
            code={`mcpServers:
  - name: unforgit
    command: unforgit-mcp
    args: []
    env:
      UNFORGIT_API_KEY: hk_your_api_key
      OPENAI_API_KEY: sk-your-openai-key`}
          />
        </Subsection>

        <Subsection id="mcp-other" title="Other Clients">
          <p className="text-sm text-dracula-foreground/70 mb-4">
            Any MCP-compatible client can connect to <UnforgitBrand capitalize />. The pattern is
            always the same:
          </p>
          <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
            <ul className="text-sm text-dracula-foreground/70 space-y-2">
              <li>
                <strong>Transport:</strong> stdio (stdin/stdout)
              </li>
              <li>
                <strong>Command:</strong>{" "}
                <code className="text-dracula-foreground/80">unforgit-mcp</code>
              </li>
              <li>
                <strong>Arguments:</strong> none required
              </li>
              <li>
                <strong>Working directory:</strong> the project root where{" "}
                <code className="text-dracula-foreground/80">.unforgit/</code>{" "}
                lives
              </li>
              <li>
                <strong>Environment:</strong>{" "}
                <code className="text-dracula-foreground/80">UNFORGIT_API_KEY</code>{" "}
                and{" "}
                <code className="text-dracula-foreground/80">OPENAI_API_KEY</code>{" "}
                (optional) via the <code className="text-dracula-foreground/80">env</code> block
              </li>
            </ul>
          </div>
          <p className="text-sm text-dracula-foreground/60 mt-3">
            The binary is installed globally via npm, so it should be available
            in your PATH. If your client can&apos;t find it, use the full path:{" "}
            <code className="text-dracula-foreground/80">
              npx unforgit-mcp
            </code>
            .
          </p>
        </Subsection>
      </Section>

      {/* ── API Keys ─────────────────────────────────── */}
      <Section id="mcp-keys" title="API Keys & Authentication">
        <Subsection id="mcp-remote-key" title="Remote API Key">
          <p className="text-sm text-dracula-foreground/70 mb-4">
            To sync memories with a remote server, you need an API key. This
            key authenticates CLI operations like{" "}
            <code className="text-dracula-foreground/80">push</code>,{" "}
            <code className="text-dracula-foreground/80">pull</code>,{" "}
            <code className="text-dracula-foreground/80">promote</code>, and{" "}
            <code className="text-dracula-foreground/80">recall --remote</code>.
          </p>
          <div className="space-y-4">
            <Terminal
              title="Set the remote API key via environment variable"
              code={`$ export UNFORGIT_API_KEY=hk_your_api_key`}
            />
            <Terminal
              title="Check authentication status"
              code={`$ unforgit auth status`}
            />
          </div>
          <div className="mt-4 rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
            <ul className="text-sm text-dracula-foreground/70 space-y-2">
              <li>
                Set the{" "}
                <code className="text-dracula-foreground/80">
                  UNFORGIT_API_KEY
                </code>{" "}
                environment variable in your shell or in the MCP server&apos;s{" "}
                <code className="text-dracula-foreground/80">env</code>{" "}
                configuration block.
              </li>
              <li>
                The MCP server itself does not need this key &mdash; it operates
                locally. The key is only used by CLI remote commands.
              </li>
            </ul>
          </div>
        </Subsection>

        <Subsection id="mcp-openai-key" title="OpenAI API Key (Optional)">
          <p className="text-sm text-dracula-foreground/70 mb-4">
            Adding an OpenAI key unlocks local embedding generation, semantic
            recall via the MCP{" "}
            <code className="text-dracula-foreground/80">
              unforgit_embedding_recall
            </code>{" "}
            tool, and AI-powered consolidation flows.
          </p>
          <div className="space-y-4">
            <Terminal
              title="Set your OpenAI key via environment variable"
              code={`$ export OPENAI_API_KEY=sk-your-openai-key`}
            />
          </div>
          <p className="text-sm text-dracula-foreground/60 mt-3">
            Without this key, <UnforgitBrand capitalize /> is fully functional &mdash; local recall
            uses FTS5 text search. Set the{" "}
            <code className="text-dracula-foreground/70">OPENAI_API_KEY</code>{" "}
            environment variable or configure it in the MCP server&apos;s{" "}
            <code className="text-dracula-foreground/70">env</code> block.
          </p>
        </Subsection>
      </Section>

      {/* ── Remote Setup ────────────────────────────── */}
      <Section id="mcp-remote" title="Remote Server Setup">
        <Subsection id="mcp-remote-config" title="Configure the Remote URL">
          <p className="text-sm text-dracula-foreground/70 mb-4">
            Point your local <UnforgitBrand capitalize /> at a remote API server for team-shared
            memory, hybrid recall, and server-side AI features.
          </p>
          <div className="space-y-4">
            <Terminal
              title="Set remote URL during init"
              code={`$ unforgit init --remote-url https://unforgit.example.com`}
            />
            <Terminal
              title="Or configure it later"
              code={`$ unforgit config set remote.url https://unforgit.example.com
$ unforgit config set remote.orgId my-org
$ unforgit config set remote.repoId my-repo`}
            />
          </div>
        </Subsection>

        <Subsection id="mcp-remote-docker" title="Running the Remote Server">
          <p className="text-sm text-dracula-foreground/70 mb-4">
            The remote server runs as a Docker Compose stack with PostgreSQL
            and the Fastify API.
          </p>
          <div className="space-y-4">
            <Terminal
              title="Start the server"
              code={`$ git clone https://github.com/miguelmedeiros/unforgit.git
$ cd unforgit
$ docker compose up -d
$ pnpm run db:push`}
            />
            <Terminal
              title="Server .env (optional AI features)"
              code={`DATABASE_URL=postgresql://unforgit:unforgit@localhost:5432/unforgit
OPENAI_API_KEY=sk-your-team-key
AUTO_EMBEDDING_ENABLED=true
CONSOLIDATION_MODEL=gpt-5.4`}
            />
          </div>
          <div className="mt-4 rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
            <ul className="text-sm text-dracula-foreground/70 space-y-2">
              <li>
                The API runs on port{" "}
                <code className="text-dracula-foreground/80">3737</code> by
                default.
              </li>
              <li>
                All endpoints except{" "}
                <code className="text-dracula-foreground/80">/health</code>{" "}
                require Bearer authentication.
              </li>
              <li>
                With{" "}
                <code className="text-dracula-foreground/80">
                  OPENAI_API_KEY
                </code>{" "}
                on the server, recall automatically upgrades to hybrid
                semantic search.
              </li>
            </ul>
          </div>
        </Subsection>

        <Subsection id="mcp-remote-connect" title="Connect Local Client to Remote">
          <p className="text-sm text-dracula-foreground/70 mb-4">
            After the remote server is running, connect your local project:
          </p>
          <Terminal
            title="Full connection flow"
            code={`$ unforgit config set remote.url https://unforgit.example.com
$ export UNFORGIT_API_KEY=hk_your_api_key
$ unforgit push origin
$ unforgit pull origin
$ unforgit recall "deploy" --remote-only`}
          />
          <p className="text-sm text-dracula-foreground/60 mt-3">
            You can also manage multiple remotes with{" "}
            <code className="text-dracula-foreground/70">
              unforgit remote add
            </code>
            . See the{" "}
            <Link
              href="/docs#cli-sync"
              className="underline hover:text-dracula-foreground transition-colors"
            >
              CLI reference
            </Link>{" "}
            for details.
          </p>
        </Subsection>
      </Section>

      {/* ── Tools Reference ──────────────────────────── */}
      <Section id="mcp-tools" title="Available MCP Tools">
        <p className="text-dracula-foreground/70 mb-6">
          These tools are exposed to your IDE&apos;s AI agent when the MCP
          server is connected. The agent can call them directly during
          conversations.
        </p>
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
              {mcpTools.map((tool) => (
                <tr key={tool.name}>
                  <td className="py-3 px-4 align-top">
                    <code className="text-dracula-foreground text-xs">
                      {tool.name}
                    </code>
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/70">
                    {tool.description}
                  </td>
                  <td className="py-3 px-4 text-dracula-foreground/60 font-mono text-xs">
                    {tool.params}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Cursor Rules ─────────────────────────────── */}
      <Section id="mcp-cursor-rules" title="Cursor Rules">
        <p className="text-dracula-foreground/70 mb-4">
          <code className="text-dracula-foreground/80">unforgit init</code>{" "}
          creates{" "}
          <code className="text-dracula-foreground/80">
            .cursor/rules/unforgit-memory.mdc
          </code>{" "}
          which instructs the AI agent to:
        </p>
        <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
          <ul className="text-sm text-dracula-foreground/70 space-y-2">
            <li>
              <strong>Recall</strong> relevant memories at the start of every
              conversation using{" "}
              <code className="text-dracula-foreground/80">
                unforgit_recall
              </code>
              .
            </li>
            <li>
              <strong>Save</strong> noteworthy decisions, bugs, gotchas, and
              procedures during the conversation using{" "}
              <code className="text-dracula-foreground/80">unforgit_add</code>.
            </li>
          </ul>
        </div>
        <p className="text-sm text-dracula-foreground/60 mt-3">
          You can customize this rule to match your team&apos;s workflow. The
          file is a standard Cursor rule and supports all Cursor rule features.
        </p>
      </Section>

      {/* ── Troubleshooting ──────────────────────────── */}
      <Section id="mcp-troubleshooting" title="Troubleshooting">
        <div className="space-y-4">
          <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-dracula-foreground/70 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-dracula-foreground mb-1">
                  Tools not appearing in IDE
                </h4>
                <ul className="text-sm text-dracula-foreground/70 space-y-1">
                  <li>
                    Verify{" "}
                    <code className="text-dracula-foreground/80">
                      unforgit-mcp
                    </code>{" "}
                    is in your PATH:{" "}
                    <code className="text-dracula-foreground/80">
                      which unforgit-mcp
                    </code>
                  </li>
                  <li>
                    Check that{" "}
                    <code className="text-dracula-foreground/80">
                      .unforgit/
                    </code>{" "}
                    exists in the project root
                  </li>
                  <li>Restart the IDE after config changes</li>
                  <li>
                    If using nvm/fnm, make sure the IDE inherits the correct
                    Node version
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-dracula-foreground/70 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-dracula-foreground mb-1">
                  Debug mode
                </h4>
                <p className="text-sm text-dracula-foreground/70">
                  Set{" "}
                  <code className="text-dracula-foreground/80">
                    UNFORGIT_DEBUG=1
                  </code>{" "}
                  to enable verbose logging to stderr. This does not interfere
                  with the MCP protocol on stdout.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-dracula-current/50 bg-dracula-background p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-dracula-foreground/70 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-dracula-foreground mb-1">
                  &quot;command not found&quot; error
                </h4>
                <p className="text-sm text-dracula-foreground/70">
                  If your IDE can&apos;t find the binary, use the full path in
                  the config. Run{" "}
                  <code className="text-dracula-foreground/80">
                    which unforgit-mcp
                  </code>{" "}
                  to find it, then replace{" "}
                  <code className="text-dracula-foreground/80">
                    &quot;command&quot;: &quot;unforgit-mcp&quot;
                  </code>{" "}
                  with the absolute path. Alternatively, use{" "}
                  <code className="text-dracula-foreground/80">
                    &quot;command&quot;: &quot;npx&quot;, &quot;args&quot;:
                    [&quot;unforgit-mcp&quot;]
                  </code>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

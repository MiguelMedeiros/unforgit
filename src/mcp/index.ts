import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { LocalStore } from "../db/local.js";
import { resolveVisibility } from "../core/policy.js";
import { loadConfig, getDbPath, isInitialized } from "../cli/config.js";
import type { MemoryType, LinkType } from "../core/types.js";

const cwd = process.cwd();

function getStore(): { store: LocalStore; orgId: string; repoId: string } {
  if (!isInitialized(cwd)) {
    throw new Error(
      "Hippocampus not initialized in this directory. Run 'hippo init' first.",
    );
  }

  const config = loadConfig(cwd);
  const store = new LocalStore(getDbPath(cwd));

  return {
    store,
    orgId: config.remote.orgId || "local",
    repoId: config.remote.repoId || "local",
  };
}

const server = new McpServer({
  name: "hippocampus",
  version: "0.1.0",
});

server.tool(
  "hippo_recall",
  "Search local repository memories by query. Returns relevant past decisions, conventions, bugs, and procedures stored across sessions.",
  {
    query: z.string().describe("Search query (natural language)"),
    types: z
      .array(z.enum(["episodic", "semantic", "procedural"]))
      .optional()
      .describe("Filter by memory types"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Filter by tags"),
    k: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Max number of results"),
  },
  async ({ query, types, tags, k }) => {
    const { store, orgId, repoId } = getStore();

    try {
      const results = store.recall({
        orgId,
        repoId,
        query,
        types: types as MemoryType[] | undefined,
        tags,
        k,
      });

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: "No memories found." }],
        };
      }

      const formatted = results.map((r) => {
        const parts = [
          `[${r.memoryType}] ${r.id.slice(0, 8)} (score: ${r.score.toFixed(3)})`,
          r.text,
        ];
        if (r.tags.length > 0) parts.push(`Tags: ${r.tags.join(", ")}`);
        return parts.join("\n");
      });

      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} memories:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "hippo_add",
  "Store a memory in the local repository knowledge base. Use for decisions, conventions, bugs, gotchas, and procedures worth remembering across sessions.",
  {
    text: z
      .string()
      .min(1)
      .describe("Memory content (concise, self-contained)"),
    type: z
      .enum(["episodic", "semantic", "procedural"])
      .describe(
        "episodic = observations/bugs, semantic = facts/decisions, procedural = workflows/playbooks",
      ),
    tags: z
      .array(z.string())
      .optional()
      .default([])
      .describe("Tags for discoverability (e.g. auth, bug, deploy)"),
  },
  async ({ text, type, tags }) => {
    const { store, orgId, repoId } = getStore();

    try {
      const input = {
        orgId,
        repoId,
        memoryType: type as MemoryType,
        text,
        tags,
        visibility: "private" as const,
      };

      const policy = resolveVisibility(input);
      const memory = store.store({
        ...input,
        visibility: policy.visibility,
      });

      const parts = [
        `Memory stored: ${memory.id}`,
        `Type: ${memory.memoryType}`,
        `Visibility: ${memory.visibility}`,
        `Tags: ${memory.tags.join(", ") || "(none)"}`,
      ];

      if (policy.suggestion === "promote") {
        parts.push(
          `\nHint: This memory might be useful for the team. Consider promoting it later with 'hippo promote ${memory.id}'.`,
        );
      }

      return {
        content: [{ type: "text", text: parts.join("\n") }],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "hippo_link",
  "Create a directional link between two memories. Use to express relationships like 'related_to', 'derived_from', 'contradicts', or 'depends_on'.",
  {
    sourceId: z.string().min(1).describe("Source memory ID"),
    targetId: z.string().min(1).describe("Target memory ID"),
    linkType: z
      .enum(["related_to", "derived_from", "contradicts", "depends_on"])
      .describe(
        "related_to = general association, derived_from = created from another, contradicts = conflicts with, depends_on = requires context from",
      ),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Optional metadata for the link"),
  },
  async ({ sourceId, targetId, linkType, metadata }) => {
    const { store } = getStore();

    try {
      const link = store.link({
        sourceId,
        targetId,
        linkType: linkType as LinkType,
        metadata,
      });

      return {
        content: [
          {
            type: "text",
            text: `Link created: ${link.id}\n${sourceId.slice(0, 8)} --[${linkType}]--> ${targetId.slice(0, 8)}`,
          },
        ],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "hippo_unlink",
  "Remove a link between two memories.",
  {
    sourceId: z.string().min(1).describe("Source memory ID"),
    targetId: z.string().min(1).describe("Target memory ID"),
    linkType: z
      .enum(["related_to", "derived_from", "contradicts", "depends_on"])
      .describe("Type of link to remove"),
  },
  async ({ sourceId, targetId, linkType }) => {
    const { store } = getStore();

    try {
      const ok = store.unlink(sourceId, targetId, linkType);

      return {
        content: [
          {
            type: "text",
            text: ok
              ? `Link removed: ${sourceId.slice(0, 8)} --[${linkType}]--> ${targetId.slice(0, 8)}`
              : "Link not found.",
          },
        ],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "hippo_links",
  "Get all links for a memory. Returns connected memories and their relationship types.",
  {
    memoryId: z.string().min(1).describe("Memory ID to get links for"),
    linkType: z
      .enum(["related_to", "derived_from", "contradicts", "depends_on"])
      .optional()
      .describe("Filter by link type"),
  },
  async ({ memoryId, linkType }) => {
    const { store } = getStore();

    try {
      const links = store.getLinks({
        memoryId,
        linkType: linkType as LinkType | undefined,
      });

      if (links.length === 0) {
        return {
          content: [{ type: "text", text: "No links found." }],
        };
      }

      const formatted = links.map((l) => {
        const direction =
          l.sourceId === memoryId
            ? `--[${l.linkType}]--> ${l.targetId.slice(0, 8)}`
            : `<--[${l.linkType}]-- ${l.sourceId.slice(0, 8)}`;
        return `${l.id.slice(0, 8)}: ${direction}`;
      });

      return {
        content: [
          {
            type: "text",
            text: `Found ${links.length} links:\n\n${formatted.join("\n")}`,
          },
        ],
      };
    } finally {
      store.close();
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Hippocampus MCP server error:", err);
  process.exit(1);
});

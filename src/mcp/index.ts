import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { LocalStore } from "../db/local.js";
import { resolveVisibility } from "../core/policy.js";
import { applyLifecycleDefaults, resolveLifecycleConfig } from "../core/lifecycle.js";
import { buildAutoLinkQuery } from "../core/auto-link.js";
import { loadConfig, getDbPath, isInitialized } from "../cli/config.js";
import type { MemoryType, LinkType } from "../core/types.js";
import {
  findConsolidationCandidates,
  executeConsolidation,
  formatCandidatePreview,
} from "../core/auto-consolidate.js";
import { generateEmbedding } from "../core/embeddings.js";
import { generateSuggestions, formatSuggestion } from "../core/suggestions.js";
import { computeRepositoryHealth, type MemoryStats } from "../core/quality.js";
import { getTemplate, applyTemplate, formatTemplateList, MEMORY_TEMPLATES } from "../core/templates.js";
import { getNotifications, formatNotificationsSummary } from "../core/notifications.js";
import { runLocalLifecycleMaintenance } from "../core/lifecycle-maintenance.js";
import { LifecycleScheduler } from "../core/lifecycle-scheduler.js";

const cwd = process.cwd();

// Debug log to stderr (doesn't affect MCP protocol on stdout)
const debug = (msg: string) => {
  if (process.env.UNFORGIT_DEBUG === "1") {
    console.error(`[unforgit-mcp] ${msg}`);
  }
};

debug(`Starting with cwd: ${cwd}`);

function getStore(): {
  store: LocalStore;
  orgId: string;
  repoId: string;
  config: ReturnType<typeof loadConfig>;
} {
  debug(`getStore called, checking initialization at: ${cwd}`);
  
  if (!isInitialized(cwd)) {
    debug(`Not initialized at ${cwd}`);
    throw new Error(
      `Unforgit not initialized in this directory (${cwd}). Run 'unforgit init' first.`,
    );
  }

  const config = loadConfig(cwd);
  const dbPath = getDbPath(cwd);
  debug(`Loading config - orgId: ${config.remote.orgId}, repoId: ${config.remote.repoId}, dbPath: ${dbPath}`);
  
  const store = new LocalStore(dbPath);

  return {
    store,
    orgId: config.remote.orgId || "local",
    repoId: config.remote.repoId || "local",
    config,
  };
}

const server = new McpServer({
  name: "unforgit",
  version: "0.1.0",
});

server.tool(
  "unforgit_recall",
  "Search local repository memories by query. Returns relevant past decisions, conventions, bugs, and procedures stored across sessions. Consolidated memories are prioritized by default.",
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
    expandHistory: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, includes source memories for each consolidation"),
  },
  async ({ query, types, tags, k, expandHistory }) => {
    const { store, orgId, repoId, config } = getStore();

    try {
      const results = store.recall({
        orgId,
        repoId,
        query,
        types: types as MemoryType[] | undefined,
        tags,
        k,
        expandHistory,
        includeConsolidatedSources: expandHistory,
      });
      const usageTrackingLimit = resolveLifecycleConfig(config.lifecycle).usageBoost.topKToRecord;
      const idsToRecord = results.slice(0, usageTrackingLimit).map((result) => result.id);
      if (idsToRecord.length > 0) {
        store.recordUsageBatch(idsToRecord, query);
      }
      scheduleLocalLifecycleFromConfig(config, orgId, repoId, "recall");

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: "No memories found." }],
        };
      }

      const formatted = results.map((r) => {
        const consolidationMarker = r.isConsolidation
          ? ` [consolidated v${r.consolidationVersion ?? 1}]`
          : "";
        const parts = [
          `[${r.memoryType}] ${r.id.slice(0, 8)}${consolidationMarker} (score: ${r.score.toFixed(3)})`,
          r.text,
        ];
        if (r.tags.length > 0) parts.push(`Tags: ${r.tags.join(", ")}`);

        if (expandHistory && r.sourceMemories && r.sourceMemories.length > 0) {
          parts.push("Source memories:");
          for (const src of r.sourceMemories) {
            parts.push(`  └─ [${src.memoryType}] ${src.id.slice(0, 8)}: ${src.text.slice(0, 80)}...`);
          }
        }

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

function getGitAuthor(): { authorId?: string; authorName?: string } {
  try {
    const { execSync } = require("child_process");
    const name = execSync("git config user.name", { encoding: "utf8", cwd }).trim();
    const email = execSync("git config user.email", { encoding: "utf8", cwd }).trim();
    return {
      authorId: email || undefined,
      authorName: name || undefined,
    };
  } catch {
    return {};
  }
}

const AUTO_LINK_THRESHOLD = 0.25;
const AUTO_LINK_MAX = 3;
let localLifecycleScheduler: LifecycleScheduler | undefined;
let localLifecycleSchedulerDebounceMs: number | undefined;

function getLocalLifecycleScheduler(debounceMs: number): LifecycleScheduler {
  if (
    !localLifecycleScheduler ||
    localLifecycleSchedulerDebounceMs !== debounceMs
  ) {
    localLifecycleScheduler?.dispose();
    localLifecycleScheduler = new LifecycleScheduler(
      async (orgId, repoId) => {
        const config = loadConfig(cwd);
        const store = new LocalStore(getDbPath(cwd));
        try {
          await runLocalLifecycleMaintenance(store, orgId, repoId, {
            dryRun: false,
            preserveOriginals: true,
            lifecycle: config.lifecycle,
          });
        } finally {
          store.close();
        }
      },
      {
        debounceMs,
        onError: (error, context) => {
          debug(
            `Lifecycle hook failed for ${context.orgId}/${context.repoId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        },
      },
    );
    localLifecycleSchedulerDebounceMs = debounceMs;
  }

  return localLifecycleScheduler;
}

function scheduleLocalLifecycleFromConfig(
  config: ReturnType<typeof loadConfig>,
  orgId: string,
  repoId: string,
  trigger: "store" | "recall",
): void {
  const maintenance = resolveLifecycleConfig(config.lifecycle).maintenance;

  if (trigger === "store" && !maintenance.autoRunOnStore) {
    return;
  }

  if (trigger === "recall" && !maintenance.autoRunOnRecall) {
    return;
  }

  getLocalLifecycleScheduler(maintenance.debounceMs).schedule(orgId, repoId);
}

server.tool(
  "unforgit_add",
  "Store a memory in the local repository knowledge base. Use for decisions, conventions, bugs, gotchas, and procedures worth remembering across sessions. Automatically links to related existing memories. Use templates for common memory types.",
  {
    text: z
      .string()
      .min(1)
      .describe("Memory content (concise, self-contained)"),
    type: z
      .enum(["episodic", "semantic", "procedural"])
      .optional()
      .describe(
        "episodic = observations/bugs, semantic = facts/decisions, procedural = workflows/playbooks (auto-set if using template)",
      ),
    tags: z
      .array(z.string())
      .optional()
      .default([])
      .describe("Tags for discoverability (e.g. auth, bug, deploy)"),
    template: z
      .enum(Object.keys(MEMORY_TEMPLATES) as [string, ...string[]])
      .optional()
      .describe("Template: decision, gotcha, playbook, bug, convention, adr, deploy, workaround, perf, security, api"),
    autoLink: z
      .boolean()
      .optional()
      .default(true)
      .describe("Automatically link to related memories (default: true)"),
  },
  async ({ text, type, tags, template, autoLink }) => {
    const { store, orgId, repoId, config } = getStore();
    const author = getGitAuthor();

    try {
      let memoryText = text;
      let memoryType = (type ?? config.defaults.memoryType) as MemoryType;
      let memoryTags = tags;
      let visibility: "private" | "repo" = "private";

      if (template) {
        const tmpl = getTemplate(template);
        if (tmpl) {
          const applied = applyTemplate(tmpl, text, tags);
          memoryText = applied.text;
          memoryType = applied.memoryType;
          memoryTags = applied.tags;
          visibility = applied.visibility === "auto" ? "private" : applied.visibility;
        }
      }

      const input = applyLifecycleDefaults({
        orgId,
        repoId,
        memoryType,
        text: memoryText,
        tags: memoryTags,
        visibility,
        authorId: author.authorId,
        authorName: author.authorName,
      }, config.lifecycle);

      const policy = resolveVisibility(input);
      const memory = store.store({
        ...input,
        visibility: "private",
      });

      const parts = [
        `Memory stored: ${memory.id}`,
        `Type: ${memory.memoryType}`,
        `Visibility: ${memory.visibility} (will sync to remote on next sync)`,
        `Tags: ${memory.tags.join(", ") || "(none)"}`,
      ];
      
      if (policy.visibility === "repo") {
        parts.push(`Suggested: This memory should be shared with the team`);
      }

      const linkedIds: string[] = [];
      if (autoLink) {
        const searchQuery = buildAutoLinkQuery(text, 10);

        if (searchQuery) {
          const similar = store.recall({
            orgId,
            repoId,
            query: searchQuery,
            k: AUTO_LINK_MAX + 5,
          });

          for (const match of similar) {
            if (match.id === memory.id) continue;
            if (match.score < AUTO_LINK_THRESHOLD) continue;
            if (linkedIds.length >= AUTO_LINK_MAX) break;

            try {
              store.link({
                sourceId: memory.id,
                targetId: match.id,
                linkType: "related_to",
              });
              linkedIds.push(match.id);
            } catch (err) {
              console.error("Auto-link error:", err);
            }
          }
        }

        if (linkedIds.length > 0) {
          parts.push(`\nAuto-linked to ${linkedIds.length} related memories:`);
          for (const id of linkedIds) {
            parts.push(`  → ${id.slice(0, 8)}`);
          }
        }
      }

      if (policy.suggestion === "promote") {
        parts.push(
          `\nHint: This memory might be useful for the team. Consider promoting it later with 'unforgit promote ${memory.id}'.`,
        );
      }

      scheduleLocalLifecycleFromConfig(config, orgId, repoId, "store");

      return {
        content: [{ type: "text", text: parts.join("\n") }],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "unforgit_curate",
  "Preview or run lifecycle maintenance for local memories: expire stale episodic noise, surface frequently reused memories, and identify consolidation candidates.",
  {
    dryRun: z
      .boolean()
      .optional()
      .default(true)
      .describe("If true, preview actions without changing any memories"),
    model: z
      .string()
      .optional()
      .describe("Optional OpenAI model for consolidation execution"),
    preserveOriginals: z
      .boolean()
      .optional()
      .default(true)
      .describe("If false, do not preserve originals during consolidation"),
  },
  async ({ dryRun, model, preserveOriginals }) => {
    const { store, orgId, repoId, config } = getStore();

    try {
      const result = await runLocalLifecycleMaintenance(store, orgId, repoId, {
        dryRun,
        model,
        preserveOriginals,
        lifecycle: config.lifecycle,
      });

      const sections = [
        result.dryRun ? "Lifecycle preview" : "Lifecycle execution",
        `Active memories scanned: ${result.totalActiveMemories}`,
        `Expired candidates: ${result.expiredCandidates.length}`,
        `Strengthened candidates: ${result.strengthenedCandidates.length}`,
        `Consolidation candidates: ${result.consolidationCandidates.length}`,
      ];

      if (result.executedConsolidations.length > 0) {
        sections.push(
          `Executed consolidations: ${result.executedConsolidations.length}`,
        );
      }

      if (result.warnings.length > 0) {
        sections.push(`Warnings: ${result.warnings.join(" | ")}`);
      }

      if (result.errors.length > 0) {
        sections.push(`Errors: ${result.errors.join(" | ")}`);
      }

      return {
        content: [{ type: "text", text: sections.join("\n") }],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "unforgit_link",
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
  "unforgit_unlink",
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
  "unforgit_links",
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

server.tool(
  "unforgit_consolidate",
  "Consolidate multiple related memories into a single unified memory. The original memories are preserved and linked via 'derived_from' relationships, creating a commit-like history. Use this to reduce noise while maintaining full history.",
  {
    sourceIds: z
      .array(z.string().min(1))
      .min(2)
      .describe("IDs of memories to consolidate (minimum 2)"),
    consolidatedText: z
      .string()
      .min(1)
      .describe("The unified text combining insights from all source memories"),
    memoryType: z
      .enum(["episodic", "semantic", "procedural"])
      .optional()
      .describe("Type for the consolidated memory (auto-inferred if not provided)"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Tags for the consolidated memory (merged from sources if not provided)"),
    preserveOriginals: z
      .boolean()
      .optional()
      .default(true)
      .describe("If true, marks original memories as 'superseded' (default: true)"),
  },
  async ({ sourceIds, consolidatedText, memoryType, tags, preserveOriginals }) => {
    const { store, orgId, repoId } = getStore();

    try {
      const result = store.consolidateMemories({
        orgId,
        repoId,
        sourceIds,
        consolidatedText,
        memoryType: memoryType as MemoryType | undefined,
        tags,
        preserveOriginals,
      });

      const parts = [
        `Consolidated memory created: ${result.consolidatedId}`,
        `Version: ${result.version}`,
        `Sources preserved: ${result.sourcesPreserved}`,
        `Source IDs: ${result.sourceIds.map((id) => id.slice(0, 8)).join(", ")}`,
        "",
        "Original memories are now linked via 'derived_from' and marked as 'superseded'.",
        "Use unforgit_recall to search - consolidated memories are prioritized.",
        "Use unforgit_history to view the full consolidation history.",
      ];

      return {
        content: [{ type: "text", text: parts.join("\n") }],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "unforgit_reconsolidate",
  "Update an existing consolidation with new information or additional source memories. Creates a new version while preserving the previous consolidation in history.",
  {
    existingConsolidationId: z
      .string()
      .min(1)
      .describe("ID of the existing consolidated memory to update"),
    newText: z
      .string()
      .min(1)
      .describe("Updated consolidated text including any new information"),
    additionalSourceIds: z
      .array(z.string().min(1))
      .optional()
      .describe("IDs of additional memories to include in this consolidation"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Updated tags (keeps existing if not provided)"),
  },
  async ({ existingConsolidationId, newText, additionalSourceIds, tags }) => {
    const { store, orgId, repoId } = getStore();

    try {
      const result = store.reconsolidate({
        orgId,
        repoId,
        existingConsolidationId,
        additionalSourceIds,
        newText,
        tags,
      });

      const parts = [
        `Reconsolidation complete: ${result.consolidatedId}`,
        `New version: ${result.version}`,
        `Total sources: ${result.sourcesPreserved}`,
        `Previous consolidation: ${existingConsolidationId.slice(0, 8)} (now superseded)`,
        "",
        "The consolidation history is preserved. Use unforgit_history to view all versions.",
      ];

      return {
        content: [{ type: "text", text: parts.join("\n") }],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "unforgit_find_similar",
  "Find memories similar to a given memory. Useful for identifying candidates for consolidation.",
  {
    memoryId: z.string().min(1).describe("ID of the memory to find similar ones for"),
    threshold: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.3)
      .describe("Minimum similarity score (0-1, default: 0.3)"),
    k: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .default(10)
      .describe("Max number of similar memories to return"),
  },
  async ({ memoryId, threshold, k }) => {
    const { store, orgId, repoId } = getStore();

    try {
      const similar = store.findSimilar({
        orgId,
        repoId,
        memoryId,
        threshold,
        k,
      });

      if (similar.length === 0) {
        return {
          content: [{ type: "text", text: "No similar memories found." }],
        };
      }

      const formatted = similar.map((r) => {
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
            text: `Found ${similar.length} similar memories:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "unforgit_history",
  "Get the consolidation history for a memory. Shows all source memories and previous consolidation versions.",
  {
    memoryId: z.string().min(1).describe("ID of the memory to get history for"),
  },
  async ({ memoryId }) => {
    const { store } = getStore();

    try {
      const memory = store.getById(memoryId);
      if (!memory) {
        return {
          content: [{ type: "text", text: "Memory not found." }],
        };
      }

      const parts: string[] = [
        `Memory: ${memory.id.slice(0, 8)}`,
        `Type: ${memory.memoryType}`,
        `Is Consolidation: ${memory.isConsolidation ? "Yes" : "No"}`,
      ];

      if (memory.isConsolidation) {
        parts.push(`Version: ${memory.consolidationVersion ?? 1}`);

        const sources = store.getConsolidatedSources(memoryId);
        if (sources.length > 0) {
          parts.push("", "Source memories:");
          for (const src of sources) {
            parts.push(`  - [${src.memoryType}] ${src.id.slice(0, 8)}: ${src.text.slice(0, 60)}...`);
          }
        }

        const history = store.getConsolidationHistory(memoryId);
        const previousVersions = history.filter((h) => h.isConsolidation);
        if (previousVersions.length > 0) {
          parts.push("", "Previous consolidation versions:");
          for (const prev of previousVersions) {
            parts.push(`  - v${prev.consolidationVersion ?? 1} (${prev.id.slice(0, 8)}): ${prev.text.slice(0, 60)}...`);
          }
        }
      } else {
        const links = store.getLinks({ memoryId, linkType: "derived_from" });
        const consolidations = links.filter((l) => l.targetId === memoryId);
        if (consolidations.length > 0) {
          parts.push("", "Included in consolidations:");
          for (const link of consolidations) {
            const consol = store.getById(link.sourceId);
            if (consol) {
              parts.push(`  - v${consol.consolidationVersion ?? 1} (${consol.id.slice(0, 8)})`);
            }
          }
        }
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
  "unforgit_delete",
  "Soft delete a memory from the local repository. The memory can be restored later. Creates a tombstone for sync propagation.",
  {
    memoryId: z.string().min(1).describe("ID of the memory to delete"),
    reason: z
      .string()
      .optional()
      .describe("Optional reason for deletion"),
    hardDelete: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, permanently delete (cannot be restored)"),
  },
  async ({ memoryId, reason, hardDelete }) => {
    const { store } = getStore();
    const author = getGitAuthor();

    try {
      const memory = store.getById(memoryId);
      if (!memory) {
        return {
          content: [{ type: "text", text: "Memory not found." }],
        };
      }

      let ok: boolean;
      if (hardDelete) {
        ok = store.hardDelete(memoryId);
      } else {
        ok = store.softDelete({
          id: memoryId,
          deletedBy: author.authorName ?? author.authorId,
        });
      }

      if (!ok) {
        return {
          content: [{ type: "text", text: "Failed to delete memory." }],
        };
      }

      const action = hardDelete ? "Hard deleted" : "Soft deleted";
      const parts = [
        `${action}: ${memoryId.slice(0, 8)}`,
        `Type: ${memory.memoryType}`,
      ];

      if (reason) {
        parts.push(`Reason: ${reason}`);
      }

      if (!hardDelete) {
        parts.push("", "This memory can be restored with unforgit_restore.");
        parts.push("Deletion will be synced to remote on next sync.");
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
  "unforgit_restore",
  "Restore a soft-deleted memory. Only works for memories that were soft deleted (not hard deleted).",
  {
    memoryId: z.string().min(1).describe("ID of the memory to restore"),
  },
  async ({ memoryId }) => {
    const { store } = getStore();

    try {
      const ok = store.restore(memoryId);

      if (!ok) {
        return {
          content: [{ type: "text", text: "Memory not found or was not soft deleted." }],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Restored memory: ${memoryId.slice(0, 8)}\nMemory is now active and will be synced.`,
          },
        ],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "unforgit_list_deleted",
  "List all soft-deleted memories that can be restored.",
  {},
  async () => {
    const { store, orgId, repoId } = getStore();

    try {
      const tombstones = store.getTombstones(orgId, repoId);

      if (tombstones.length === 0) {
        return {
          content: [{ type: "text", text: "No deleted memories found." }],
        };
      }

      const parts = [`Found ${tombstones.length} deleted memories:`, ""];
      for (const t of tombstones) {
        const syncStatus = t.syncedAt ? "synced" : "pending sync";
        parts.push(
          `- ${t.memoryId.slice(0, 8)} (deleted at ${t.deletedAt.toISOString()}, ${syncStatus})`,
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
  "unforgit_unconsolidate",
  "Revert a consolidation, restoring original memories to active status. The consolidated memory is soft-deleted and can be restored later. Use this to undo a consolidation if the merged result is not satisfactory.",
  {
    consolidationId: z
      .string()
      .min(1)
      .describe("ID of the consolidated memory to revert"),
    dryRun: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, show what would be restored without making changes"),
  },
  async ({ consolidationId, dryRun }) => {
    const { store } = getStore();

    try {
      const memory = store.getById(consolidationId);
      if (!memory) {
        return {
          content: [{ type: "text", text: "Memory not found." }],
        };
      }

      if (!memory.isConsolidation) {
        return {
          content: [
            {
              type: "text",
              text: `Memory ${consolidationId.slice(0, 8)} is not a consolidation.\nOnly consolidated memories can be unconsolidated.`,
            },
          ],
        };
      }

      const sourceLinks = store.getLinks({ memoryId: consolidationId, linkType: "derived_from" });
      const sourceIds = sourceLinks
        .filter((l) => l.sourceId === consolidationId)
        .map((l) => l.targetId);

      const parts: string[] = [
        `Consolidation: ${consolidationId.slice(0, 8)}`,
        `Version: ${memory.consolidationVersion ?? 1}`,
        `Source memories: ${sourceIds.length}`,
        "",
      ];

      if (sourceIds.length === 0) {
        parts.push("No source memories found for this consolidation.");
        return {
          content: [{ type: "text", text: parts.join("\n") }],
        };
      }

      parts.push("Source memories:");
      for (const sourceId of sourceIds) {
        const source = store.getById(sourceId);
        if (source) {
          const willRestore = source.status === "superseded" && source.supersedesId === consolidationId;
          const status = willRestore ? "will restore" : `${source.status} (no change)`;
          const preview = source.text.slice(0, 50) + (source.text.length > 50 ? "..." : "");
          parts.push(`  - ${sourceId.slice(0, 8)} [${source.memoryType}] (${status})`);
          parts.push(`    ${preview}`);
        }
      }
      parts.push("");

      if (dryRun) {
        parts.push("[Dry run - no changes made]");
        parts.push("Set dryRun=false to execute the unconsolidation.");
        return {
          content: [{ type: "text", text: parts.join("\n") }],
        };
      }

      const result = store.unconsolidate(consolidationId);

      parts.push("Unconsolidation complete:");
      parts.push(`  Restored: ${result.restoredIds.length} memories`);
      parts.push(`  Links removed: ${result.linksRemoved}`);
      parts.push(`  Consolidation deleted: ${result.consolidationDeleted ? "Yes" : "No"}`);

      if (result.restoredIds.length > 0) {
        parts.push("");
        parts.push("Restored memories:");
        for (const id of result.restoredIds) {
          parts.push(`  - ${id.slice(0, 8)}`);
        }
      }

      parts.push("");
      parts.push("The consolidated memory has been soft-deleted.");
      parts.push("Use unforgit_restore to restore it if needed.");

      return {
        content: [{ type: "text", text: parts.join("\n") }],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "unforgit_auto_consolidate",
  "Automatically find and consolidate similar memories using AI. In dry-run mode (default), returns consolidation candidates without making changes. With execute=true, generates consolidated text via OpenAI and creates new consolidated memories.",
  {
    threshold: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.4)
      .describe("Minimum similarity score for grouping (0-1, default: 0.4)"),
    minGroupSize: z
      .number()
      .int()
      .min(2)
      .optional()
      .default(2)
      .describe("Minimum number of memories in a group (default: 2)"),
    maxGroups: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .default(5)
      .describe("Maximum number of groups to process (default: 5)"),
    types: z
      .array(z.enum(["episodic", "semantic", "procedural"]))
      .optional()
      .describe("Filter by memory types"),
    dryRun: z
      .boolean()
      .optional()
      .default(true)
      .describe("If true (default), only show candidates without consolidating"),
    execute: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, execute consolidation using AI (requires OPENAI_API_KEY)"),
    model: z
      .string()
      .optional()
      .default("gpt-4o-mini")
      .describe("OpenAI model to use for text generation"),
  },
  async ({ threshold, minGroupSize, maxGroups, types, dryRun, execute, model }) => {
    const { store, orgId, repoId } = getStore();

    try {
      const result = findConsolidationCandidates(store, orgId, repoId, {
        threshold,
        minGroupSize,
        maxGroups,
        types: types as MemoryType[] | undefined,
        excludeConsolidations: true,
      });

      const parts: string[] = [
        `Scanned ${result.totalMemoriesScanned} active memories`,
        `Found ${result.totalCandidateGroups} potential groups`,
        `Showing top ${result.candidates.length} candidates`,
        "",
      ];

      if (result.candidates.length === 0) {
        parts.push("No consolidation candidates found.");
        parts.push("Try lowering the threshold or minGroupSize.");
        return {
          content: [{ type: "text", text: parts.join("\n") }],
        };
      }

      for (let i = 0; i < result.candidates.length; i++) {
        const candidate = result.candidates[i];
        parts.push(`--- Candidate ${i + 1} ---`);
        parts.push(formatCandidatePreview(candidate));
        parts.push("");
      }

      if (dryRun && !execute) {
        parts.push("[Dry run mode - no changes made]");
        parts.push("Set execute=true to consolidate these memories using AI.");
        return {
          content: [{ type: "text", text: parts.join("\n") }],
        };
      }

      if (!process.env.OPENAI_API_KEY) {
        parts.push("[Error] OPENAI_API_KEY not set.");
        parts.push("Set this environment variable to enable AI consolidation.");
        return {
          content: [{ type: "text", text: parts.join("\n") }],
        };
      }

      parts.push("Executing consolidation...");
      parts.push("");

      const executed: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < result.candidates.length; i++) {
        const candidate = result.candidates[i];
        try {
          const execResult = await executeConsolidation(
            store,
            candidate,
            orgId,
            repoId,
            { model, preserveOriginals: true },
          );

          executed.push(
            `[${i + 1}] Created ${execResult.consolidatedId.slice(0, 8)} from ${execResult.sourceIds.length} memories`,
          );
        } catch (err) {
          errors.push(
            `[${i + 1}] Failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      if (executed.length > 0) {
        parts.push("Successful consolidations:");
        parts.push(...executed.map((e) => `  ${e}`));
        parts.push("");
      }

      if (errors.length > 0) {
        parts.push("Errors:");
        parts.push(...errors.map((e) => `  ${e}`));
        parts.push("");
      }

      parts.push(`Summary: ${executed.length} consolidated, ${errors.length} failed`);
      parts.push("Original memories are preserved with status 'superseded'.");

      return {
        content: [{ type: "text", text: parts.join("\n") }],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "unforgit_sync_status",
  "Get the sync status between local and remote storage. Shows pending pushes, pulls, and conflicts.",
  {},
  async () => {
    const { store, orgId, repoId } = getStore();

    try {
      const summary = store.getSyncSummary(orgId, repoId);
      const embeddingStats = store.getEmbeddingStats(orgId, repoId);

      const parts = [
        "Sync Status",
        "===========",
        `Synced:        ${summary.synced}`,
        `Pending Push:  ${summary.pendingPush}`,
        `Pending Pull:  ${summary.pendingPull}`,
        `Conflicts:     ${summary.conflicts}`,
        "",
        "Embedding Coverage",
        "==================",
        `With embedding:    ${embeddingStats.withEmbedding}`,
        `Without embedding: ${embeddingStats.withoutEmbedding}`,
        `Coverage:          ${embeddingStats.total > 0 ? ((embeddingStats.withEmbedding / embeddingStats.total) * 100).toFixed(1) : 0}%`,
      ];

      if (summary.conflicts > 0) {
        parts.push("");
        parts.push("Warning: You have unresolved conflicts. Run 'unforgit status' for details.");
      }

      if (embeddingStats.withoutEmbedding > 0) {
        parts.push("");
        parts.push(`Tip: Run 'unforgit embeddings backfill' to generate missing embeddings for better semantic search.`);
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
  "unforgit_embedding_recall",
  "Search memories using semantic embeddings for better relevance. Falls back to text search if embeddings are unavailable.",
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
      let queryEmbedding: number[] | undefined;

      try {
        const embResult = await generateEmbedding(query);
        queryEmbedding = embResult.embedding;
      } catch {
        debug("Embedding generation failed, falling back to FTS");
      }

      const results = await store.recallWithEmbeddings(
        {
          orgId,
          repoId,
          query,
          types: types as MemoryType[] | undefined,
          tags,
          k,
        },
        queryEmbedding
      );

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: "No memories found." }],
        };
      }

      const searchMethod = queryEmbedding ? "semantic + text" : "text only";
      const formatted = results.map((r) => {
        const consolidationMarker = r.isConsolidation
          ? ` [consolidated v${r.consolidationVersion ?? 1}]`
          : "";
        const parts = [
          `[${r.memoryType}] ${r.id.slice(0, 8)}${consolidationMarker} (score: ${r.score.toFixed(3)})`,
          r.text,
        ];
        if (r.tags.length > 0) parts.push(`Tags: ${r.tags.join(", ")}`);
        return parts.join("\n");
      });

      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} memories (${searchMethod}):\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "unforgit_suggestions",
  "Get AI-powered curation suggestions for improving memory quality. Analyzes memories and suggests consolidations, deprecations, and improvements.",
  {
    maxSuggestions: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Maximum number of suggestions to return"),
  },
  async ({ maxSuggestions }) => {
    const { store, orgId, repoId } = getStore();

    try {
      const result = generateSuggestions(store, orgId, repoId, {
        maxSuggestions,
      });

      const parts = [
        "Curation Suggestions",
        "====================",
        `Analyzed ${result.stats.memoriesAnalyzed} memories`,
        `Found ${result.stats.suggestionsGenerated} suggestions`,
        "",
      ];

      if (result.suggestions.length === 0) {
        parts.push("No suggestions at this time. Your memory base is healthy!");
      } else {
        for (const suggestion of result.suggestions) {
          parts.push(formatSuggestion(suggestion));
          parts.push("");
        }
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
  "unforgit_health",
  "Get the health status of the repository memory base. Shows quality metrics and identifies areas needing attention.",
  {},
  async () => {
    const { store, orgId, repoId } = getStore();

    try {
      const memories = store.list({
        orgId,
        repoId,
        status: ["active"],
        limit: 500,
      });

      const usageStats = store.getUsageStats(orgId, repoId);
      const usageMap = new Map(usageStats.map((s) => [s.memoryId, s]));

      const memoryData = memories.map((memory) => {
        const usage = usageMap.get(memory.id);
        const links = store.getLinks({ memoryId: memory.id });
        const hasEmbedding = store.hasEmbedding(memory.id);

        const stats: MemoryStats = {
          recallCount: usage?.count ?? 0,
          linkCount: links.length,
          hasEmbedding,
          daysSinceCreation: Math.floor(
            (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          ),
          daysSinceLastRecall: usage
            ? Math.floor(
                (Date.now() - usage.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
              )
            : null,
        };

        return { memory, stats };
      });

      const health = computeRepositoryHealth(memoryData);

      const statusEmoji = {
        healthy: "✅",
        needs_attention: "⚠️",
        critical: "🔴",
      };

      const parts = [
        "Repository Health Report",
        "========================",
        `${statusEmoji[health.status]} Status: ${health.status.replace("_", " ").toUpperCase()}`,
        `Overall Score: ${Math.round(health.overallScore * 100)}%`,
        "",
        "Memory Counts",
        `  Total:           ${health.memoryCounts.total}`,
        `  Healthy:         ${health.memoryCounts.healthy}`,
        `  Needs Attention: ${health.memoryCounts.needs_attention}`,
        `  Critical:        ${health.memoryCounts.critical}`,
      ];

      if (health.topIssues.length > 0) {
        parts.push("");
        parts.push("Top Issues");
        for (const issue of health.topIssues) {
          parts.push(`  [${issue.type}] ${issue.count}x: ${issue.description}`);
        }
      }

      parts.push("");
      parts.push("Run 'unforgit_suggestions' for specific recommendations.");

      return {
        content: [{ type: "text", text: parts.join("\n") }],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "unforgit_notifications",
  "Get pending notifications about sync status, conflicts, missing embeddings, and curation suggestions. Run this periodically to stay informed.",
  {},
  async () => {
    const { store, orgId, repoId } = getStore();

    try {
      const result = getNotifications(store, orgId, repoId);
      const formatted = formatNotificationsSummary(result);

      return {
        content: [{ type: "text", text: formatted }],
      };
    } finally {
      store.close();
    }
  },
);

server.tool(
  "unforgit_templates",
  "List available memory templates for common use cases like decisions, gotchas, playbooks, etc.",
  {},
  async () => {
    const list = formatTemplateList();
    return {
      content: [{ type: "text", text: list }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Unforgit MCP server error:", err);
  process.exit(1);
});

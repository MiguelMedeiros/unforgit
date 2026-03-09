import type { FastifyInstance } from "fastify";
import { consolidateSchema } from "@unforgit/shared";
import type { RemoteStore } from "@unforgit/db";

export async function consolidateRoutes(
  app: FastifyInstance,
  store: RemoteStore,
): Promise<void> {
  app.post("/v1/consolidate", async (request, reply) => {
    const parsed = consolidateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues });
    }

    const { orgId, repoId, source, lastN } = parsed.data;
    const window = parsed.data.window;

    const recentMemories = await store.recall({
      orgId,
      repoId,
      query: source?.prUrl ?? source?.commitSha ?? "",
      k: lastN ?? 50,
      timeRange: window
        ? { from: window.from, to: window.to }
        : undefined,
      includeDeprecated: false,
    });

    const created: string[] = [];
    const superseded: string[] = [];

    const episodic = recentMemories.filter(
      (m) => m.memoryType === "episodic",
    );

    if (episodic.length > 0) {
      const consolidatedText = episodic
        .map((m) => m.text)
        .join("\n---\n");

      const sourceRefs: Record<string, unknown> = {};
      if (source?.prUrl) sourceRefs.pr_url = source.prUrl;
      if (source?.commitSha) sourceRefs.commit_sha = source.commitSha;
      sourceRefs.consolidated_from = episodic.map((m) => m.id);

      const newMemory = await store.store({
        orgId,
        repoId,
        memoryType: "semantic",
        text: `Consolidated from ${episodic.length} episodic memories:\n\n${consolidatedText}`,
        tags: ["consolidated"],
        sourceRefs,
        confidence: 0.7,
        visibility: "repo",
      });

      created.push(newMemory.id);

      for (const ep of episodic) {
        const ok = await store.supersede(ep.id, newMemory.id);
        if (ok) superseded.push(ep.id);

        try {
          await store.link({
            sourceId: newMemory.id,
            targetId: ep.id,
            linkType: "derived_from",
          });
        } catch {
          // Link creation is best-effort during consolidation
        }
      }
    }

    return reply.send({
      created,
      superseded,
      processedCount: recentMemories.length,
    });
  });
}

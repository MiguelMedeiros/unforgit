import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import type {
  Memory,
  MemoryLink,
  MemoryType,
  CreateMemoryInput,
  CreateLinkInput,
  LinkQuery,
  RecallQuery,
  RecallResult,
  ListQuery,
  StoreStats,
  Tombstone,
  DeleteMemoryInput,
  FindSimilarQuery,
  ConsolidateMemoriesInput,
  ConsolidateMemoriesResult,
} from "../core/types.js";
import { computeCompositeScore, computeHybridScore } from "../core/recall.js";
import {
  generateEmbedding,
  embeddingToPgVector,
  serializeEmbedding,
  deserializeEmbedding,
  isOpenAIConfigured,
  type EmbeddingConfig,
} from "../core/embeddings.js";

function prismaRowToMemory(row: Record<string, unknown>): Memory {
  return {
    id: row.id as string,
    orgId: row.orgId as string,
    repoId: row.repoId as string,
    scopeType: (row.scopeType as Memory["scopeType"]) ?? "repo",
    memoryType: row.memoryType as Memory["memoryType"],
    visibility: row.visibility as Memory["visibility"],
    status: row.status as Memory["status"],
    text: row.text as string,
    summary: (row.summary as string) ?? undefined,
    tags: (row.tags as string[]) ?? [],
    sourceRefs: row.sourceRefs as Record<string, unknown> | undefined,
    confidence: (row.confidence as number) ?? undefined,
    ttlSeconds: (row.ttlSeconds as number) ?? undefined,
    supersedesId: (row.supersedesId as string) ?? undefined,
    version: (row.version as number) ?? 1,
    deletedAt: row.deletedAt ? new Date(row.deletedAt as string) : undefined,
    deletedBy: (row.deletedBy as string) ?? undefined,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  };
}

function prismaRowToTombstone(row: Record<string, unknown>): Tombstone {
  return {
    id: row.id as string,
    memoryId: row.memoryId as string,
    orgId: row.orgId as string,
    repoId: row.repoId as string,
    deletedAt: new Date(row.deletedAt as string),
    deletedBy: (row.deletedBy as string) ?? undefined,
    syncedAt: row.syncedAt ? new Date(row.syncedAt as string) : undefined,
  };
}

export interface RemoteStoreOptions {
  autoEmbeddingEnabled?: boolean;
}

export class RemoteStore {
  private prisma: PrismaClient;
  private autoEmbeddingEnabled: boolean;

  constructor(connectionString: string, options: RemoteStoreOptions = {}) {
    const adapter = new PrismaPg({ connectionString });
    this.prisma = new PrismaClient({ adapter });
    this.autoEmbeddingEnabled = options.autoEmbeddingEnabled ??
      process.env.AUTO_EMBEDDING_ENABLED === "true";
  }

  async store(input: CreateMemoryInput): Promise<Memory> {
    const visibility =
      input.visibility === "auto" || !input.visibility
        ? "repo"
        : input.visibility;

    const data: Record<string, unknown> = {
      orgId: input.orgId,
      repoId: input.repoId,
      memoryType: input.memoryType,
      visibility,
      text: input.text,
      summary: input.summary,
      tags: input.tags ?? [],
      sourceRefs: (input.sourceRefs as Record<string, string>) ?? undefined,
      confidence: input.confidence,
      ttlSeconds: input.ttlSeconds,
    };

    let memory: Memory;

    if (input.id) {
      const row = await this.prisma.memory.upsert({
        where: { id: input.id },
        create: {
          id: input.id,
          ...data,
        } as Parameters<typeof this.prisma.memory.create>[0]["data"],
        update: {
          memoryType: input.memoryType,
          visibility,
          text: input.text,
          summary: input.summary,
          tags: input.tags ?? [],
          sourceRefs: (input.sourceRefs as Record<string, string>) ?? undefined,
          confidence: input.confidence,
          ttlSeconds: input.ttlSeconds,
        },
      });

      memory = prismaRowToMemory(row as unknown as Record<string, unknown>);
    } else {
      const row = await this.prisma.memory.create({
        data: data as Parameters<typeof this.prisma.memory.create>[0]["data"],
      });

      memory = prismaRowToMemory(row as unknown as Record<string, unknown>);
    }

    if (this.autoEmbeddingEnabled && isOpenAIConfigured()) {
      this.generateAndStoreEmbedding(memory.id, memory.text).catch((err) => {
        console.error(`Auto-embedding failed for ${memory.id}:`, err);
      });
    }

    return memory;
  }

  async getById(id: string): Promise<Memory | undefined> {
    const row = await this.prisma.memory.findUnique({ where: { id } });
    return row
      ? prismaRowToMemory(row as unknown as Record<string, unknown>)
      : undefined;
  }

  async recall(query: RecallQuery): Promise<RecallResult[]> {
    const k = query.k ?? 10;

    const where: Record<string, unknown> = {
      orgId: query.orgId,
      repoId: query.repoId,
    };

    if (!query.includeDeprecated) {
      where.status = "active";
    }

    if (query.types && query.types.length > 0) {
      where.memoryType = { in: query.types };
    }

    if (query.tags && query.tags.length > 0) {
      where.tags = { hasSome: query.tags };
    }

    if (query.timeRange) {
      const createdAt: Record<string, Date> = {};
      if (query.timeRange.from) createdAt.gte = query.timeRange.from;
      if (query.timeRange.to) createdAt.lte = query.timeRange.to;
      if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;
    }

    const sanitizedQuery = query.query.replace(/[^\w\s]/g, " ").trim();

    if (sanitizedQuery) {
      const ftsResults = await this.prisma.$queryRawUnsafe<
        Array<Record<string, unknown>>
      >(
        `SELECT m.*,
                ts_rank(to_tsvector('english', m.text || ' ' || coalesce(m.summary, '')),
                        plainto_tsquery('english', $1)) AS fts_rank
         FROM memories m
         WHERE to_tsvector('english', m.text || ' ' || coalesce(m.summary, ''))
               @@ plainto_tsquery('english', $1)
           AND m.org_id = $2
           AND m.repo_id = $3
           AND m.status = $4
         ORDER BY fts_rank DESC
         LIMIT $5`,
        sanitizedQuery,
        query.orgId,
        query.repoId,
        query.includeDeprecated ? "active" : "active",
        k * 2,
      );

      return ftsResults.map((row) => {
        const textScore = Math.min(
          1,
          (row.fts_rank as number) * 2,
        );
        return {
          id: row.id as string,
          memoryType: row.memory_type as Memory["memoryType"],
          text: row.text as string,
          summary: (row.summary as string) ?? undefined,
          tags: (row.tags as string[]) ?? [],
          sourceRefs: row.source_refs as Record<string, unknown> | undefined,
          score: computeCompositeScore(
            textScore,
            new Date(row.created_at as string),
            row.confidence as number | undefined,
          ),
          source: "remote" as const,
          status: row.status as Memory["status"],
          supersedesId: (row.supersedes_id as string) ?? undefined,
        };
      });
    }

    const rows = await this.prisma.memory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: k,
    });

    return rows.map((row) => ({
      id: row.id,
      memoryType: row.memoryType as Memory["memoryType"],
      text: row.text,
      summary: row.summary ?? undefined,
      tags: row.tags,
      sourceRefs: row.sourceRefs as Record<string, unknown> | undefined,
      score: computeCompositeScore(
        0.5,
        row.createdAt,
        row.confidence ?? undefined,
      ),
      source: "remote" as const,
      status: row.status as Memory["status"],
      supersedesId: row.supersedesId ?? undefined,
    }));
  }

  async list(query: ListQuery): Promise<Memory[]> {
    const where: Record<string, unknown> = {
      orgId: query.orgId,
      repoId: query.repoId,
    };

    if (query.types && query.types.length > 0) {
      where.memoryType = { in: query.types };
    }
    if (query.status && query.status.length > 0) {
      where.status = { in: query.status };
    }
    if (query.visibility && query.visibility.length > 0) {
      where.visibility = { in: query.visibility };
    }
    if (query.tags && query.tags.length > 0) {
      where.tags = { hasSome: query.tags };
    }
    if (query.search) {
      where.text = { contains: query.search, mode: "insensitive" };
    }

    const sortField =
      query.sortBy === "updatedAt"
        ? "updatedAt"
        : query.sortBy === "confidence"
          ? "confidence"
          : "createdAt";

    const rows = await this.prisma.memory.findMany({
      where,
      orderBy: { [sortField]: query.sortOrder ?? "desc" },
      take: query.limit ?? 50,
      skip: query.offset ?? 0,
    });

    return rows.map((r) =>
      prismaRowToMemory(r as unknown as Record<string, unknown>),
    );
  }

  async count(query: ListQuery): Promise<number> {
    const where: Record<string, unknown> = {
      orgId: query.orgId,
      repoId: query.repoId,
    };

    if (query.types && query.types.length > 0) {
      where.memoryType = { in: query.types };
    }
    if (query.status && query.status.length > 0) {
      where.status = { in: query.status };
    }
    if (query.visibility && query.visibility.length > 0) {
      where.visibility = { in: query.visibility };
    }
    if (query.tags && query.tags.length > 0) {
      where.tags = { hasSome: query.tags };
    }
    if (query.search) {
      where.text = { contains: query.search, mode: "insensitive" };
    }

    return this.prisma.memory.count({ where });
  }

  async stats(orgId: string, repoId: string): Promise<StoreStats> {
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        memory_type: string;
        status: string;
        visibility: string;
        cnt: bigint;
      }>
    >(
      `SELECT memory_type, status, visibility, COUNT(*) as cnt
       FROM memories WHERE org_id = $1 AND repo_id = $2
       GROUP BY memory_type, status, visibility`,
      orgId,
      repoId,
    );

    const stats: StoreStats = {
      total: 0,
      byType: { episodic: 0, semantic: 0, procedural: 0 },
      byStatus: { active: 0, deprecated: 0, superseded: 0, deleted: 0 },
      byVisibility: { private: 0, repo: 0 },
    };

    for (const row of rows) {
      const count = Number(row.cnt);
      stats.total += count;
      if (row.memory_type in stats.byType) {
        stats.byType[row.memory_type as keyof typeof stats.byType] += count;
      }
      if (row.status in stats.byStatus) {
        stats.byStatus[row.status as keyof typeof stats.byStatus] += count;
      }
      if (row.visibility in stats.byVisibility) {
        stats.byVisibility[row.visibility] += count;
      }
    }

    return stats;
  }

  async deprecate(id: string, reason?: string): Promise<boolean> {
    try {
      const existing = await this.prisma.memory.findUnique({ where: { id } });
      if (!existing) return false;

      const sourceRefs = (existing.sourceRefs as Record<string, unknown>) ?? {};
      if (reason) sourceRefs.deprecation_reason = reason;

      await this.prisma.memory.update({
        where: { id },
        data: {
          status: "deprecated",
          sourceRefs: Object.keys(sourceRefs).length > 0 ? (sourceRefs as Record<string, string>) : undefined,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async supersede(oldId: string, newId: string): Promise<boolean> {
    try {
      await this.prisma.memory.update({
        where: { id: oldId },
        data: {
          status: "superseded",
          supersedesId: newId,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async pin(id: string): Promise<boolean> {
    try {
      const existing = await this.prisma.memory.findUnique({ where: { id } });
      if (!existing) return false;

      const tags = existing.tags.includes("pinned")
        ? existing.tags
        : [...existing.tags, "pinned"];

      await this.prisma.memory.update({
        where: { id },
        data: { tags },
      });
      return true;
    } catch {
      return false;
    }
  }

  async link(input: CreateLinkInput): Promise<MemoryLink> {
    const row = await this.prisma.memoryLink.upsert({
      where: {
        sourceId_targetId_linkType: {
          sourceId: input.sourceId,
          targetId: input.targetId,
          linkType: input.linkType,
        },
      },
      create: {
        sourceId: input.sourceId,
        targetId: input.targetId,
        linkType: input.linkType,
        metadata: input.metadata as Record<string, string> | undefined,
      },
      update: {
        metadata: input.metadata as Record<string, string> | undefined,
      },
    });

    return {
      id: row.id,
      sourceId: row.sourceId,
      targetId: row.targetId,
      linkType: row.linkType as MemoryLink["linkType"],
      metadata: row.metadata as Record<string, unknown> | undefined,
      createdAt: row.createdAt,
    };
  }

  async unlink(
    sourceId: string,
    targetId: string,
    linkType: string,
  ): Promise<boolean> {
    try {
      await this.prisma.memoryLink.delete({
        where: {
          sourceId_targetId_linkType: { sourceId, targetId, linkType },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getLinks(query: LinkQuery): Promise<MemoryLink[]> {
    const where: Record<string, unknown> = {
      OR: [
        { sourceId: query.memoryId },
        { targetId: query.memoryId },
      ],
    };

    if (query.linkType) {
      where.linkType = query.linkType;
    }

    const rows = await this.prisma.memoryLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      sourceId: row.sourceId,
      targetId: row.targetId,
      linkType: row.linkType as MemoryLink["linkType"],
      metadata: row.metadata as Record<string, unknown> | undefined,
      createdAt: row.createdAt,
    }));
  }

  async getAllLinks(orgId: string, repoId: string): Promise<MemoryLink[]> {
    const rows = await this.prisma.memoryLink.findMany({
      where: {
        source: { orgId, repoId },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      sourceId: row.sourceId,
      targetId: row.targetId,
      linkType: row.linkType as MemoryLink["linkType"],
      metadata: row.metadata as Record<string, unknown> | undefined,
      createdAt: row.createdAt,
    }));
  }

  async getLinkedMemories(
    memoryId: string,
    linkType?: string,
  ): Promise<Memory[]> {
    const linkWhere: Record<string, unknown> = {
      OR: [{ sourceId: memoryId }, { targetId: memoryId }],
    };
    if (linkType) linkWhere.linkType = linkType;

    const links = await this.prisma.memoryLink.findMany({
      where: linkWhere,
      include: { source: true, target: true },
    });

    const seen = new Set<string>();
    const memories: Memory[] = [];

    for (const link of links) {
      const other =
        link.sourceId === memoryId ? link.target : link.source;
      if (!seen.has(other.id)) {
        seen.add(other.id);
        memories.push(
          prismaRowToMemory(other as unknown as Record<string, unknown>),
        );
      }
    }

    return memories;
  }

  async softDelete(input: DeleteMemoryInput): Promise<boolean> {
    try {
      const existing = await this.prisma.memory.findUnique({ where: { id: input.id } });
      if (!existing) return false;

      const newVersion = (existing.version ?? 1) + 1;

      await this.prisma.$transaction([
        this.prisma.memory.update({
          where: { id: input.id },
          data: {
            status: "deleted",
            deletedAt: new Date(),
            deletedBy: input.deletedBy,
            version: newVersion,
          },
        }),
        this.prisma.tombstone.upsert({
          where: { memoryId: input.id },
          create: {
            memoryId: input.id,
            orgId: existing.orgId,
            repoId: existing.repoId,
            deletedAt: new Date(),
            deletedBy: input.deletedBy,
          },
          update: {
            deletedAt: new Date(),
            deletedBy: input.deletedBy,
            syncedAt: null,
          },
        }),
      ]);

      return true;
    } catch {
      return false;
    }
  }

  async hardDelete(id: string): Promise<boolean> {
    try {
      await this.prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async restore(id: string): Promise<boolean> {
    try {
      const result = await this.prisma.$transaction([
        this.prisma.memory.update({
          where: { id, status: "deleted" },
          data: {
            status: "active",
            deletedAt: null,
            deletedBy: null,
            version: { increment: 1 },
          },
        }),
        this.prisma.tombstone.delete({
          where: { memoryId: id },
        }),
      ]);
      return result[0] !== null;
    } catch {
      return false;
    }
  }

  async getTombstones(orgId: string, repoId: string, sinceSyncedAt?: Date): Promise<Tombstone[]> {
    const where: Record<string, unknown> = { orgId, repoId };

    if (sinceSyncedAt) {
      where.OR = [
        { syncedAt: null },
        { syncedAt: { gt: sinceSyncedAt } },
      ];
    } else {
      where.syncedAt = null;
    }

    const rows = await this.prisma.tombstone.findMany({
      where,
      orderBy: { deletedAt: "asc" },
    });

    return rows.map((r) => prismaRowToTombstone(r as unknown as Record<string, unknown>));
  }

  async getUnsyncedTombstones(orgId: string, repoId: string): Promise<Tombstone[]> {
    const rows = await this.prisma.tombstone.findMany({
      where: { orgId, repoId, syncedAt: null },
      orderBy: { deletedAt: "asc" },
    });

    return rows.map((r) => prismaRowToTombstone(r as unknown as Record<string, unknown>));
  }

  async markTombstoneSynced(memoryId: string): Promise<boolean> {
    try {
      await this.prisma.tombstone.update({
        where: { memoryId },
        data: { syncedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  async applyTombstone(tombstone: Tombstone): Promise<boolean> {
    try {
      const existing = await this.prisma.memory.findUnique({ where: { id: tombstone.memoryId } });

      if (!existing) {
        await this.prisma.tombstone.upsert({
          where: { memoryId: tombstone.memoryId },
          create: {
            memoryId: tombstone.memoryId,
            orgId: tombstone.orgId,
            repoId: tombstone.repoId,
            deletedAt: tombstone.deletedAt,
            deletedBy: tombstone.deletedBy,
            syncedAt: new Date(),
          },
          update: {
            deletedAt: tombstone.deletedAt,
            deletedBy: tombstone.deletedBy,
            syncedAt: new Date(),
          },
        });
        return true;
      }

      return this.softDelete({
        id: tombstone.memoryId,
        deletedBy: tombstone.deletedBy,
      });
    } catch {
      return false;
    }
  }

  async getModifiedSince(orgId: string, repoId: string, since: Date): Promise<Memory[]> {
    const rows = await this.prisma.memory.findMany({
      where: {
        orgId,
        repoId,
        updatedAt: { gt: since },
      },
      orderBy: { updatedAt: "asc" },
    });

    return rows.map((r) => prismaRowToMemory(r as unknown as Record<string, unknown>));
  }

  async upsertFromLocal(memory: Memory): Promise<{ action: "created" | "updated" | "skipped"; conflict: boolean }> {
    const existing = await this.prisma.memory.findUnique({ where: { id: memory.id } });

    if (!existing) {
      await this.prisma.memory.create({
        data: {
          id: memory.id,
          orgId: memory.orgId,
          repoId: memory.repoId,
          scopeType: memory.scopeType ?? "repo",
          memoryType: memory.memoryType,
          visibility: memory.visibility,
          status: memory.status,
          text: memory.text,
          summary: memory.summary,
          tags: memory.tags ?? [],
          sourceRefs: memory.sourceRefs as Record<string, string> | undefined,
          confidence: memory.confidence,
          ttlSeconds: memory.ttlSeconds,
          supersedesId: memory.supersedesId,
          version: memory.version ?? 1,
          deletedAt: memory.deletedAt,
          deletedBy: memory.deletedBy,
          createdAt: memory.createdAt,
        },
      });
      return { action: "created", conflict: false };
    }

    const remoteVersion = existing.version ?? 1;
    const localVersion = memory.version ?? 1;

    if (localVersion <= remoteVersion) {
      if (memory.updatedAt <= existing.updatedAt) {
        return { action: "skipped", conflict: false };
      }
    }

    const hasConflict = localVersion !== remoteVersion && existing.updatedAt > memory.updatedAt;

    await this.prisma.memory.update({
      where: { id: memory.id },
      data: {
        memoryType: memory.memoryType,
        visibility: memory.visibility,
        status: memory.status,
        text: memory.text,
        summary: memory.summary,
        tags: memory.tags ?? [],
        sourceRefs: memory.sourceRefs as Record<string, string> | undefined,
        confidence: memory.confidence,
        ttlSeconds: memory.ttlSeconds,
        supersedesId: memory.supersedesId,
        version: Math.max(remoteVersion, localVersion) + 1,
        deletedAt: memory.deletedAt,
        deletedBy: memory.deletedBy,
      },
    });

    return { action: "updated", conflict: hasConflict };
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async validateApiKey(key: string): Promise<{ id: string; orgId: string; name: string } | null> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key },
    });

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: apiKey.id,
      orgId: apiKey.orgId,
      name: apiKey.name,
    };
  }

  async createApiKey(name: string, orgId: string): Promise<{ id: string; key: string; name: string; orgId: string }> {
    const key = `hk_${crypto.randomUUID().replace(/-/g, "")}`;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        key,
        name,
        orgId,
      },
    });

    return {
      id: apiKey.id,
      key: apiKey.key,
      name: apiKey.name,
      orgId: apiKey.orgId,
    };
  }

  async listApiKeys(orgId?: string): Promise<Array<{ id: string; key: string; name: string; orgId: string; isActive: boolean; createdAt: Date; lastUsedAt: Date | null }>> {
    const where = orgId ? { orgId } : {};

    const keys = await this.prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        key: true,
        name: true,
        orgId: true,
        isActive: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return keys;
  }

  async revokeApiKey(id: string): Promise<boolean> {
    try {
      await this.prisma.apiKey.update({
        where: { id },
        data: { isActive: false },
      });
      return true;
    } catch {
      return false;
    }
  }

  async toggleApiKey(id: string): Promise<{ isActive: boolean } | null> {
    try {
      const existing = await this.prisma.apiKey.findUnique({ where: { id } });
      if (!existing) return null;

      const updated = await this.prisma.apiKey.update({
        where: { id },
        data: { isActive: !existing.isActive },
      });

      return { isActive: updated.isActive };
    } catch {
      return null;
    }
  }

  async deleteApiKey(id: string): Promise<boolean> {
    try {
      await this.prisma.apiKey.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async storeEmbedding(
    memoryId: string,
    embedding: number[],
    model: string
  ): Promise<void> {
    const embeddingBytes = Buffer.from(serializeEmbedding(embedding));
    const vectorStr = embeddingToPgVector(embedding);

    await this.prisma.$executeRaw`
      INSERT INTO memory_embeddings (memory_id, embedding, embedding_vector, model, created_at)
      VALUES (${memoryId}::uuid, ${embeddingBytes}, ${vectorStr}::vector, ${model}, NOW())
      ON CONFLICT (memory_id) DO UPDATE SET
        embedding = ${embeddingBytes},
        embedding_vector = ${vectorStr}::vector,
        model = ${model},
        created_at = NOW()
    `;
  }

  async generateAndStoreEmbedding(
    memoryId: string,
    text: string,
    config?: EmbeddingConfig
  ): Promise<void> {
    try {
      const result = await generateEmbedding(text, config);
      await this.storeEmbedding(memoryId, result.embedding, result.model);
    } catch (error) {
      console.error(`Failed to generate embedding for ${memoryId}:`, error);
    }
  }

  async getEmbedding(memoryId: string): Promise<number[] | undefined> {
    const result = await this.prisma.memoryEmbedding.findUnique({
      where: { memoryId },
      select: { embedding: true },
    });

    if (!result) return undefined;
    return deserializeEmbedding(Buffer.from(result.embedding));
  }

  async hasEmbedding(memoryId: string): Promise<boolean> {
    const count = await this.prisma.memoryEmbedding.count({
      where: { memoryId },
    });
    return count > 0;
  }

  async recallWithEmbeddings(
    query: RecallQuery,
    queryEmbedding?: number[]
  ): Promise<RecallResult[]> {
    const ftsResults = await this.recall(query);

    if (!queryEmbedding) {
      return ftsResults;
    }

    const vectorStr = embeddingToPgVector(queryEmbedding);
    const k = query.k ?? 10;

    const embeddingResults = await this.prisma.$queryRaw<
      Array<{
        memory_id: string;
        similarity: number;
      }>
    >`
      SELECT 
        e.memory_id,
        1 - (e.embedding_vector <=> ${vectorStr}::vector) as similarity
      FROM memory_embeddings e
      JOIN memories m ON e.memory_id = m.id
      WHERE m.org_id = ${query.orgId}
        AND m.repo_id = ${query.repoId}
        AND m.status = 'active'
      ORDER BY e.embedding_vector <=> ${vectorStr}::vector
      LIMIT ${k * 2}
    `;

    const embeddingScores = new Map<string, number>();
    for (const row of embeddingResults) {
      embeddingScores.set(row.memory_id, Math.max(0, row.similarity));
    }

    const ftsIds = new Set(ftsResults.map((r) => r.id));
    const additionalMemories: RecallResult[] = [];

    for (const row of embeddingResults) {
      if (ftsIds.has(row.memory_id) || row.similarity < 0.3) continue;

      const memory = await this.getById(row.memory_id);
      if (!memory || memory.status !== "active") continue;

      additionalMemories.push({
        id: memory.id,
        memoryType: memory.memoryType,
        text: memory.text,
        summary: memory.summary,
        tags: memory.tags,
        sourceRefs: memory.sourceRefs,
        score: computeHybridScore(0, row.similarity, memory.createdAt, memory.confidence),
        source: "remote",
        status: memory.status,
        supersedesId: memory.supersedesId,
      });
    }

    const hybridResults = ftsResults.map((r) => {
      const embScore = embeddingScores.get(r.id) ?? 0;
      return {
        ...r,
        score: embScore > 0
          ? computeHybridScore(r.score * 0.6, embScore, new Date(), undefined)
          : r.score,
      };
    });

    const combined = [...hybridResults, ...additionalMemories];
    return combined.sort((a, b) => b.score - a.score).slice(0, k);
  }

  async getMemoriesWithoutEmbeddings(
    orgId: string,
    repoId: string
  ): Promise<Memory[]> {
    const memories = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT m.* FROM memories m
      LEFT JOIN memory_embeddings e ON m.id = e.memory_id
      WHERE m.org_id = ${orgId}
        AND m.repo_id = ${repoId}
        AND m.status = 'active'
        AND e.memory_id IS NULL
    `;

    return memories.map(prismaRowToMemory);
  }

  async recordUsage(
    memoryId: string,
    query?: string,
    sessionId?: string
  ): Promise<void> {
    await this.prisma.memoryUsage.create({
      data: {
        memoryId,
        query,
        sessionId,
      },
    });
  }

  async recordUsageBatch(
    memoryIds: string[],
    query?: string,
    sessionId?: string
  ): Promise<void> {
    await this.prisma.memoryUsage.createMany({
      data: memoryIds.map((memoryId) => ({
        memoryId,
        query,
        sessionId,
      })),
    });
  }

  async getUsageStats(
    orgId: string,
    repoId: string
  ): Promise<Array<{ memoryId: string; count: number; lastUsed: Date }>> {
    const stats = await this.prisma.$queryRaw<
      Array<{ memory_id: string; count: bigint; last_used: Date }>
    >`
      SELECT 
        u.memory_id,
        COUNT(*) as count,
        MAX(u.recalled_at) as last_used
      FROM memory_usage u
      JOIN memories m ON u.memory_id = m.id
      WHERE m.org_id = ${orgId} AND m.repo_id = ${repoId}
      GROUP BY u.memory_id
      ORDER BY count DESC
    `;

    return stats.map((row) => ({
      memoryId: row.memory_id,
      count: Number(row.count),
      lastUsed: row.last_used,
    }));
  }

  async getEmbeddingStats(
    orgId: string,
    repoId: string
  ): Promise<{ total: number; withEmbedding: number; withoutEmbedding: number }> {
    const result = await this.prisma.$queryRaw<
      Array<{ total: bigint; with_embedding: bigint }>
    >`
      SELECT 
        COUNT(m.id) as total,
        COUNT(e.memory_id) as with_embedding
      FROM memories m
      LEFT JOIN memory_embeddings e ON m.id = e.memory_id
      WHERE m.org_id = ${orgId} AND m.repo_id = ${repoId} AND m.status = 'active'
    `;

    const row = result[0];
    const total = Number(row?.total ?? 0);
    const withEmbedding = Number(row?.with_embedding ?? 0);

    return {
      total,
      withEmbedding,
      withoutEmbedding: total - withEmbedding,
    };
  }

  async findSimilar(query: FindSimilarQuery): Promise<RecallResult[]> {
    const { orgId, repoId, memoryId, threshold = 0.3, k = 10 } = query;

    const memory = await this.getById(memoryId);
    if (!memory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    const embedding = await this.getEmbedding(memoryId);

    if (embedding) {
      const vectorStr = embeddingToPgVector(embedding);

      const results = await this.prisma.$queryRaw<
        Array<{
          id: string;
          memory_type: string;
          text: string;
          summary: string | null;
          tags: string[];
          source_refs: Record<string, unknown> | null;
          confidence: number | null;
          status: string;
          supersedes_id: string | null;
          created_at: Date;
          similarity: number;
        }>
      >`
        SELECT 
          m.id,
          m.memory_type,
          m.text,
          m.summary,
          m.tags,
          m.source_refs,
          m.confidence,
          m.status,
          m.supersedes_id,
          m.created_at,
          1 - (e.embedding_vector <=> ${vectorStr}::vector) as similarity
        FROM memories m
        JOIN memory_embeddings e ON m.id = e.memory_id
        WHERE m.org_id = ${orgId}
          AND m.repo_id = ${repoId}
          AND m.status = 'active'
          AND m.id != ${memoryId}
        ORDER BY e.embedding_vector <=> ${vectorStr}::vector
        LIMIT ${k + 1}
      `;

      return results
        .filter((r) => r.similarity >= threshold)
        .slice(0, k)
        .map((r) => ({
          id: r.id,
          memoryType: r.memory_type as Memory["memoryType"],
          text: r.text,
          summary: r.summary ?? undefined,
          tags: r.tags ?? [],
          sourceRefs: r.source_refs ?? undefined,
          score: r.similarity,
          source: "remote" as const,
          status: r.status as Memory["status"],
          supersedesId: r.supersedes_id ?? undefined,
        }));
    }

    const results = await this.recall({
      orgId,
      repoId,
      query: memory.text,
      k: k + 1,
    });

    return results
      .filter((r) => r.id !== memoryId && r.score >= threshold)
      .slice(0, k);
  }

  async consolidateMemories(
    input: ConsolidateMemoriesInput
  ): Promise<ConsolidateMemoriesResult> {
    const {
      orgId,
      repoId,
      sourceIds,
      consolidatedText,
      memoryType,
      tags,
      preserveOriginals = true,
    } = input;

    if (sourceIds.length < 2) {
      throw new Error("At least 2 source memories are required for consolidation");
    }

    const sourceMemories: Memory[] = [];
    for (const id of sourceIds) {
      const memory = await this.getById(id);
      if (memory) {
        sourceMemories.push(memory);
      }
    }

    if (sourceMemories.length !== sourceIds.length) {
      const foundIds = sourceMemories.map((m) => m.id);
      const missingIds = sourceIds.filter((id) => !foundIds.includes(id));
      throw new Error(`Source memories not found: ${missingIds.join(", ")}`);
    }

    const inferredType = memoryType ?? this.inferMemoryType(sourceMemories);
    const mergedTags = tags ?? this.mergeTags(sourceMemories);
    const inheritedVisibility = sourceMemories.some((m) => m.visibility === "repo")
      ? "repo"
      : "private";

    const sourceRefs: Record<string, unknown> = {
      consolidated_from: sourceIds,
      consolidation_version: 1,
    };

    const consolidated = await this.store({
      orgId,
      repoId,
      memoryType: inferredType,
      visibility: inheritedVisibility,
      text: consolidatedText,
      tags: mergedTags,
      sourceRefs,
      confidence: 0.8,
    });

    for (const sourceId of sourceIds) {
      try {
        await this.link({
          sourceId: consolidated.id,
          targetId: sourceId,
          linkType: "derived_from",
        });

        if (!preserveOriginals) {
          await this.supersede(sourceId, consolidated.id);
        }
      } catch {
        // Best effort linking
      }
    }

    return {
      consolidatedId: consolidated.id,
      version: 1,
      sourcesPreserved: preserveOriginals ? sourceIds.length : 0,
      sourceIds,
    };
  }

  private inferMemoryType(memories: Memory[]): MemoryType {
    const typeCount: Record<string, number> = {};
    for (const m of memories) {
      typeCount[m.memoryType] = (typeCount[m.memoryType] || 0) + 1;
    }

    const sorted = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
    if (sorted[0]) {
      return sorted[0][0] as MemoryType;
    }

    return "semantic";
  }

  private mergeTags(memories: Memory[]): string[] {
    const allTags = new Set<string>();
    for (const m of memories) {
      for (const tag of m.tags) {
        allTags.add(tag);
      }
    }
    return Array.from(allTags);
  }

  async getTopUsedMemories(
    orgId: string,
    repoId: string,
    limit = 10
  ): Promise<Array<{ memory: Memory; usageCount: number }>> {
    const stats = await this.getUsageStats(orgId, repoId);
    const topStats = stats.slice(0, limit);

    const results: Array<{ memory: Memory; usageCount: number }> = [];
    for (const stat of topStats) {
      const memory = await this.getById(stat.memoryId);
      if (memory) {
        results.push({ memory, usageCount: stat.count });
      }
    }

    return results;
  }
}

import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import type {
  Memory,
  MemoryLink,
  CreateMemoryInput,
  CreateLinkInput,
  LinkQuery,
  RecallQuery,
  RecallResult,
  ListQuery,
  StoreStats,
  Tombstone,
  DeleteMemoryInput,
} from "../core/types.js";
import { computeCompositeScore } from "../core/recall.js";

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

export class RemoteStore {
  private prisma: PrismaClient;

  constructor(connectionString: string) {
    const adapter = new PrismaPg({ connectionString });
    this.prisma = new PrismaClient({ adapter });
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

      return prismaRowToMemory(row as unknown as Record<string, unknown>);
    }

    const row = await this.prisma.memory.create({
      data: data as Parameters<typeof this.prisma.memory.create>[0]["data"],
    });

    return prismaRowToMemory(row as unknown as Record<string, unknown>);
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

  async listApiKeys(orgId?: string): Promise<Array<{ id: string; name: string; orgId: string; isActive: boolean; createdAt: Date; lastUsedAt: Date | null }>> {
    const where = orgId ? { orgId } : {};

    const keys = await this.prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
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
}

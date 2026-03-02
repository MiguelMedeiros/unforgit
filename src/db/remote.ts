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
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
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

    const row = await this.prisma.memory.create({
      data: {
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
      },
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
      byStatus: { active: 0, deprecated: 0, superseded: 0 },
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
    const row = await this.prisma.memoryLink.create({
      data: {
        sourceId: input.sourceId,
        targetId: input.targetId,
        linkType: input.linkType,
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

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

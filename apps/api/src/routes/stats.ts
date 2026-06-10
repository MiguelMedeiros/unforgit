import type { FastifyInstance } from "fastify";
import { RemoteStore } from "unforgit-db";

interface StatsQuery {
  orgId: string;
  repoId: string;
  timeframe?: string;
}

interface ActivityQuery {
  orgId: string;
  repoId: string;
  days?: string;
  timeframe?: string;
}

interface TagsQuery {
  orgId: string;
  repoId: string;
  limit?: string;
  timeframe?: string;
}

function getTimeframeDate(timeframe?: string): Date | undefined {
  if (!timeframe) return undefined;

  const now = new Date();
  switch (timeframe) {
    case "1d":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "1w":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "1m":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "3m":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "6m":
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    case "1y":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return undefined;
  }
}

export async function statsRoutes(
  app: FastifyInstance,
  store: RemoteStore
): Promise<void> {
  app.get<{ Querystring: StatsQuery }>(
    "/v1/stats",
    async (request, reply) => {
      const { orgId, repoId, timeframe } = request.query;

      if (!orgId || !repoId) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "orgId and repoId are required",
        });
      }

      const stats = await store.stats(orgId, repoId);

      return reply.send({
        stats,
        timeframe: timeframe ?? "all",
      });
    }
  );

  app.get<{ Querystring: ActivityQuery }>(
    "/v1/stats/activity",
    async (request, reply) => {
      const { orgId, repoId, days: daysStr, timeframe } = request.query;

      if (!orgId || !repoId) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "orgId and repoId are required",
        });
      }

      const days = daysStr ? parseInt(daysStr, 10) : 365;
      const sinceDate = getTimeframeDate(timeframe);

      const [dailyCounts, hourlyCounts, weeklyTrend] = await Promise.all([
        store.dailyCounts(orgId, repoId, days, sinceDate),
        store.hourlyCounts(orgId, repoId),
        store.weeklyTrend(orgId, repoId, 52),
      ]);

      return reply.send({
        dailyCounts,
        hourlyCounts,
        weeklyTrend,
        timeframe: timeframe ?? "all",
      });
    }
  );

  app.get<{ Querystring: TagsQuery }>(
    "/v1/stats/tags",
    async (request, reply) => {
      const { orgId, repoId, limit: limitStr, timeframe } = request.query;

      if (!orgId || !repoId) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "orgId and repoId are required",
        });
      }

      const limit = limitStr ? parseInt(limitStr, 10) : 20;
      const sinceDate = getTimeframeDate(timeframe);

      const tags = await store.topTags(orgId, repoId, limit, sinceDate);

      return reply.send({
        tags,
        timeframe: timeframe ?? "all",
      });
    }
  );
}

import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { RemoteStore } from "@unforgit/db";
import { memoryRoutes } from "./routes/memory.js";
import { recallRoutes } from "./routes/recall.js";
import { curateRoutes } from "./routes/curate.js";
import { consolidateRoutes } from "./routes/consolidate.js";
import { linkRoutes } from "./routes/links.js";
import { syncRoutes } from "./routes/sync.js";
import { apiKeyRoutes } from "./routes/api-keys.js";
import { embeddingRoutes } from "./routes/embeddings.js";
import { autoConsolidateRoutes } from "./routes/auto-consolidate.js";
import { suggestionsRoutes } from "./routes/suggestions.js";
import { healthRoutes } from "./routes/health.js";
import { adminRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { statsRoutes } from "./routes/stats.js";
import { registerAuthMiddleware } from "./middleware/auth.js";
import {
  isOpenAIConfigured,
  resolveLifecycleConfig,
  runRemoteLifecycleMaintenance,
  LifecycleScheduler,
} from "@unforgit/core";

export async function buildApp(connectionString: string) {
  const app = Fastify({ logger: true });
  await app.register(cors);
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.ip,
    allowList: (request) => request.url === "/health",
  });

  const store = new RemoteStore(connectionString);
  const maintenanceConfig = resolveLifecycleConfig().maintenance;
  const lifecycleScheduler = new LifecycleScheduler(
    async (orgId, repoId) => {
      await runRemoteLifecycleMaintenance(store, orgId, repoId, {
        dryRun: false,
        preserveOriginals: true,
      });
    },
    {
      debounceMs: maintenanceConfig.debounceMs,
      onError: (error, context) => {
        app.log.error(
          `Lifecycle hook failed for ${context.orgId}/${context.repoId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      },
    },
  );
  const scheduleLifecycleOnStore = maintenanceConfig.autoRunOnStore
    ? (orgId: string, repoId: string) => lifecycleScheduler.schedule(orgId, repoId)
    : undefined;
  const scheduleLifecycleOnRecall = maintenanceConfig.autoRunOnRecall
    ? (orgId: string, repoId: string) => lifecycleScheduler.schedule(orgId, repoId)
    : undefined;

  registerAuthMiddleware(app, store);

  await memoryRoutes(app, store, scheduleLifecycleOnStore);
  await recallRoutes(app, store, scheduleLifecycleOnRecall);
  await curateRoutes(app, store);
  await consolidateRoutes(app, store);
  await linkRoutes(app, store);
  await app.register(syncRoutes, { store });
  await app.register(apiKeyRoutes, { store });

  await embeddingRoutes(app, store);
  await autoConsolidateRoutes(app, store);
  await suggestionsRoutes(app, store);
  await healthRoutes(app, store);
  await statsRoutes(app, store);
  await app.register(adminRoutes, { store });
  await app.register(authRoutes, { store });

  app.get("/health", async () => ({
    status: "ok",
    capabilities: {
      semanticSearch: isOpenAIConfigured(),
      autoConsolidation: isOpenAIConfigured(),
      autoEmbedding: process.env.AUTO_EMBEDDING_ENABLED === "true",
    },
  }));

  app.addHook("onClose", async () => {
    lifecycleScheduler.dispose();
    await store.disconnect();
  });

  return app;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const port = parseInt(process.env.PORT ?? "3737", 10);
  const host = process.env.HOST ?? "0.0.0.0";

  const app = await buildApp(connectionString);

  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();

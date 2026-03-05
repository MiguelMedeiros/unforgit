import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { RemoteStore } from "../db/remote.js";
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
import { registerAuthMiddleware } from "./middleware/auth.js";
import { isOpenAIConfigured } from "../core/embeddings.js";

export async function buildApp(connectionString: string) {
  const app = Fastify({ logger: true });
  await app.register(cors);

  const store = new RemoteStore(connectionString);

  registerAuthMiddleware(app, store);

  await memoryRoutes(app, store);
  await recallRoutes(app, store);
  await curateRoutes(app, store);
  await consolidateRoutes(app, store);
  await linkRoutes(app, store);
  await app.register(syncRoutes, { store });
  await app.register(apiKeyRoutes, { store });

  await embeddingRoutes(app, store);
  await autoConsolidateRoutes(app, store);
  await suggestionsRoutes(app, store);
  await healthRoutes(app, store);
  await app.register(adminRoutes, { store });

  app.get("/health", async () => ({
    status: "ok",
    capabilities: {
      semanticSearch: isOpenAIConfigured(),
      autoConsolidation: isOpenAIConfigured(),
      autoEmbedding: process.env.AUTO_EMBEDDING_ENABLED === "true",
    },
  }));

  app.addHook("onClose", async () => {
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

import { NextResponse } from "next/server";
import { getLocalStore, getConfig } from "@/lib/stores";
import { generateEmbedding } from "unforgit-core";

export async function POST() {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Unforgit not initialized" },
      { status: 500 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured", success: false },
      { status: 400 },
    );
  }

  const local = getLocalStore();
  if (!local) {
    return NextResponse.json(
      { error: "Local store not available" },
      { status: 500 },
    );
  }

  try {
    const memories = local.getMemoriesWithoutEmbeddings(
      config.remote.orgId,
      config.remote.repoId
    );

    if (memories.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "All memories already have embeddings",
      });
    }

    let processed = 0;
    let errors = 0;

    const batchSize = 5;
    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (memory) => {
          try {
            const result = await generateEmbedding(memory.text, { apiKey });
            await local.storeEmbedding(memory.id, result.embedding, result.model);
            processed++;
          } catch (err) {
            console.error(`Embedding error for ${memory.id}:`, err);
            errors++;
          }
        })
      );

      if (i + batchSize < memories.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      total: memories.length,
    });
  } catch (error) {
    console.error("Backfill failed:", error);
    return NextResponse.json(
      { error: "Backfill failed", success: false },
      { status: 500 },
    );
  }
}

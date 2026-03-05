import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokensUsed: number;
}

export interface EmbeddingConfig {
  apiKey?: string;
  model?: string;
}

let cachedClient: OpenAI | null = null;

/**
 * Check if OpenAI API key is configured.
 * Use this to gracefully skip embedding-related features when not available.
 */
export function isOpenAIConfigured(apiKey?: string): boolean {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  return !!key && key !== "sk-your-api-key-here" && key.startsWith("sk-");
}

/**
 * Get the OpenAI client. Throws if not configured.
 */
function getClient(apiKey?: string): OpenAI {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OpenAI API key not configured. Set OPENAI_API_KEY environment variable or pass apiKey option. " +
      "Semantic search features are disabled. Hippocampus will use FTS-only search."
    );
  }
  if (!cachedClient || apiKey) {
    cachedClient = new OpenAI({ apiKey: key });
  }
  return cachedClient;
}

export async function generateEmbedding(
  text: string,
  config?: EmbeddingConfig
): Promise<EmbeddingResult> {
  const client = getClient(config?.apiKey);
  const model = config?.model ?? EMBEDDING_MODEL;

  const cleanText = text.trim().slice(0, 8000);

  const response = await client.embeddings.create({
    model,
    input: cleanText,
  });

  const data = response.data[0];
  if (!data?.embedding) {
    throw new Error("OpenAI returned empty embedding");
  }

  return {
    embedding: data.embedding,
    model,
    tokensUsed: response.usage?.total_tokens ?? 0,
  };
}

export async function generateEmbeddings(
  texts: string[],
  config?: EmbeddingConfig
): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return [];

  const client = getClient(config?.apiKey);
  const model = config?.model ?? EMBEDDING_MODEL;

  const cleanTexts = texts.map((t) => t.trim().slice(0, 8000));

  const response = await client.embeddings.create({
    model,
    input: cleanTexts,
  });

  return response.data.map((item) => ({
    embedding: item.embedding,
    model,
    tokensUsed: Math.floor((response.usage?.total_tokens ?? 0) / texts.length),
  }));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Embedding dimensions mismatch: ${a.length} vs ${b.length}`
    );
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

export function serializeEmbedding(embedding: number[]): Buffer {
  const buffer = Buffer.alloc(embedding.length * 4);
  for (let i = 0; i < embedding.length; i++) {
    buffer.writeFloatLE(embedding[i], i * 4);
  }
  return buffer;
}

export function deserializeEmbedding(buffer: Buffer): number[] {
  const embedding: number[] = [];
  const count = buffer.length / 4;
  for (let i = 0; i < count; i++) {
    embedding.push(buffer.readFloatLE(i * 4));
  }
  return embedding;
}

export function embeddingToBase64(embedding: number[]): string {
  return serializeEmbedding(embedding).toString("base64");
}

export function base64ToEmbedding(base64: string): number[] {
  return deserializeEmbedding(Buffer.from(base64, "base64"));
}

export function embeddingToPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export function pgVectorToEmbedding(pgVector: string): number[] {
  const cleaned = pgVector.replace(/^\[|\]$/g, "");
  return cleaned.split(",").map((n) => parseFloat(n));
}

export function findTopKSimilar(
  queryEmbedding: number[],
  candidates: Array<{ id: string; embedding: number[] }>,
  k: number,
  threshold = 0
): Array<{ id: string; similarity: number }> {
  const scored = candidates.map((c) => ({
    id: c.id,
    similarity: cosineSimilarity(queryEmbedding, c.embedding),
  }));

  return scored
    .filter((s) => s.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

export const EMBEDDING_DIMENSIONS_MAP: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "text-embedding-ada-002": 1536,
};

export function getEmbeddingDimensions(model: string): number {
  return EMBEDDING_DIMENSIONS_MAP[model] ?? EMBEDDING_DIMENSIONS;
}

export async function isEmbeddingsAvailable(apiKey?: string): Promise<boolean> {
  try {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) return false;
    return true;
  } catch {
    return false;
  }
}

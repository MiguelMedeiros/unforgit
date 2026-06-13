import OpenAI from "openai";
import { createHash } from "node:crypto";

const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const OPENAI_EMBEDDING_DIMENSIONS = 1536;
export const LOCAL_EMBEDDING_MODEL = "local-hash-multilingual-v1";
const LOCAL_EMBEDDING_DIMENSIONS = 384;

export type EmbeddingProviderName = "auto" | "local" | "openai" | "disabled";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokensUsed: number;
  provider?: Exclude<EmbeddingProviderName, "auto" | "disabled">;
}

export interface EmbeddingConfig {
  apiKey?: string;
  model?: string;
  provider?: EmbeddingProviderName;
}

export interface ResolvedEmbeddingProvider {
  provider: Exclude<EmbeddingProviderName, "auto">;
  model: string;
  dimensions: number;
  available: boolean;
  reason?: string;
}

let cachedClient: OpenAI | null = null;

/**
 * Check if OpenAI API key is configured.
 * Use this to gracefully skip OpenAI-only features when not available.
 */
export function isOpenAIConfigured(apiKey?: string): boolean {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  return !!key && key !== "sk-you...here" && key.startsWith("sk-");
}

export function resolveEmbeddingProvider(config?: EmbeddingConfig): ResolvedEmbeddingProvider {
  const requested = config?.provider ?? "auto";
  const openaiAvailable = isOpenAIConfigured(config?.apiKey);

  if (requested === "disabled") {
    return {
      provider: "disabled",
      model: config?.model ?? "disabled",
      dimensions: 0,
      available: false,
      reason: "Embeddings are disabled by configuration.",
    };
  }

  if (requested === "openai") {
    const model = config?.model ?? OPENAI_EMBEDDING_MODEL;
    return {
      provider: "openai",
      model,
      dimensions: getEmbeddingDimensions(model),
      available: openaiAvailable,
      reason: openaiAvailable ? undefined : "OPENAI_API_KEY is not configured.",
    };
  }

  if (requested === "local") {
    return {
      provider: "local",
      model: config?.model ?? LOCAL_EMBEDDING_MODEL,
      dimensions: LOCAL_EMBEDDING_DIMENSIONS,
      available: true,
    };
  }

  if (openaiAvailable && config?.model && config.model.startsWith("text-embedding-")) {
    return {
      provider: "openai",
      model: config.model,
      dimensions: getEmbeddingDimensions(config.model),
      available: true,
    };
  }

  return {
    provider: "local",
    model: config?.model && !config.model.startsWith("text-embedding-")
      ? config.model
      : LOCAL_EMBEDDING_MODEL,
    dimensions: LOCAL_EMBEDDING_DIMENSIONS,
    available: true,
  };
}

/**
 * Get the OpenAI client. Throws if not configured.
 */
function getClient(apiKey?: string): OpenAI {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OpenAI API key not configured. Set OPENAI_API_KEY environment variable or use embeddings.provider=local. " +
      "Unforgit can generate local embeddings without cloud credentials."
    );
  }
  if (!cachedClient || apiKey) {
    cachedClient = new OpenAI({ apiKey: key });
  }
  return cachedClient;
}

function hashToUint32(value: string): number {
  const digest = createHash("sha256").update(value).digest();
  return digest.readUInt32LE(0);
}

function normalizeToken(token: string): string {
  return token.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function featuresForText(text: string): string[] {
  const words = text
    .split(/[^\p{L}\p{N}_-]+/u)
    .map(normalizeToken)
    .filter((token) => token.length > 1);
  const features: string[] = [];
  for (const word of words) {
    features.push(`w:${word}`);
    if (word.length > 4) {
      for (let i = 0; i <= word.length - 3; i++) {
        features.push(`g:${word.slice(i, i + 3)}`);
      }
    }
  }
  for (let i = 0; i < words.length - 1; i++) {
    features.push(`b:${words[i]} ${words[i + 1]}`);
  }
  return features.length > 0 ? features : ["empty"];
}

function generateLocalEmbedding(text: string, model = LOCAL_EMBEDDING_MODEL): EmbeddingResult {
  const vector = new Array<number>(LOCAL_EMBEDDING_DIMENSIONS).fill(0);
  for (const feature of featuresForText(text.trim().slice(0, 8000))) {
    const bucket = hashToUint32(`${model}:bucket:${feature}`) % LOCAL_EMBEDDING_DIMENSIONS;
    const sign = hashToUint32(`${model}:sign:${feature}`) % 2 === 0 ? 1 : -1;
    vector[bucket] += sign;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  const embedding = magnitude > 0 ? vector.map((value) => value / magnitude) : vector;
  return {
    embedding,
    model,
    provider: "local",
    tokensUsed: 0,
  };
}

export async function generateEmbedding(
  text: string,
  config?: EmbeddingConfig
): Promise<EmbeddingResult> {
  const resolved = resolveEmbeddingProvider(config);
  if (resolved.provider === "disabled") {
    throw new Error("Embeddings are disabled by configuration.");
  }
  if (resolved.provider === "local") {
    return generateLocalEmbedding(text, resolved.model);
  }

  const client = getClient(config?.apiKey);
  const model = resolved.model;

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
    provider: "openai",
    tokensUsed: response.usage?.total_tokens ?? 0,
  };
}

export async function generateEmbeddings(
  texts: string[],
  config?: EmbeddingConfig
): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return [];

  const resolved = resolveEmbeddingProvider(config);
  if (resolved.provider === "disabled") {
    throw new Error("Embeddings are disabled by configuration.");
  }
  if (resolved.provider === "local") {
    return texts.map((text) => generateLocalEmbedding(text, resolved.model));
  }

  const client = getClient(config?.apiKey);
  const model = resolved.model;

  const cleanTexts = texts.map((t) => t.trim().slice(0, 8000));

  const response = await client.embeddings.create({
    model,
    input: cleanTexts,
  });

  return response.data.map((item) => ({
    embedding: item.embedding,
    model,
    provider: "openai" as const,
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
  [LOCAL_EMBEDDING_MODEL]: LOCAL_EMBEDDING_DIMENSIONS,
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "text-embedding-ada-002": 1536,
};

export function getEmbeddingDimensions(model: string): number {
  return EMBEDDING_DIMENSIONS_MAP[model] ?? (
    model.startsWith("local-") ? LOCAL_EMBEDDING_DIMENSIONS : OPENAI_EMBEDDING_DIMENSIONS
  );
}

export async function isEmbeddingsAvailable(config?: EmbeddingConfig | string): Promise<boolean> {
  try {
    const resolved = typeof config === "string"
      ? resolveEmbeddingProvider({ apiKey: config, provider: "openai" })
      : resolveEmbeddingProvider(config);
    return resolved.available;
  } catch {
    return false;
  }
}

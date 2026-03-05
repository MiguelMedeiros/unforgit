-- Enable pgvector extension (requires superuser or CREATE EXTENSION permission)
CREATE EXTENSION IF NOT EXISTS vector;

-- Memory embeddings table
CREATE TABLE "memory_embeddings" (
    "memory_id" UUID NOT NULL,
    "embedding" BYTEA NOT NULL,
    "embedding_vector" vector(1536),
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_embeddings_pkey" PRIMARY KEY ("memory_id")
);

-- Memory usage tracking table
CREATE TABLE "memory_usage" (
    "id" SERIAL NOT NULL,
    "memory_id" UUID NOT NULL,
    "recalled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "query" TEXT,
    "session_id" TEXT,

    CONSTRAINT "memory_usage_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "memory_usage_memory_id_idx" ON "memory_usage"("memory_id");
CREATE INDEX "memory_usage_recalled_at_idx" ON "memory_usage"("recalled_at");

-- Vector similarity index (using HNSW for better query performance)
CREATE INDEX "memory_embeddings_vector_idx" ON "memory_embeddings" 
USING hnsw ("embedding_vector" vector_cosine_ops);

-- Foreign keys
ALTER TABLE "memory_embeddings" ADD CONSTRAINT "memory_embeddings_memory_id_fkey" 
FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "memory_usage" ADD CONSTRAINT "memory_usage_memory_id_fkey" 
FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "memories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "repo_id" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL DEFAULT 'repo',
    "memory_type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'repo',
    "status" TEXT NOT NULL DEFAULT 'active',
    "text" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_refs" JSONB,
    "confidence" DOUBLE PRECISION,
    "ttl_seconds" INTEGER,
    "supersedes_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: composite for common queries
CREATE INDEX "memories_org_id_repo_id_memory_type_status_idx"
    ON "memories"("org_id", "repo_id", "memory_type", "status");

-- CreateIndex: GIN on tags for array containment queries
CREATE INDEX "idx_memories_tags_gin"
    ON "memories" USING GIN ("tags");

-- CreateIndex: Full-text search on text + summary
CREATE INDEX "idx_memories_fts"
    ON "memories" USING GIN (
        to_tsvector('english', "text" || ' ' || coalesce("summary", ''))
    );

-- Self-relation FK
ALTER TABLE "memories"
    ADD CONSTRAINT "memories_supersedes_id_fkey"
    FOREIGN KEY ("supersedes_id") REFERENCES "memories"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Add version field for conflict detection
ALTER TABLE "memories" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Add soft delete fields
ALTER TABLE "memories" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "memories" ADD COLUMN "deleted_by" TEXT;

-- Create tombstones table for sync propagation
CREATE TABLE "tombstones" (
    "id" UUID NOT NULL,
    "memory_id" UUID NOT NULL,
    "org_id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL,
    "deleted_by" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tombstones_pkey" PRIMARY KEY ("id")
);

-- Create unique index on memory_id for tombstones
CREATE UNIQUE INDEX "tombstones_memory_id_key" ON "tombstones"("memory_id");

-- Create index for sync queries
CREATE INDEX "tombstones_org_id_repo_id_synced_at_idx" ON "tombstones"("org_id", "repo_id", "synced_at");

-- Create index for updatedAt queries (for sync pull)
CREATE INDEX "memories_org_id_repo_id_updated_at_idx" ON "memories"("org_id", "repo_id", "updated_at");

-- Create index for deleted memories
CREATE INDEX "memories_deleted_at_idx" ON "memories"("deleted_at");

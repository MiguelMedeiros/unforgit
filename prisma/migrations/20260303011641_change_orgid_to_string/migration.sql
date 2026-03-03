-- DropIndex
DROP INDEX "idx_memories_tags_gin";

-- AlterTable
ALTER TABLE "memories" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "org_id" SET DATA TYPE TEXT,
ALTER COLUMN "tags" DROP DEFAULT;

-- AlterTable
ALTER TABLE "memory_links" ALTER COLUMN "id" DROP DEFAULT;

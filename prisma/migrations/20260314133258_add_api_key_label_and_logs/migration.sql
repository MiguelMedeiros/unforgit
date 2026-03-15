-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "label" TEXT;

-- CreateTable
CREATE TABLE "api_key_logs" (
    "id" UUID NOT NULL,
    "api_key_id" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "memory_id" UUID,
    "org_id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "query" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_key_logs_api_key_id_idx" ON "api_key_logs"("api_key_id");

-- CreateIndex
CREATE INDEX "api_key_logs_created_at_idx" ON "api_key_logs"("created_at");

-- CreateIndex
CREATE INDEX "api_key_logs_memory_id_idx" ON "api_key_logs"("memory_id");

-- CreateIndex
CREATE INDEX "api_key_logs_org_id_repo_id_idx" ON "api_key_logs"("org_id", "repo_id");

-- AddForeignKey
ALTER TABLE "api_key_logs" ADD CONSTRAINT "api_key_logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

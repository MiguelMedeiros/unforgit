/*
  Warnings:

  - You are about to drop the column `embedding_vector` on the `memory_embeddings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "memory_embeddings_vector_idx";

-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "created_by" UUID,
ADD COLUMN     "repo_id" TEXT,
ADD COLUMN     "user_id" UUID;

-- AlterTable
ALTER TABLE "memory_embeddings" DROP COLUMN "embedding_vector";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "github_id" INTEGER NOT NULL,
    "github_login" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "avatar_url" TEXT,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_repo_access" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "org_id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" UUID,

    CONSTRAINT "user_repo_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");

-- CreateIndex
CREATE INDEX "user_repo_access_org_id_repo_id_idx" ON "user_repo_access"("org_id", "repo_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_repo_access_user_id_org_id_repo_id_key" ON "user_repo_access"("user_id", "org_id", "repo_id");

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_repo_access" ADD CONSTRAINT "user_repo_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

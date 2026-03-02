-- CreateTable
CREATE TABLE "memory_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "link_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraint on (source, target, type)
CREATE UNIQUE INDEX "memory_links_source_id_target_id_link_type_key"
    ON "memory_links"("source_id", "target_id", "link_type");

-- AddForeignKey
ALTER TABLE "memory_links"
    ADD CONSTRAINT "memory_links_source_id_fkey"
    FOREIGN KEY ("source_id") REFERENCES "memories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_links"
    ADD CONSTRAINT "memory_links_target_id_fkey"
    FOREIGN KEY ("target_id") REFERENCES "memories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "World"
ADD COLUMN "visibility" "StoryVisibility" NOT NULL DEFAULT 'private',
ADD COLUMN "slug" TEXT,
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "coverImageUrl" TEXT;

CREATE UNIQUE INDEX "World_slug_key" ON "World"("slug");
CREATE INDEX "World_visibility_publishedAt_idx" ON "World"("visibility", "publishedAt");

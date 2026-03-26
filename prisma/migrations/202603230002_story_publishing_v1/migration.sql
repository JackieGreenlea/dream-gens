DO $$ BEGIN
  CREATE TYPE "StoryVisibility" AS ENUM ('private', 'public');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Story"
ADD COLUMN IF NOT EXISTS "visibility" "StoryVisibility" NOT NULL DEFAULT 'private',
ADD COLUMN IF NOT EXISTS "slug" TEXT,
ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Story_slug_key" ON "Story"("slug");
CREATE INDEX IF NOT EXISTS "Story_visibility_publishedAt_idx" ON "Story"("visibility", "publishedAt");

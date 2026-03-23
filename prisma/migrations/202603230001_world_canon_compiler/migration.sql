DO $$ BEGIN
  CREATE TYPE "WorldKind" AS ENUM ('legacy_playable', 'canon');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "World"
ADD COLUMN IF NOT EXISTS "kind" "WorldKind" NOT NULL DEFAULT 'legacy_playable',
ADD COLUMN IF NOT EXISTS "longDescription" TEXT;

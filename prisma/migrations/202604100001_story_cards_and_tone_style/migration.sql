ALTER TABLE "World"
ADD COLUMN "toneStyle" TEXT NOT NULL DEFAULT '',
ADD COLUMN "storyCards" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "World"
SET "toneStyle" = "authorStyle"
WHERE "toneStyle" = '';

ALTER TABLE "Story"
ADD COLUMN "toneStyle" TEXT NOT NULL DEFAULT '',
ADD COLUMN "storyCards" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "Story"
SET "toneStyle" = "authorStyle"
WHERE "toneStyle" = '';

ALTER TABLE "World"
ADD COLUMN "runtimeBackground" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Story"
ADD COLUMN "runtimeBackground" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Session"
ADD COLUMN "storyRuntimeBackground" TEXT;

UPDATE "World"
SET "runtimeBackground" = "background"
WHERE "runtimeBackground" = '';

UPDATE "Story"
SET "runtimeBackground" = "background"
WHERE "runtimeBackground" = '';

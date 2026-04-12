ALTER TABLE "Session"
ADD COLUMN "inactiveStoryCardIds" JSONB NOT NULL DEFAULT '[]';

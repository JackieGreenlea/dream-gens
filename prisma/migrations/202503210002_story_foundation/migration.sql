-- Additive foundation for the World / Story / Session split.
-- Current app flows still use the legacy standalone World shape.

ALTER TABLE "World"
ADD COLUMN IF NOT EXISTS "setting" TEXT,
ADD COLUMN IF NOT EXISTS "lore" TEXT,
ADD COLUMN IF NOT EXISTS "history" TEXT,
ADD COLUMN IF NOT EXISTS "rules" TEXT,
ADD COLUMN IF NOT EXISTS "cast" JSONB;

ALTER TABLE "Session"
ADD COLUMN IF NOT EXISTS "storyId" TEXT,
ADD COLUMN IF NOT EXISTS "storyCharacterId" TEXT;

ALTER TABLE "Session"
ALTER COLUMN "worldId" DROP NOT NULL;

CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "worldId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "firstAction" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "pov" "StoryPov" NOT NULL DEFAULT 'second_person',
    "instructions" TEXT NOT NULL,
    "authorStyle" TEXT NOT NULL,
    "victoryCondition" TEXT NOT NULL,
    "victoryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defeatCondition" TEXT NOT NULL,
    "defeatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryCharacter" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryCharacter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Story_userId_idx" ON "Story"("userId");
CREATE INDEX "Story_worldId_idx" ON "Story"("worldId");
CREATE INDEX "StoryCharacter_storyId_idx" ON "StoryCharacter"("storyId");
CREATE INDEX "Session_storyId_idx" ON "Session"("storyId");
CREATE INDEX "Session_storyCharacterId_idx" ON "Session"("storyCharacterId");

ALTER TABLE "Story"
ADD CONSTRAINT "Story_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Story"
ADD CONSTRAINT "Story_worldId_fkey"
FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StoryCharacter"
ADD CONSTRAINT "StoryCharacter_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Session"
ADD CONSTRAINT "Session_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Session"
ADD CONSTRAINT "Session_storyCharacterId_fkey"
FOREIGN KEY ("storyCharacterId") REFERENCES "StoryCharacter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

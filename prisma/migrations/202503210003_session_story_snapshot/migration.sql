-- Freeze playable setup data onto Session so runs do not mutate when the source Story changes.

ALTER TABLE "Session"
ADD COLUMN IF NOT EXISTS "storyTitle" TEXT,
ADD COLUMN IF NOT EXISTS "storySummary" TEXT,
ADD COLUMN IF NOT EXISTS "storyBackground" TEXT,
ADD COLUMN IF NOT EXISTS "storyFirstAction" TEXT,
ADD COLUMN IF NOT EXISTS "storyObjective" TEXT,
ADD COLUMN IF NOT EXISTS "storyInstructions" TEXT,
ADD COLUMN IF NOT EXISTS "storyAuthorStyle" TEXT,
ADD COLUMN IF NOT EXISTS "storyPov" "StoryPov",
ADD COLUMN IF NOT EXISTS "victoryCondition" TEXT,
ADD COLUMN IF NOT EXISTS "victoryEnabled" BOOLEAN,
ADD COLUMN IF NOT EXISTS "defeatCondition" TEXT,
ADD COLUMN IF NOT EXISTS "defeatEnabled" BOOLEAN,
ADD COLUMN IF NOT EXISTS "characterName" TEXT,
ADD COLUMN IF NOT EXISTS "characterDescription" TEXT,
ADD COLUMN IF NOT EXISTS "characterStrengths" JSONB,
ADD COLUMN IF NOT EXISTS "characterWeaknesses" JSONB;

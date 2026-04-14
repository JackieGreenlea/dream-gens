ALTER TABLE "Story"
DROP COLUMN IF EXISTS "firstAction",
DROP COLUMN IF EXISTS "objective";

ALTER TABLE "StoryCharacter"
DROP COLUMN IF EXISTS "strengths",
DROP COLUMN IF EXISTS "weaknesses";

ALTER TABLE "Session"
DROP COLUMN IF EXISTS "storyFirstAction",
DROP COLUMN IF EXISTS "storyObjective",
DROP COLUMN IF EXISTS "characterStrengths",
DROP COLUMN IF EXISTS "characterWeaknesses",
DROP COLUMN IF EXISTS "objective",
DROP COLUMN IF EXISTS "currentObjective";

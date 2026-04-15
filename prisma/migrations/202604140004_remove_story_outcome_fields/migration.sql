ALTER TABLE "Story"
DROP COLUMN IF EXISTS "firstAction",
DROP COLUMN IF EXISTS "objective",
DROP COLUMN IF EXISTS "victoryCondition",
DROP COLUMN IF EXISTS "victoryEnabled",
DROP COLUMN IF EXISTS "defeatCondition",
DROP COLUMN IF EXISTS "defeatEnabled";

ALTER TABLE "Session"
DROP COLUMN IF EXISTS "storyFirstAction",
DROP COLUMN IF EXISTS "storyObjective",
DROP COLUMN IF EXISTS "victoryCondition",
DROP COLUMN IF EXISTS "victoryEnabled",
DROP COLUMN IF EXISTS "defeatCondition",
DROP COLUMN IF EXISTS "defeatEnabled";

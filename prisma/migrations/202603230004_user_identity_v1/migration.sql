ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "username" TEXT,
ADD COLUMN IF NOT EXISTS "displayName" TEXT;

WITH seeded AS (
  SELECT
    id,
    COALESCE(
      NULLIF(
        trim(
          both '-'
          FROM regexp_replace(
            lower(COALESCE(NULLIF(name, ''), 'story-user')),
            '[^a-z0-9]+',
            '-',
            'g'
          )
        ),
        ''
      ),
      'story-user'
    ) AS base
  FROM "User"
),
ranked AS (
  SELECT
    id,
    CASE
      WHEN row_number() OVER (PARTITION BY base ORDER BY id) = 1 THEN base
      ELSE base || '-' || row_number() OVER (PARTITION BY base ORDER BY id)
    END AS username
  FROM seeded
)
UPDATE "User" AS "user"
SET "username" = ranked.username
FROM ranked
WHERE
  "user".id = ranked.id
  AND ("user"."username" IS NULL OR btrim("user"."username") = '');

UPDATE "User"
SET "displayName" = COALESCE(NULLIF(name, ''), initcap(replace("username", '-', ' ')))
WHERE "displayName" IS NULL OR btrim("displayName") = '';

ALTER TABLE "User"
ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

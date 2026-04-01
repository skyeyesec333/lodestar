-- Migration: wip/hybrid-sync
-- Run this entire script in Supabase SQL Editor (use the direct connection, not pooler).
-- It is idempotent — safe to re-run.

-- ─── 1. New enums ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "DealType" AS ENUM (
    'exim_project_finance',
    'commercial_finance',
    'development_finance',
    'private_equity',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EnvironmentalCategory" AS ENUM (
    'category_a',
    'category_b',
    'category_c',
    'category_fi'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProgramPath" AS ENUM (
    'standard',
    'ctep',
    'mmia',
    'critical_minerals',
    'engineering_multiplier'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "ProgramPath" ADD VALUE IF NOT EXISTS 'engineering_multiplier';

DO $$ BEGIN
  CREATE TYPE "ProjectMemberRole" AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommentTargetType" AS ENUM ('requirement', 'document', 'meeting');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WatchTargetType" AS ENUM ('project', 'requirement', 'document', 'meeting');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalStatus" AS ENUM ('draft', 'in_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalTargetType" AS ENUM ('requirement', 'document');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. New columns on projects ───────────────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS "dealType" "DealType" NOT NULL DEFAULT 'exim_project_finance',
  ADD COLUMN IF NOT EXISTS "targetCloseDate" DATE,
  ADD COLUMN IF NOT EXISTS "environmentalCategory" "EnvironmentalCategory",
  ADD COLUMN IF NOT EXISTS "programPath" "ProgramPath" NOT NULL DEFAULT 'standard';

-- ─── 2b. project_concepts table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_concepts (
  id                     TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId"            TEXT        NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  thesis                 TEXT,
  "sponsorRationale"     TEXT,
  "targetOutcome"        TEXT,
  "knownUnknowns"        TEXT,
  "fatalFlaws"           TEXT,
  "nextActions"          TEXT,
  "goNoGoRecommendation" TEXT,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_concepts_projectId_idx
  ON project_concepts ("projectId");

-- ─── 3. external_evidence_sources table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS external_evidence_sources (
  id                     TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId"            TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "projectRequirementId" TEXT        REFERENCES requirement_statuses(id) ON DELETE SET NULL,
  provider               TEXT        NOT NULL,
  "sourceType"           TEXT        NOT NULL DEFAULT 'file',
  title                  TEXT        NOT NULL,
  url                    TEXT        NOT NULL,
  notes                  TEXT,
  "linkedBy"             TEXT        NOT NULL,
  "linkedAt"             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS external_evidence_sources_projectId_idx
  ON external_evidence_sources ("projectId");
CREATE INDEX IF NOT EXISTS external_evidence_sources_projectRequirementId_idx
  ON external_evidence_sources ("projectRequirementId");

-- ─── 4. project_members table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_members (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId"  TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "clerkUserId" TEXT       NOT NULL,
  role         "ProjectMemberRole" NOT NULL DEFAULT 'editor',
  "invitedBy"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("projectId", "clerkUserId")
);

CREATE INDEX IF NOT EXISTS project_members_clerkUserId_idx ON project_members ("clerkUserId");
CREATE INDEX IF NOT EXISTS project_members_projectId_role_idx ON project_members ("projectId", role);

-- ─── 5. comments table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comments (
  id                      TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId"             TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "authorId"              TEXT        NOT NULL,
  body                    TEXT        NOT NULL,
  "editedAt"              TIMESTAMPTZ,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "targetType"            "CommentTargetType" NOT NULL,
  "projectRequirementId"  TEXT        REFERENCES requirement_statuses(id) ON DELETE CASCADE,
  "documentId"            TEXT        REFERENCES documents(id) ON DELETE CASCADE,
  "meetingId"             TEXT        REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS comments_projectId_targetType_createdAt_idx
  ON comments ("projectId", "targetType", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS comments_projectRequirementId_createdAt_idx
  ON comments ("projectRequirementId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS comments_documentId_createdAt_idx
  ON comments ("documentId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS comments_meetingId_createdAt_idx
  ON comments ("meetingId", "createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE comments
    ADD CONSTRAINT comments_target_shape_check
    CHECK (
      (
        "targetType" = 'requirement'
        AND "projectRequirementId" IS NOT NULL
        AND "documentId" IS NULL
        AND "meetingId" IS NULL
      )
      OR (
        "targetType" = 'document'
        AND "projectRequirementId" IS NULL
        AND "documentId" IS NOT NULL
        AND "meetingId" IS NULL
      )
      OR (
        "targetType" = 'meeting'
        AND "projectRequirementId" IS NULL
        AND "documentId" IS NULL
        AND "meetingId" IS NOT NULL
      )
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 6. comment_mentions table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comment_mentions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "commentId"   TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  "mentionedId" TEXT NOT NULL,
  UNIQUE ("commentId", "mentionedId")
);

CREATE INDEX IF NOT EXISTS comment_mentions_mentionedId_idx ON comment_mentions ("mentionedId");

-- ─── 7. watchers table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS watchers (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clerkUserId" TEXT        NOT NULL,
  "projectId"   TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "targetType"  "WatchTargetType" NOT NULL,
  "targetId"    TEXT        NOT NULL DEFAULT '',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("clerkUserId", "projectId", "targetType", "targetId")
);

CREATE INDEX IF NOT EXISTS watchers_projectId_targetType_idx ON watchers ("projectId", "targetType");
CREATE INDEX IF NOT EXISTS watchers_clerkUserId_projectId_idx ON watchers ("clerkUserId", "projectId");

WITH ranked_project_watches AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "clerkUserId", "projectId", "targetType"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM watchers
  WHERE "targetId" IS NULL
)
DELETE FROM watchers w
USING ranked_project_watches r
WHERE w.id = r.id
  AND r.rn > 1;

UPDATE watchers
SET "targetId" = ''
WHERE "targetId" IS NULL;

ALTER TABLE watchers
  ALTER COLUMN "targetId" SET DEFAULT '';

ALTER TABLE watchers
  ALTER COLUMN "targetId" SET NOT NULL;

-- ─── 8. approvals table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approvals (
  id                      TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId"             TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "reviewerId"            TEXT        NOT NULL,
  status                  "ApprovalStatus" NOT NULL DEFAULT 'draft',
  note                    TEXT,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "targetType"            "ApprovalTargetType" NOT NULL,
  "projectRequirementId"  TEXT        UNIQUE REFERENCES requirement_statuses(id) ON DELETE CASCADE,
  "documentId"            TEXT        UNIQUE REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS approvals_projectId_status_idx ON approvals ("projectId", status);
CREATE INDEX IF NOT EXISTS approvals_projectId_targetType_idx ON approvals ("projectId", "targetType");

DO $$ BEGIN
  ALTER TABLE approvals
    ADD CONSTRAINT approvals_target_shape_check
    CHECK (
      (
        "targetType" = 'requirement'
        AND "projectRequirementId" IS NOT NULL
        AND "documentId" IS NULL
      )
      OR (
        "targetType" = 'document'
        AND "projectRequirementId" IS NULL
        AND "documentId" IS NOT NULL
      )
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 8. Post-run audit queries (read-only) ──────────────────────────────────
-- Run these after the migration if you want to inspect legacy rows before
-- validating constraints in a later maintenance window.

-- Comments with invalid target shape (zero or multiple targets, or mismatched targetType)
SELECT
  id,
  "projectId",
  "targetType",
  "projectRequirementId",
  "documentId",
  "meetingId",
  "createdAt"
FROM comments
WHERE NOT (
  (
    "targetType" = 'requirement'
    AND "projectRequirementId" IS NOT NULL
    AND "documentId" IS NULL
    AND "meetingId" IS NULL
  )
  OR (
    "targetType" = 'document'
    AND "projectRequirementId" IS NULL
    AND "documentId" IS NOT NULL
    AND "meetingId" IS NULL
  )
  OR (
    "targetType" = 'meeting'
    AND "projectRequirementId" IS NULL
    AND "documentId" IS NULL
    AND "meetingId" IS NOT NULL
  )
);

-- Approvals with invalid target shape (zero or multiple targets, or mismatched targetType)
SELECT
  id,
  "projectId",
  "targetType",
  "projectRequirementId",
  "documentId",
  "createdAt",
  "updatedAt"
FROM approvals
WHERE NOT (
  (
    "targetType" = 'requirement'
    AND "projectRequirementId" IS NOT NULL
    AND "documentId" IS NULL
  )
  OR (
    "targetType" = 'document'
    AND "projectRequirementId" IS NULL
    AND "documentId" IS NOT NULL
  )
);

-- Any remaining duplicate project-level watches after NULL -> '' normalization
SELECT
  "clerkUserId",
  "projectId",
  "targetType",
  COUNT(*) AS duplicate_count
FROM watchers
WHERE "targetId" = ''
GROUP BY 1, 2, 3
HAVING COUNT(*) > 1;

-- Validate constraints later only after the audit queries return zero rows.
-- ALTER TABLE comments VALIDATE CONSTRAINT comments_target_shape_check;
-- ALTER TABLE approvals VALIDATE CONSTRAINT approvals_target_shape_check;

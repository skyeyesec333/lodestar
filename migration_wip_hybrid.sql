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
    'critical_minerals'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- ─── 3. project_members table ────────────────────────────────────────────────

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

-- ─── 4. comments table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comments (
  id                      TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId"             TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "authorId"              TEXT        NOT NULL,
  body                    TEXT        NOT NULL,
  "editedAt"              TIMESTAMPTZ,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "targetType"            "CommentTargetType" NOT NULL,
  "projectRequirementId"  TEXT        REFERENCES project_requirements(id) ON DELETE CASCADE,
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

-- ─── 5. comment_mentions table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comment_mentions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "commentId"   TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  "mentionedId" TEXT NOT NULL,
  UNIQUE ("commentId", "mentionedId")
);

CREATE INDEX IF NOT EXISTS comment_mentions_mentionedId_idx ON comment_mentions ("mentionedId");

-- ─── 6. watchers table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS watchers (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clerkUserId" TEXT        NOT NULL,
  "projectId"   TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "targetType"  "WatchTargetType" NOT NULL,
  "targetId"    TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("clerkUserId", "projectId", "targetType", "targetId")
);

CREATE INDEX IF NOT EXISTS watchers_projectId_targetType_idx ON watchers ("projectId", "targetType");
CREATE INDEX IF NOT EXISTS watchers_clerkUserId_projectId_idx ON watchers ("clerkUserId", "projectId");

-- ─── 7. approvals table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approvals (
  id                      TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId"             TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "reviewerId"            TEXT        NOT NULL,
  status                  "ApprovalStatus" NOT NULL DEFAULT 'draft',
  note                    TEXT,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "targetType"            "ApprovalTargetType" NOT NULL,
  "projectRequirementId"  TEXT        UNIQUE REFERENCES project_requirements(id) ON DELETE CASCADE,
  "documentId"            TEXT        UNIQUE REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS approvals_projectId_status_idx ON approvals ("projectId", status);
CREATE INDEX IF NOT EXISTS approvals_projectId_targetType_idx ON approvals ("projectId", "targetType");

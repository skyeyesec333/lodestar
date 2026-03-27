-- Add activity_events table
CREATE TABLE "activity_events" (
  "id"          TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "clerkUserId" TEXT NOT NULL,
  "eventType"   TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "metadata"    JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_events_projectId_createdAt_idx"
  ON "activity_events"("projectId", "createdAt" DESC);

ALTER TABLE "activity_events"
  ADD CONSTRAINT "activity_events_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

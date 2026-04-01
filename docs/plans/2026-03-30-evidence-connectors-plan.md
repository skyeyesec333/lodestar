# Lodestar Evidence Connectors Plan

Date: 2026-03-30  
Status: Execution-ready planning

## Goal

Turn the current `Data Room` / `Evidence` workspace into a real evidence layer that can ingest both:

- uploaded Lodestar documents
- linked third-party provider files and folders

The product should keep Lodestar as the canonical evidence model while letting teams work with the file systems they already use.

## Why This Matters

The current evidence surface is still upload-first:

- [DocumentPanel.tsx](/Users/bryanalexandros/Documents/lodestar/src/components/documents/DocumentPanel.tsx) is built around local file upload, delete, download, AI review, comments, approvals, and watches.
- The schema in [schema.prisma](/Users/bryanalexandros/Documents/lodestar/prisma/schema.prisma) models only uploaded `Document` records plus `DocumentRequest`.
- The API routes in:
  - [upload/route.ts](/Users/bryanalexandros/Documents/lodestar/src/app/api/documents/upload/route.ts)
  - [[id]/route.ts](/Users/bryanalexandros/Documents/lodestar/src/app/api/documents/[id]/route.ts)
  - [[id]/signed-url/route.ts](/Users/bryanalexandros/Documents/lodestar/src/app/api/documents/[id]/signed-url/route.ts)
  assume a Lodestar-owned storage path.

That is too narrow for real deals. Teams already keep evidence across Drive, SharePoint, OneDrive, Box, Dropbox, or VDR-style repositories. Forcing re-upload creates friction and slows onboarding.

## Product Principles

1. Lodestar remains the canonical evidence layer.
2. External providers become first-class evidence sources, not second-class links.
3. Linked provider files should work inside requirement coverage, approvals, comments, watches, and Beacon.
4. External provider support should accelerate workspace formation, not replace internal storage.
5. The Evidence workspace should answer:
   - what proof exists
   - where it lives
   - what requirement it supports
   - whether it is current
   - whether it is sufficient

## Core Product Model

The Evidence workspace should contain 4 source types:

1. Uploaded files
2. Linked provider files
3. Linked provider folders
4. Document requests

These should all roll up into one evidence layer visible to:

- requirement coverage
- approvals/signoff
- comments/mentions
- watches
- Beacon synthesis

## Recommended Data Model

Keep existing `Document` for Lodestar-uploaded files. Add a parallel external-source model instead of overloading `Document`.

### New enums

```prisma
enum EvidenceSourceType {
  uploaded
  external_file
  external_folder
}

enum EvidenceProvider {
  google_drive
  sharepoint
  onedrive
  dropbox
  box
  vdr
  other
}

enum ExternalEvidenceSyncStatus {
  pending
  synced
  stale
  broken
}
```

### New models

```prisma
model EvidenceConnection {
  id             String   @id @default(cuid())
  projectId      String
  provider       EvidenceProvider
  accountLabel   String?
  externalRootId String?
  externalUrl    String?
  createdBy      String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  lastSyncedAt   DateTime?
  syncStatus     ExternalEvidenceSyncStatus @default(pending)

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sources ExternalEvidenceSource[]

  @@index([projectId, provider])
  @@map("evidence_connections")
}

model ExternalEvidenceSource {
  id                    String   @id @default(cuid())
  projectId             String
  projectRequirementId  String?
  connectionId          String
  sourceType            EvidenceSourceType
  provider              EvidenceProvider
  externalId            String
  externalParentId      String?
  title                 String
  url                   String
  mimeType              String?
  providerModifiedAt    DateTime?
  providerCreatedAt     DateTime?
  syncStatus            ExternalEvidenceSyncStatus @default(pending)
  lastSyncedAt          DateTime?
  linkedBy              String
  linkedAt              DateTime @default(now())
  extractedText         String?
  metadataJson          Json?

  project     Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  requirement ProjectRequirement? @relation(fields: [projectRequirementId], references: [id], onDelete: SetNull)
  connection  EvidenceConnection  @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@unique([provider, externalId, projectId])
  @@index([projectId, projectRequirementId])
  @@index([connectionId, syncStatus])
  @@map("external_evidence_sources")
}
```

## Why Separate External Evidence from Document

Do not force provider-linked items into `Document`.

Reasons:

- uploaded files have storage paths, sizes, and version groups that provider links do not
- provider links need connection metadata, external IDs, sync status, and provider timestamps
- folders should be linkable even when they are not files
- external items may later support re-sync, crawl, or ingestion jobs

The unifying layer should be at the workspace/UI level, not by collapsing unlike source types into one table.

## Workspace Behavior

### Evidence workspace should show

1. `Coverage`
- requirement coverage
- linked uploaded evidence
- linked provider evidence
- missing evidence reasons

2. `Sources`
- uploaded
- linked provider files
- linked provider folders
- status of provider connections

3. `Requests`
- evidence still needed
- owner
- due date
- source requested from

4. `Review`
- approval status
- comments
- Beacon synthesis over evidence

## User Workflows

### A. Connect provider

User opens Evidence workspace and clicks `Link provider`.

Flow:
1. choose provider
2. authenticate / connect account
3. select folder or browse source
4. save `EvidenceConnection`

### B. Link evidence into project

User can:
- link a file directly
- link a folder for later browsing
- mark items as supporting a specific requirement

Result:
- create `ExternalEvidenceSource`
- optionally attach to `projectRequirementId`

### C. Map evidence to requirement

From requirement row or Evidence workspace:
1. choose requirement
2. add uploaded doc or external source
3. mark it as supporting evidence

This should update coverage views immediately.

### D. Beacon synthesis

Beacon should be able to:
- see uploaded docs
- see linked provider evidence metadata
- optionally use extracted text when available
- explain why a requirement remains uncovered even if linked files exist

## Provider Rollout Order

Recommended sequence:

1. Google Drive
2. SharePoint / OneDrive
3. Dropbox / Box
4. VDR / custom repository support

Why:
- Drive and Microsoft cover most practical teams
- they are closest to the meeting-style connector mental model already in the product

## UI Changes

### Rename fully to Evidence

Current product still mixes `Data Room` language into:
- [DocumentPanel.tsx](/Users/bryanalexandros/Documents/lodestar/src/components/documents/DocumentPanel.tsx)
- Beacon tab labels in [BeaconPanel.tsx](/Users/bryanalexandros/Documents/lodestar/src/components/beacon/BeaconPanel.tsx)
- AI knowledge strings in [app-knowledge.ts](/Users/bryanalexandros/Documents/lodestar/src/lib/ai/app-knowledge.ts)

This should be normalized to `Evidence`.

### Evidence workspace UI additions

1. `Link provider` button next to upload
2. provider connection badges
3. source-type badges:
   - Uploaded
   - Drive
   - SharePoint
   - Folder
4. ability to filter by:
   - uploaded only
   - external only
   - linked to requirement
   - unlinked
   - stale / broken sync

### Requirement-level UX

Each requirement should be able to show:
- uploaded evidence count
- external evidence count
- missing evidence
- open request count
- approval state

## Beacon Implications

Beacon should not treat linked evidence as plain hyperlinks.

It should receive:
- provider
- title
- URL
- linked requirement
- sync status
- extracted text when available

Recommended next Beacon behaviors:

1. `Evidence gap analysis`
2. `Compare uploaded vs linked support`
3. `Suggest what external files should be linked to which requirements`
4. `Detect stale linked evidence`

## Sync Model

Do not overbuild sync in v1.

### v1
- manual link
- metadata snapshot
- no background crawl required
- optional `Refresh metadata` action

### v2
- scheduled metadata refresh
- broken-link detection
- extracted text ingestion
- folder traversal and sync jobs

## Access / Permissions

Follow the same project role model already in place:

- viewer
  - view linked evidence
  - open provider URLs
  - comment/watch
- editor
  - connect providers
  - link/unlink external evidence
  - map evidence to requirements
- owner
  - same as editor, plus connection management policy if needed

## Execution Plan

### Tranche D1 — Evidence reframe

1. rename UI language from `Data Room` to `Evidence`
2. rename Beacon tab from `Data Room` to `Evidence`
3. add evidence-source design hooks in the workspace

### Tranche D2 — Schema and internal model

1. add enums and models:
   - `EvidenceProvider`
   - `EvidenceConnection`
   - `ExternalEvidenceSource`
2. add migrations
3. add DB helpers and actions

### Tranche D3 — Evidence connector UX

1. add `Link provider` control
2. add linked evidence list
3. add requirement mapping for linked sources
4. add connection status UI

### Tranche D4 — Beacon and coverage integration

1. include external evidence in coverage map
2. include external evidence metadata in Beacon context
3. add evidence-gap prompts / agent guidance

## What Can Ship Before Real Connectors

Safe intermediate step:

- support `external link evidence` manually without OAuth connectors yet
- user pastes:
  - title
  - URL
  - provider
  - optional linked requirement

This gives immediate product value and validates the evidence model before full provider integration.

## Recommendation

Do this in two stages:

1. manual external evidence linking first
2. real provider connectors second

That is the fastest path to proving the workspace model without blocking on connector complexity.

## Build Trigger

This plan is ready to execute once you decide whether to:

1. start with manual external evidence links, or
2. go straight to provider-backed connectors

My recommendation is `manual links first`, then provider connectors.

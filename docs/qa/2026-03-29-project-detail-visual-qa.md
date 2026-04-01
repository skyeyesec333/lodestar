# Visual QA — Project Detail Page
**Date:** 2026-03-29
**Page:** `/projects/[slug]` — Rufiji Water Treatment Expansion (demo project)
**Viewports tested:** 1440, 1280, 1024, 940px
**Method:** Playwright headless Chromium, authenticated via Clerk session token

---

## Phase 1 — Findings

### Issue List

---

**Issue 1 — TourGuide: auto-starts and permanently occludes content**
Component: `src/components/projects/TourGuide.tsx`
Viewports: 1440, 1280, 1024, 940
Problem: The tour guide callout auto-starts on page load and renders on top of live content in every viewport. The overlay ("Project header" step) occludes the Readiness gauge, PM Signal band, Ownership Load panel, and Stakeholder card grid — blocking 30–40% of the visible viewport for the entire session.
Category: Hierarchy / interaction
Severity: Critical

---

**Issue 2 — TourGuide restart button: not visible at any viewport**
Component: `src/components/projects/TourGuide.tsx`
Viewports: 1440, 1280, 1024, 940
Problem: The fixed-position restart button (`top: "72px", right: "16px"`, `zIndex: 200`) is invisible in all top-right corner captures. It either renders behind another element, has zero computed size mid-tour, or `top: 72px` does not clear the app nav bar.
Category: Placement / visibility
Severity: Critical

---

**Issue 3 — Execution band grid: `340px` minmax floor prevents clean stacking at 940px**
Component: `src/app/(dashboard)/projects/[slug]/page.tsx` — execution section
Viewports: 940
Problem: `gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))"` forces two columns at 940px (2×340 + 24px gap = 704px minimum), leaving each column cramped at ~458px. The Meetings card and Activity feed sit side-by-side at a width where the content is too dense. The activity feed column shows only one entry and reads as a dead zone.
Category: Responsiveness / density
Severity: Medium

---

**Issue 4 — ActivityFeed empty column: no placeholder at 1024px**
Component: `src/components/projects/ActivityFeed.tsx`
Viewports: 1024
Problem: The activity feed shows only one timestamp entry ("Deal portfolio project created") but still consumes ~50% of the execution band grid. No empty-state label, icon, or visual placeholder. The right half of the execution band is a wide dead zone.
Category: Density / hierarchy
Severity: Minor

---

**Issue 5 — WeeklyDriftPanel bar chart: not rendering**
Component: `src/components/projects/WeeklyDriftPanel.tsx`
Viewports: 1440, 1280, 1024, 940
Problem: The PM Signal section header appears but the bar chart body (fixed `height: "118px"`, `repeat(${timeline.length}, minmax(0, 1fr))`) is not visible at any viewport. The chart grid likely collapses to zero columns/height when `timeline.length === 0` (no activity events in the last 7 days). The stat blocks row above the chart is visible but the chart itself is missing.
Category: Rendering / data-dependent
Severity: Critical

---

**Issue 6 — WeeklyDriftPanel stat row: fixed 4-column grid compresses at 940px**
Component: `src/components/projects/WeeklyDriftPanel.tsx`
Viewports: 940
Problem: `gridTemplateColumns: "repeat(4, minmax(0, 1fr))"` forces 4 columns regardless of viewport width. At 940px the stat tiles compress to ~215px each with no responsive fallback.
Category: Responsiveness
Severity: Medium

---

**Issue 7 — CriticalPathBoard stat row: fixed 4-column grid compresses at 940px, value overflow**
Component: `src/components/projects/CriticalPathBoard.tsx`
Viewports: 940, 1024
Problem: Same pattern as WeeklyDrift — `repeat(4, minmax(0, 1fr))`. At 940px the "Blockers before the next gate" stat row compresses all four tiles. The "Country" value tile appears to clip its value at the tile boundary.
Category: Responsiveness / overflow
Severity: Medium

---

**Issue 8 — OwnershipLoadBoard: empty left panel wastes 50% of row at all viewports**
Component: `src/components/projects/OwnershipLoadBoard.tsx`
Viewports: 1440, 1280, 1024, 940
Problem: When no stakeholders have requirements assigned, the left stakeholder panel renders as a full-width empty box ("No stakeholder load to display") occupying ~50% of the two-column layout at every viewport. The right requirements panel (EPC Contract, Implementation Agreement, Financial Model) is populated but constrained to half-width. This is ~300px of dead space at 1440px.
Category: Density / hierarchy
Severity: Critical

---

**Issue 9 — OwnershipLoadBoard two-column grid: 380px minimum stacks late**
Component: `src/components/projects/OwnershipLoadBoard.tsx`
Viewports: 940
Problem: `repeat(auto-fit, minmax(380px, 1fr))` only stacks to single column below ~784px. At 940px both columns are present at ~458px each — functional, but the requirement item cards inside the right panel feel cramped (internal padding is tight at that width).
Category: Density
Severity: Minor

---

**Issue 10 — StakeholderGraph: 6-column stat tile row is dense at 940px**
Component: `src/components/stakeholders/StakeholderGraph.tsx`
Viewports: 940, 1024
Problem: `repeat(auto-fit, minmax(140px, 1fr))` produces 6 columns at 940px. The stat tiles are functionally readable but at maximum density. The stakeholder role cards below also use `minmax(140px, 1fr)` — at 940px this creates 6 card columns that crowd the role labels and body descriptions.
Category: Density
Severity: Minor

---

**Issue 11 — ReadinessGauge: third stat tile wraps to second row at 940px**
Component: `src/components/projects/ReadinessGaugeClient.tsx`
Viewports: 940
Problem: The top stats row (`repeat(auto-fit, minmax(160px, 1fr))`) shows only "Gate Status" and "Strongest Category" at 940px. "Weakest Category: Permits 50%" wraps to a second row, creating an asymmetric header. The gauge's left column (`minmax(220px, 320px)`) is likely consuming more horizontal space than expected, squeezing the stats grid.
Category: Responsiveness
Severity: Medium

---

**Issue 12 — DocumentCoverageMap: 3+1 orphan card layout at 940px**
Component: `src/components/projects/DocumentCoverageMap.tsx`
Viewports: 940
Problem: `repeat(auto-fit, minmax(240px, 1fr))` produces 3 columns at 940px (3×240 + gaps = ~748px fits), leaving a 4th card alone on a second row. The 3+1 layout reads as an unintentional orphan rather than a designed grid.
Category: Layout balance
Severity: Minor

---

**Issue 13 — ProjectNav: mobile `N` icon appears at 940px alongside desktop content**
Component: `src/components/projects/ProjectNav.tsx`
Viewports: 940
Problem: The `N` floating button (mobile nav trigger) is visible at bottom-left in all 940px captures, suggesting the JS threshold that switches between desktop side nav and mobile nav may be set too low. At 940px the desktop nav may also be present, causing overlap with the content left edge.
Category: Placement / responsiveness
Severity: Minor

---

## Severity Summary

### Critical
| # | Component | Viewports | Problem |
|---|-----------|-----------|---------|
| 1 | TourGuide | All | Auto-starts; overlay blocks content across the entire session |
| 2 | TourGuide restart button | All | Not visible at any viewport |
| 5 | WeeklyDriftPanel bar chart | All | Chart not rendering — collapses when timeline data is empty |
| 8 | OwnershipLoadBoard | All | Empty left panel occupies 50% of layout width at every viewport |

### Medium
| # | Component | Viewports | Problem |
|---|-----------|-----------|---------|
| 3 | Execution band grid | 940 | `minmax(340px)` forces cramped 2-col instead of stacking |
| 6 | WeeklyDriftPanel stat row | 940 | Fixed `repeat(4,...)` compresses tiles below usable width |
| 7 | CriticalPathBoard stat row | 940, 1024 | Fixed `repeat(4,...)` with value overflow on "Country" tile |
| 11 | ReadinessGaugeClient stats | 940 | Third stat tile orphans to second row, asymmetric header |
| 12 | DocumentCoverageMap cards | 940 | 3+1 orphan card row at 940px |

### Minor
| # | Component | Viewports | Problem |
|---|-----------|-----------|---------|
| 4 | ActivityFeed | 1024 | Empty column has no placeholder; wide dead zone |
| 9 | OwnershipLoadBoard grid | 940 | Internal card padding feels tight at 940px |
| 10 | StakeholderGraph tiles | 940, 1024 | 6-column tile row is at maximum density |
| 13 | ProjectNav | 940 | Mobile `N` icon appears alongside desktop content |

---

## Phase 2 — Fix Proposals

---

### Fix 1 — TourGuide: disable auto-start, gate on localStorage flag
**File:** `src/components/projects/TourGuide.tsx`
**Change:** Initialize `step` state to `null` instead of `0`. On mount, read `localStorage.getItem('lodestar_tour_seen')`. Only set `step = 0` if the key is absent, and write the key when the user clicks NEXT on the first step (or SKIP). Show the restart button whenever `step === null`.
**Why:** Fixes Issue 1 and Issue 2. Eliminates the overlay blocking all other content. Unblocks accurate QA of every section beneath.
**Approach:** Component structure only. No layout impact on surrounding page.

---

### Fix 2 — TourGuide restart button: verify top offset clears nav bar
**File:** `src/components/projects/TourGuide.tsx`
**Change:** Inspect the app's top nav bar height. If it is taller than 72px, raise the restart button `top` value to clear it (e.g. `top: "88px"`). Ensure the button renders in the `step === null` state, not only mid-tour.
**Why:** Fixes Issue 2. Button was invisible in all top-right corner crops.
**Approach:** CSS only — one value change.

---

### Fix 3 — WeeklyDriftPanel + CriticalPathBoard: responsive stat rows
**Files:** `src/components/projects/WeeklyDriftPanel.tsx`, `src/components/projects/CriticalPathBoard.tsx`
**Change:** Replace `gridTemplateColumns: "repeat(4, minmax(0, 1fr))"` with `gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))"` in the stat tile rows of both components.
**Why:** Fixes Issues 6 and 7. At 940px the fixed 4-column grid compresses tiles below a comfortable read width. Auto-fit at 160px stays 4-wide above ~680px and stacks to 2×2 below.
**Approach:** CSS only — one property in each file. Fully isolated.

---

### Fix 4 — OwnershipLoadBoard: collapse empty stakeholder panel
**File:** `src/components/projects/OwnershipLoadBoard.tsx`
**Change:** When the stakeholder panel has no data to show, either: (a) hide the left panel entirely (`display: none`) and allow the requirements panel to expand full-width, or (b) render a compact single-line notice instead of the full empty box. Remove the `minmax(380px, 1fr)` floor from the left column when it is empty so the right column can expand.
**Why:** Fixes Issue 8. ~300px of dead horizontal space at all viewports.
**Approach:** Component structure — conditional render. Does not affect sibling sections.

---

### Fix 5 — Execution band grid: lower minmax floor
**File:** `src/app/(dashboard)/projects/[slug]/page.tsx`
**Change:** Change the execution section `gridTemplateColumns` from `repeat(auto-fit, minmax(340px, 1fr))` to `repeat(auto-fit, minmax(300px, 1fr))`.
**Why:** Fixes Issue 3. At 940px two 340px columns barely fit. Dropping to 300px gives ~40px more room per column and will stack to single-column below ~624px.
**Approach:** CSS only — one value in `page.tsx`. Test at 1280px+ to confirm both columns still render side-by-side (they will — 2×300 = 600px, well under any target width).
**Note:** This is in `page.tsx`, the root layout. Verify the change doesn't affect other grids on the page.

---

### Fix 6 — ReadinessGauge stats: prevent third tile orphan at 940px
**File:** `src/components/projects/ReadinessGaugeClient.tsx`
**Change:** Change the stats grid `minmax` from `160px` to `130px`. Alternatively, investigate whether the left gauge column (`minmax(220px, 320px)`) is resolved wider than expected at 940px and squeezing the stats grid's available width below 480px.
**Why:** Fixes Issue 11. Third stat tile wraps to second row, producing asymmetric readiness header.
**Approach:** CSS only — isolated to the stats row inside the readiness card.

---

### Fix 7 — DocumentCoverageMap: avoid 3+1 orphan at 940px
**File:** `src/components/projects/DocumentCoverageMap.tsx`
**Change:** Change category cards `gridTemplateColumns` from `repeat(auto-fit, minmax(240px, 1fr))` to `repeat(auto-fit, minmax(260px, 1fr))`. At 940px, three 260px columns = 780px + gaps ≈ 808px — this still fits, but raising to `280px` would force 2-wide (2×280 = 560px + gaps), giving a clean 2×2 layout at 940px instead of 3+1.
**Why:** Fixes Issue 12. A 3+1 orphan reads as broken even when it is valid CSS grid behavior.
**Approach:** CSS only — isolated. Test at 1440px to confirm 4-wide layout still renders where desired.

---

### Fix 8 — WeeklyDriftPanel chart: guard against empty timeline
**File:** `src/components/projects/WeeklyDriftPanel.tsx`
**Change:** When `timeline.length === 0`, render a visible empty state ("No activity recorded in the last 7 days") inside the `height: "118px"` chart container instead of an invisible collapsed grid. The container should maintain its height even when empty.
**Why:** Fixes Issue 5. The chart area is invisible when there is no activity data — the `repeat(0, ...)` grid collapses to zero height and the section looks broken.
**Approach:** Component structure — conditional render inside the chart area. CSS height is already set; just needs content.

---

## Implementation Priority

**Top 5 — do first:**
1. Fix 1 — TourGuide auto-start (unblocks accurate rendering of every section)
2. Fix 2 — TourGuide button visibility (follow-on from Fix 1)
3. Fix 4 — OwnershipLoadBoard empty panel (largest dead-space issue, all viewports)
4. Fix 3 — Stat row responsive grids (two files, one property each, zero risk)
5. Fix 5 — Execution band minmax floor (one value change in page.tsx)

**Safe and isolated (no risk to surrounding layout):**
- Fix 1, 2 — TourGuide only
- Fix 3 — WeeklyDrift and CriticalPath stat rows only
- Fix 4 — OwnershipLoadBoard conditional render only
- Fix 6 — ReadinessGauge stats row only
- Fix 7 — DocumentCoverageMap cards grid only
- Fix 8 — WeeklyDriftPanel chart empty state only

**Needs care (touches shared layout file):**
- Fix 5 — Changes `page.tsx` execution section grid. One value change, low risk, but verify 1280px+ two-column render still works and no other grid on the page is affected.

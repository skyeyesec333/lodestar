# Lodestar Foundation Audit

Date: 2026-03-28

## Why this exists
The repository has moved beyond its original foundation-only plan, but the planning context has not kept pace. This note separates solid foundation work from actual planning risk.

## What is solid
- The core domain spine exists:
  - Prisma schema models projects, stakeholders, meetings, documents, EPC bids, and funder relationships.
- The EXIM taxonomy is explicit and centralized:
  - [`src/lib/exim/requirements.ts`](../../src/lib/exim/requirements.ts)
- Readiness scoring is deterministic and testable:
  - [`src/lib/scoring/index.ts`](../../src/lib/scoring/index.ts)
- Basic architectural boundaries are visible:
  - DB access in `src/lib/db/`
  - AI helpers in `src/lib/ai/`
  - server actions in `src/actions/`

## What is risky
- Planning drift:
  - The repo had already outgrown its original `Phase 0` planning context. [`CLAUDE.md`](../../CLAUDE.md) has now been corrected, but the broader planning layer still needs current architecture decisions and product-status notes.
- Product framing drift:
  - The codebase is still EXIM-first, while strategy is starting to broaden toward a larger policy-backed readiness platform. That expansion does not yet have an explicit abstraction plan.
- Source-of-truth risk:
  - Official EXIM retrieval is stubbed today in [`src/lib/ai/chat.ts`](../../src/lib/ai/chat.ts), so the app cannot yet ground policy-sensitive responses in live official material.
- Thin planning artifacts:
  - There is no current architecture decision record for how Lodestar evolves from EXIM taxonomy to multi-program readiness without breaking the model.
- Coverage gap:
  - Core scoring logic is tested, but the broader workflow surface is still lightly verified relative to product scope.

## What this means
Claude did not create a bad foundation. The bigger issue is that the repo now needs explicit human-owned product and architecture decisions above that foundation.

## Recommended next planning moves
1. Freeze the current wedge:
   - State clearly that runtime product scope is still `EXIM-first sponsor readiness`.
2. Write the next abstraction plan:
   - Define which concepts are permanent (`artifact`, `condition`, `counterparty`, `evidence`, `milestone`) and which are EXIM-specific overlays.
3. Create architecture decision records:
   - taxonomy strategy
   - multi-program expansion strategy
   - AI grounding and evidence policy
4. Add a live product-status note:
   - alpha scope, what is real, what is simulated, and what remains manual.
5. Expand test coverage around workflows:
   - documents
   - meetings to action-items
   - stakeholder obligations
   - chat grounding paths

# Lodestar Background Intelligence Memo

Date: March 28, 2026

## 1. World model for Lodestar

Lodestar should be designed around a simple reality: the critical operating problem is not construction execution and not lender-side diligence. It is the sponsor-led period before financial close, where project owners and advisors have to turn a scattered set of meetings, contracts, approvals, counterparties, and supporting evidence into a submission-grade financing package.

That world has a few stable characteristics:

- many parties move on different cadences: sponsors, EPCs, off-takers, local obligors, ECAs, DFIs, advisors, consultants, and government stakeholders
- the work is evidence-heavy rather than task-heavy
- the same facts have to stay consistent across multiple documents and negotiations
- the cost of discovering readiness problems late is high because external diligence, LOI timing, and counterpart credibility all depend on document maturity

The best product frame is therefore not "project management for infrastructure." It is a readiness system of record for policy-backed, capital-intensive projects before financing closes.

## 2. Macro and policy signals

- EXIM's project-finance program continues to frame eligibility and underwriting around integrated contractual arrangements, substantially final agreements, host-government approvals, market studies, sponsor financials, and external due diligence. That confirms the core workflow remains pre-close coordination and evidence assembly, not generic task tracking. Source: EXIM project-finance guidance and approach pages.
- On October 20, 2025, EXIM announced 7 Letters of Interest totaling more than $2.2 billion for critical-minerals projects in Australia. This shows the opportunity surface is expanding into strategic supply-chain and allied-country coordination, not just classic host-country infrastructure. Source: EXIM critical-minerals LOI announcement.
- EXIM's critical-minerals support now explicitly spans mines through gigafactories and references MMIA, CTEP flexibilities, export-nexus flexibility, and the Single Point of Entry with Export Finance Australia. That is a direct signal that program complexity is growing in ways software has to model. Source: EXIM critical-minerals page.
- On January 30, 2026, EXIM announced support for Poland's first nuclear project under the Engineering Multiplier Program. That matters because the product surface includes early engineering and pre-FID structuring work, not only final asset financing. Source: EXIM Poland announcement.
- EXIM's FY2025 project-finance transactions include Guyana gas-to-energy, Poland nuclear engineering, and Malaysia petrochemicals. The active mix is multi-sector and multi-structure. Lodestar should not assume one narrow project template. Source: EXIM project-finance transactions page.

## 3. Operational realities before financial close

- readiness is mostly invisible until a sponsor enters diligence or misses a milestone
- commitments made in meetings are rarely tied back to artifacts, owners, and financing conditions
- off-taker progress, EPC qualification, U.S.-content evidence, and sponsor financial support often live in separate systems or spreadsheets
- the same assumptions must stay aligned across feasibility studies, market studies, business plans, engineering packages, budgets, and financing materials
- multi-agency and allied-ECA structures add coordination demands that generic PM, CRM, and VDR tools do not model well

Operationally, the sponsor is still acting as the human integration layer between:

- relationship management
- document readiness
- counterparty obligations
- lender and agency conditions
- policy-program fit
- schedule realism and supply-chain evidence

That is the real background problem Lodestar is being built against.

## 4. Data and workflow implications for product design

The app should probably treat these as first-class primitives:

- `artifact`
  - not just a file, but a required piece of evidence with state, owner, maturity, and relevance to one or more milestones
- `condition`
  - a blocker or gating requirement attached to a funder, agency, or stage transition
- `counterparty`
  - sponsor, EPC, off-taker, advisor, ECA, DFI, consultant, regulator, or reviewer
- `commitment`
  - something promised in a meeting or thread that must resolve into an artifact, action, or condition
- `evidence link`
  - the trace between a claim, a document, a meeting, and a milestone
- `program overlay`
  - EXIM-specific rules today, with room for other policy-backed structures later

Design consequences:

- the central UI should likely be readiness- and blocker-driven, not folder-driven
- meetings should resolve into commitments and evidence gaps, not just notes
- document intelligence should compare across artifacts, not just summarize one file at a time
- status should be tied to maturity and proof, not binary completion
- policy-sensitive recommendations should be source-linked and auditable

## 5. Open questions / unknowns

- Which recurring pre-close workflows are painful enough that sponsors will pay before financial close, rather than after a project enters execution?
- How much of the app should be EXIM-specific in the data model versus layered as a program-specific overlay?
- Which users actually maintain the system of record: sponsor teams, advisors, or a mixed collaboration model?
- What is the minimum evidence model required to make readiness scoring trusted rather than cosmetic?
- Where should Lodestar stop and integrate outward into delivery systems rather than trying to own the full lifecycle?

## 6. Sources

- EXIM, "Project Finance Application / Guidelines for a Successful Project Finance Application": https://www.exim.gov/solutions/project-and-structured-finance/guidelines-for-submitting-successful-application
- EXIM, "Our Approach to Project Finance": https://www.exim.gov/solutions/project-and-structured-finance/our-approach-to-project-finance
- EXIM, "Transactions Fiscal Years 1993-2025": https://www.exim.gov/solutions/project-and-structured-finance/transactions
- EXIM, "EXIM Powers America First with $2.2 Billion in Critical Minerals Commitments to Secure U.S. Supply Chains with Australia" (October 20, 2025): https://www.exim.gov/news/exim-powers-america-first-22-billion-critical-minerals-commitments-secure-supply-chains
- EXIM, "EXIM Support for Critical Minerals Transactions": https://www.exim.gov/about/special-initiatives/ctep/critical-minerals
- EXIM, "EXIM Powers American Nuclear Exports to Poland" (January 30, 2026): https://www.exim.gov/news/exim-powers-american-nuclear-exports-poland-supporting-jobs-and-energy-dominance

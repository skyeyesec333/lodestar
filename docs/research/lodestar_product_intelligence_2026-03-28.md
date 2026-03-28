# Lodestar Product Intelligence

Date: 2026-03-28

## 1. Intelligence Lodestar should surface in-product

Lodestar should surface the intelligence that a sponsor or advisor cannot reliably hold in their head across meetings, documents, counterparties, and funder conditions.

- Submission readiness:
  - live readiness score by artifact, phase, owner, and blocker
  - document maturity state (`missing`, `draft`, `substantially final`, `executed`, `waived`)
  - lender- or agency-specific completion views rather than one generic checklist
- Condition critical path:
  - which condition, permit, agreement, or evidence item is currently blocking LOI, preliminary support, or final commitment
  - how that blocker rolls up to schedule risk and funding risk
- Counterparty intelligence:
  - EPC qualification status
  - off-taker status and missing repayment-support evidence
  - funder / advisor / government counterpart responsiveness and commitments owed
- Meeting-to-milestone intelligence:
  - decisions made
  - promises made by party
  - unresolved questions
  - whether a meeting actually moved a financing milestone forward
- Document and narrative consistency:
  - mismatched assumptions across feasibility study, market materials, business plan, engineering package, and contracts
  - stale numbers or contradictions before external diligence finds them
- Strategic program fit:
  - U.S.-content / export-nexus evidence
  - MMIA / Project Vault / critical-minerals relevance where applicable
  - whether the project still fits the active policy and financing path
- Delivery-adjacent risk before close:
  - supply-chain lead-time risk
  - permitting and host-government dependency risk
  - whether execution assumptions are drifting away from what the financing story says

## 2. Required entities and signals

The app needs a tighter operating model than generic “projects + tasks + files.”

### Core entities
- `Project`
- `Program` or `Financing Path`
  - EXIM project finance
  - MMIA
  - critical minerals / CTEP path
  - later, other ECA / DFI overlays
- `Requirement`
- `Condition`
- `Artifact`
- `Evidence`
- `Counterparty`
  - sponsor
  - EPC
  - off-taker
  - funder
  - advisor
  - consultant
  - government entity
- `Commitment`
- `Decision`
- `Milestone`
- `Risk`
- `Supply Item`
- `Alert`

### High-value signals
- time since last counterparty movement
- number of unresolved commitments by party
- number of LOI-critical items below substantially final
- document inconsistency score
- evidence completeness by requirement
- policy / program eligibility changes
- lead-time drift on critical equipment
- funder-condition aging and re-open rate
- meeting velocity versus actual milestone progress

## 3. Alerting / monitoring opportunities

The best alerting is not generic notifications. It is financing-specific surveillance.

- `Readiness regression alert`
  - a required artifact was superseded, reopened, or downgraded
- `LOI blocker alert`
  - an LOI-critical requirement is still below substantially final inside a defined time window
- `Condition aging alert`
  - a funder or agency condition has had no movement beyond the acceptable threshold
- `Counterparty silence alert`
  - a critical external party has gone quiet while still owning required evidence
- `Narrative conflict alert`
  - commercial, technical, and financial documents no longer tell the same story
- `Program-fit alert`
  - the project no longer cleanly satisfies its targeted financing path assumptions
- `Supply-chain shock alert`
  - lead times or sourcing assumptions create a financing-timeline mismatch
- `Government dependency alert`
  - essential approvals or host-government undertakings are behind plan

## 4. Competitive product read-through

### What adjacent tools are proving
- On **September 25, 2025**, Asana launched **AI Teammates**, collaborative agents designed to operate with organizational context across workflows.
  - Source: <https://investors.asana.com/news-releases/news-release-details/asana-announces-new-ai-teammates-collaborative-agents-deliver>
- On **September 17, 2025**, monday.com expanded **AI-powered agents** and enterprise capabilities.
  - Source: <https://ir.monday.com/news-and-events/news-releases/news-details/2025/monday-com-Expands-AI-Powered-Agents-CRM-Suite-and-Enterprise-Grade-Capabilities/default.aspx>
- On **November 5, 2025**, Smartsheet announced **Intelligent Work Management** with smart agents, scenario planning, and enterprise controls, then on **March 9, 2026** emphasized AI governance, auditability, and admin control as architectural requirements.
  - Sources:
    - <https://www.smartsheet.com/content-center/news/smartsheet-debuts-intelligent-work-management-unifying-ai-data-and-people>
    - <https://www.smartsheet.com/content-center/product-insights/product-updates/responsible-design-smartsheet-ai-principles-practices>
- On **November 20, 2024**, Procore launched **Procore AI** with agents, insights, and copilot capabilities over construction data.
  - Source: <https://www.procore.com/press/procore-launches-procore-ai-with-new-agents-to-boost-construction-management-efficiency>
- Datasite Diligence is still centered on data-room execution, request lists, integrated Q&A, trackers, audit trails, and AI-assisted redaction rather than sponsor-side financing readiness.
  - Sources:
    - <https://www.datasite.com/en/products/diligence>
    - <https://www.datasite.com/en/resources/insights/accelerate-your-due-diligence-with-redaction-ai>
- Intapp DealCloud is proving the value of AI-driven relationship and pipeline intelligence in regulated markets, including zero-entry activity capture and workflow configurability.
  - Sources:
    - <https://www.intapp.com/dealcloud/>
    - <https://www.intapp.com/dealcloud/ai/>

### What they still do not provide in-product
- no financing-readiness command center for sponsors
- no requirement / condition / evidence graph tied to export-finance workflows
- no durable meeting-to-commitment system that becomes project memory
- no cross-document financing narrative checker
- no policy-aware intelligence layer for EXIM / ECA-style readiness

## 5. MVP implications

The MVP should not try to look like a universal capital-project platform. It should behave like a financing-readiness operating system.

- Put the `readiness command center` at the center of the product.
- Treat `artifact + evidence + owner + blocker` as the primary data loop.
- Build `meeting intelligence` as structured project memory, not a transcript archive.
- Make `counterparty obligations` visible in one graph, especially for EPCs, off-takers, funders, and advisors.
- Add the first financing-specific alerts early:
  - LOI blocker
  - stale counterparty
  - document inconsistency
  - condition aging

## 6. Later-phase implications

- add live program and policy monitoring feeds
- add supply-chain and U.S.-content evidence layers
- add scenario modeling for contracting structure and funder conditions
- add external collaboration surfaces for EPC and advisor seats
- add delivery handoff so financing context survives into execution tools

## 7. Sources

- EXIM project-finance approach: <https://www.exim.gov/solutions/project-and-structured-finance/our-approach-to-project-finance>
- EXIM successful application guidance: <https://www.exim.gov/solutions/project-and-structured-finance/guidelines-for-submitting-successful-application>
- EXIM transactions page, updated September 15, 2025: <https://www.exim.gov/solutions/project-and-structured-finance/transactions>
- EXIM Project Vault announcement, February 2, 2026: <https://www.exim.gov/news/project-vault>
- EXIM critical minerals support page: <https://www.exim.gov/about/special-initiatives/ctep/critical-minerals>
- Make More in America: <https://grow.exim.gov/mmia-aquatech>
- Asana AI Teammates, September 25, 2025: <https://investors.asana.com/news-releases/news-release-details/asana-announces-new-ai-teammates-collaborative-agents-deliver>
- monday.com AI agents expansion, September 17, 2025: <https://ir.monday.com/news-and-events/news-releases/news-details/2025/monday-com-Expands-AI-Powered-Agents-CRM-Suite-and-Enterprise-Grade-Capabilities/default.aspx>
- Smartsheet Intelligent Work Management, November 5, 2025: <https://www.smartsheet.com/content-center/news/smartsheet-debuts-intelligent-work-management-unifying-ai-data-and-people>
- Smartsheet AI principles, March 9, 2026: <https://www.smartsheet.com/content-center/product-insights/product-updates/responsible-design-smartsheet-ai-principles-practices>
- Procore AI, November 20, 2024: <https://www.procore.com/press/procore-launches-procore-ai-with-new-agents-to-boost-construction-management-efficiency>
- Datasite Diligence: <https://www.datasite.com/en/products/diligence>
- Datasite Redaction AI: <https://www.datasite.com/en/resources/insights/accelerate-your-due-diligence-with-redaction-ai>
- Intapp DealCloud platform: <https://www.intapp.com/dealcloud/>
- Intapp Assist for DealCloud: <https://www.intapp.com/dealcloud/ai/>

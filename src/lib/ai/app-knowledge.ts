import {
  EXIM_REQUIREMENTS,
  LOI_CRITICAL_IDS,
  REQUIREMENT_CATEGORIES,
} from "@/lib/exim/requirements";
import { REQUIREMENT_STATUS_LABELS } from "@/types/requirements";
import type { ChatContextDocument } from "@/types/chat";

export interface AppKnowledgeEntry extends ChatContextDocument {
  readonly aliases: readonly string[];
}

const APP_GLOSSARY: readonly AppKnowledgeEntry[] = [
  {
    id: "glossary-project-owner",
    title: "Project owner / sponsor",
    snippet:
      "The company developing the infrastructure asset. Lodestar is built for the sponsor workflow from project concept through LOI submission and financial close.",
    sourceType: "app",
    url: "/projects",
    aliases: ["project owner", "sponsor", "developer"],
  },
  {
    id: "glossary-epc",
    title: "EPC",
    snippet:
      "Engineering, Procurement and Construction contractor. In Lodestar's EXIM context, the EPC must be American and the package must support EXIM US-content eligibility.",
    sourceType: "app",
    url: "/projects",
    aliases: ["epc", "engineering procurement construction", "contractor", "us content"],
  },
  {
    id: "glossary-offtaker",
    title: "Off-taker",
    snippet:
      "The entity contractually obligated to purchase the project's output. This is usually the core revenue counterparty in project finance.",
    sourceType: "app",
    url: "/projects",
    aliases: ["off-taker", "offtaker", "ppa buyer", "purchaser"],
  },
  {
    id: "glossary-loi",
    title: "LOI",
    snippet:
      "The EXIM Letter of Interest. Lodestar treats it as the first formal EXIM milestone and uses LOI-critical checklist items as gating blockers for readiness.",
    sourceType: "app",
    url: "/projects",
    aliases: ["loi", "letter of interest", "loi submission"],
  },
  {
    id: "glossary-final-commitment",
    title: "Final Commitment",
    snippet:
      "EXIM's binding financing approval after the LOI stage. Lodestar separates requirements needed by LOI from those that can wait until final commitment.",
    sourceType: "app",
    url: "/projects",
    aliases: ["final commitment", "binding approval", "commitment"],
  },
  {
    id: "glossary-cp",
    title: "Condition Precedent",
    snippet:
      "A gating requirement that must be satisfied before moving to the next phase. In Lodestar, blockers and pending requirements act as visible execution conditions precedent.",
    sourceType: "app",
    url: "/projects",
    aliases: ["cp", "condition precedent", "conditions precedent", "gating requirement"],
  },
  {
    id: "glossary-data-room",
    title: "Evidence workspace",
    snippet:
      "The structured evidence layer assembled for lender and project review. Lodestar treats uploaded files, linked external sources, and requirement mapping as one evidence workspace.",
    sourceType: "app",
    url: "/projects",
    aliases: ["evidence", "evidence workspace", "data room", "document repository", "submission package"],
  },
  {
    id: "glossary-readiness-score",
    title: "Readiness score",
    snippet:
      "A percentage showing how much of the EXIM-required checklist is in substantially final or executed form. The score is calculated in basis points across weighted requirements.",
    sourceType: "app",
    url: "/projects",
    aliases: ["readiness score", "score", "readiness", "basis points", "bps"],
  },
  {
    id: "glossary-sub-final",
    title: "Substantially final form",
    snippet:
      "EXIM's standard for documents that are near-executed rather than outline-level. In Lodestar, LOI-critical items must reach substantially final or better before the project is LOI-ready.",
    sourceType: "app",
    url: "/projects",
    aliases: ["substantially final", "sub final", "near executed", "draft vs substantially final"],
  },
  {
    id: "glossary-idc",
    title: "IDC",
    snippet:
      "Interest During Construction. Lodestar treats it as a financing cost affected by equipment lead times and schedule slippage.",
    sourceType: "app",
    url: "/projects",
    aliases: ["idc", "interest during construction"],
  },
  {
    id: "glossary-cls",
    title: "CLS",
    snippet:
      "Country Limitation Schedule. In Lodestar's EXIM context, it represents EXIM's country-by-country eligibility and coverage constraints.",
    sourceType: "app",
    url: "/projects",
    aliases: ["cls", "country limitation schedule", "country eligibility"],
  },
  {
    id: "glossary-political-only",
    title: "Political-only cover",
    snippet:
      "A narrower EXIM guarantee structure covering political risk but not commercial risk. Lodestar treats cover choice as a financing and risk-structuring decision.",
    sourceType: "app",
    url: "/projects",
    aliases: ["political-only", "political only", "political risk cover"],
  },
  {
    id: "glossary-comprehensive-cover",
    title: "Comprehensive cover",
    snippet:
      "A fuller EXIM guarantee covering both political and commercial risk. Lodestar distinguishes it from political-only cover when modeling financing structure decisions.",
    sourceType: "app",
    url: "/projects",
    aliases: ["comprehensive cover", "comprehensive", "commercial and political risk"],
  },
  {
    id: "glossary-greenfield",
    title: "Greenfield",
    snippet:
      "A new project rather than an expansion of an existing business. Lodestar treats greenfield status as part of the app's EXIM project-finance framing.",
    sourceType: "app",
    url: "/projects",
    aliases: ["greenfield", "new build", "new project"],
  },
  {
    id: "glossary-capex",
    title: "CAPEX",
    snippet:
      "Capital expenditure, meaning the total construction cost of the project. Lodestar displays CAPEX and ties it to budget and financing readiness analysis.",
    sourceType: "app",
    url: "/projects",
    aliases: ["capex", "capital expenditure", "project budget", "construction cost"],
  },
  {
    id: "app-requirement-statuses",
    title: "Requirement status progression",
    snippet: `Lodestar tracks requirement status as ${Object.values(REQUIREMENT_STATUS_LABELS).join(", ")}. LOI readiness only counts items that are substantially final, executed, or waived.`,
    sourceType: "app",
    url: "/projects",
    aliases: ["status", "requirement status", "in progress", "draft", "executed", "waived"],
  },
  {
    id: "app-loi-critical",
    title: "LOI-critical requirements",
    snippet: `Lodestar marks ${LOI_CRITICAL_IDS.length} EXIM checklist items as LOI-critical. Those items must reach substantially final or better before the project is treated as LOI-ready.`,
    sourceType: "app",
    url: "/projects",
    aliases: ["loi critical", "blockers", "loi blockers", "gating items"],
  },
  {
    id: "app-requirement-categories",
    title: "Requirement categories",
    snippet: `The EXIM checklist in Lodestar is organized into ${REQUIREMENT_CATEGORIES.join(", ")}. This category structure feeds scoring, checklist display, and planning.`,
    sourceType: "app",
    url: "/projects",
    aliases: ["categories", "requirement categories", "contracts", "financial", "studies", "permits", "corporate", "environmental social"],
  },
];

export const APP_KNOWLEDGE_BASE: readonly AppKnowledgeEntry[] = [
  ...APP_GLOSSARY,
  ...EXIM_REQUIREMENTS.map((requirement) => ({
    id: `requirement-${requirement.id}`,
    title: requirement.name,
    snippet: `${requirement.description} Category: ${requirement.category}. Phase required: ${requirement.phaseRequired.replace(/_/g, " ")}. ${requirement.isLoiCritical ? "This is LOI-critical." : "This is not LOI-critical."}`,
    sourceType: "app" as const,
    url: "/projects",
    aliases: [
      requirement.id,
      requirement.name,
      requirement.category,
      requirement.phaseRequired,
      requirement.isLoiCritical ? "loi critical" : "final commitment",
    ],
  })),
];

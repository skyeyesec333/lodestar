import type { ChatPresetQuestion } from "@/components/chat/ChatWidget";

export function getProjectDetailChatPresets(args: {
  projectName: string;
  dealType: string;
  scoreBps: number;
  loiReady: boolean;
  loiBlockerCount: number;
  conceptThesis?: string | null;
  targetOutcome?: string | null;
  knownUnknowns?: string | null;
  fatalFlaws?: string | null;
}): ChatPresetQuestion[] {
  const readinessPct = (args.scoreBps / 100).toFixed(1);
  const isExim = args.dealType === "exim_project_finance";

  return [
    {
      id: "project-next-step",
      label: "What should I do next?",
      question: `What is the next best action for ${args.projectName} based on a readiness score of ${readinessPct}%${args.targetOutcome ? ` and a target outcome of ${args.targetOutcome}` : ""}?`,
    },
    {
      id: "project-concept-framing",
      label: "How strong is the deal framing?",
      question: `Assess the current framing for ${args.projectName}${args.conceptThesis ? ` based on this thesis: ${args.conceptThesis}` : ""}${args.knownUnknowns ? ` Known unknowns: ${args.knownUnknowns}.` : ""} What is strong, weak, or missing?`,
    },
    {
      id: "project-loi-blockers",
      label: isExim
        ? args.loiReady
          ? "Why is this LOI-ready?"
          : "Which LOI blocker matters most?"
        : "What is blocking the next gate?",
      question: isExim
        ? args.loiReady
          ? `Why is ${args.projectName} considered LOI-ready, and what should I protect next?`
          : `What do the ${args.loiBlockerCount} current LOI blockers mean on this page, and which one should be resolved first?`
        : `What appears to be blocking the next gate for ${args.projectName}, and what should the team resolve first?`,
    },
    {
      id: "project-risk-check",
      label: "What could kill this deal?",
      question: args.fatalFlaws
        ? `Review the current fatal flaws for ${args.projectName}: ${args.fatalFlaws}. Which ones are most serious, and what evidence would change the outlook?`
        : `What fatal flaws or structural risks should the team test first on ${args.projectName}?`,
    },
    {
      id: "project-readiness-score",
      label: "How should I read this score?",
      question: `Explain how this project's ${readinessPct}% readiness score should be interpreted by an operator.`,
    },
    ...(isExim
      ? [
          {
            id: "project-exim-cover",
            label: "What does EXIM cover mean here?",
            question: "Explain the EXIM cover concept shown on this page and when political-only versus comprehensive cover matters.",
          },
        ]
      : []),
  ];
}

// Workspace-specific preset questions shown when Beacon detects the active section.
// workspace is one of: overview, concept, parties, capital, workplan, documents, execution
export function getWorkspaceChatPresets(
  workspace: string,
  projectName: string,
  dealType: string,
): ChatPresetQuestion[] {
  const isExim = dealType === "exim_project_finance";

  switch (workspace) {
    case "overview":
      return [
        {
          id: "ws-overview-gate",
          label: "What is the gate status telling me?",
          question: `Explain what the current gate status for ${projectName} means and what the team should do next to move it forward.`,
        },
        {
          id: "ws-overview-blockers",
          label: "What are the top blockers right now?",
          question: `What are the most important blockers on ${projectName} that the team should address before the next gate?`,
        },
        {
          id: "ws-overview-stage",
          label: "How should I interpret the current stage?",
          question: `What does the current stage mean operationally for ${projectName}, and what typically happens at this point in a deal?`,
        },
      ];

    case "concept":
      return [
        {
          id: "ws-concept-thesis",
          label: "How strong is the thesis?",
          question: `Based on the concept framing for ${projectName}, how strong is the sponsor thesis and what is the weakest assumption that needs to be tested?`,
        },
        {
          id: "ws-concept-gonogo",
          label: "Is this deal worth advancing?",
          question: `Looking at the concept for ${projectName}, what is the strongest case for advancing it and what would change a go to a no-go?`,
        },
        {
          id: "ws-concept-unknowns",
          label: "Which unknown matters most?",
          question: `For ${projectName}, which of the known unknowns in the concept has the highest potential to materially change the capital structure or program path?`,
        },
      ];

    case "parties":
      return [
        {
          id: "ws-parties-gaps",
          label: "Which roles are missing?",
          question: `For ${projectName}, which critical counterparty or stakeholder roles appear to be missing or underdeveloped for the current stage?`,
        },
        {
          id: "ws-parties-epc",
          label: isExim ? "What makes an EPC EXIM-eligible?" : "What should I look for in an EPC?",
          question: isExim
            ? `Explain what makes an EPC contractor eligible for US EXIM Bank financing on ${projectName} and what the >51% US-content requirement means in practice.`
            : `What are the key criteria for evaluating the EPC contractor on ${projectName} at this stage of development?`,
        },
        {
          id: "ws-parties-offtaker",
          label: "How do I evaluate the off-taker?",
          question: `What should the team be looking at when evaluating the off-taker for ${projectName}, and what are the key credit and contract risks?`,
        },
      ];

    case "capital":
      return [
        {
          id: "ws-capital-path",
          label: "Is this the right financing path?",
          question: `For ${projectName}, explain the implications of the current financing path choice and what would trigger a reconsideration.`,
        },
        {
          id: "ws-capital-funders",
          label: "What should I know about the funder pipeline?",
          question: `What are the key things to track in the funder pipeline for ${projectName} at this stage, and what typically stalls deals here?`,
        },
        ...(isExim
          ? [
              {
                id: "ws-capital-cover",
                label: "How do I choose between cover types?",
                question: `Explain when a sponsor on ${projectName} should choose comprehensive cover versus political-only cover from EXIM, and what the lender's perspective typically is.`,
              },
            ]
          : []),
      ];

    case "workplan":
      return [
        {
          id: "ws-workplan-priority",
          label: "What should I work on first?",
          question: `Given the current workplan for ${projectName}, which open requirements should the team tackle first and why?`,
        },
        {
          id: "ws-workplan-score",
          label: "Why is the readiness score where it is?",
          question: `Explain the current readiness score for ${projectName} — what is dragging it down the most and what would move it fastest?`,
        },
        {
          id: "ws-workplan-assignments",
          label: "How should I assign ownership?",
          question: `For the open workplan items on ${projectName}, what is the best approach for assigning ownership to drive accountability without creating coordination overhead?`,
        },
      ];

    case "documents":
      return [
        {
          id: "ws-evidence-gaps",
          label: "What evidence is missing?",
          question: `For ${projectName}, which evidence gaps are most critical to close before the next gate review?`,
        },
        {
          id: "ws-evidence-format",
          label: isExim ? "What form does EXIM need?" : "What form do lenders need?",
          question: isExim
            ? `Explain the EXIM standard of "substantially final form" — what does it mean for a document to meet this standard on ${projectName}?`
            : `What level of document completeness do lenders typically expect at this stage for ${projectName}, and what is considered work-in-progress versus submittable?`,
        },
        {
          id: "ws-evidence-vdr",
          label: "How should I organize the data room?",
          question: `What is the recommended structure and sequencing for organizing the evidence room on ${projectName} for lender and${isExim ? " EXIM" : " counterparty"} review?`,
        },
      ];

    case "execution":
      return [
        {
          id: "ws-execution-drift",
          label: "How do I read the drift signals?",
          question: `Explain what the weekly drift and critical path signals on ${projectName} are indicating and what the PM should do about them.`,
        },
        {
          id: "ws-execution-meetings",
          label: "Which meetings matter most?",
          question: `For ${projectName}, what types of meetings typically unlock the most progress at this stage and how should the team prioritize external engagement?`,
        },
        {
          id: "ws-execution-advance",
          label: "What needs to happen to advance the stage?",
          question: `What does ${projectName} need to accomplish before the team can advance to the next stage, and in what order should those items be addressed?`,
        },
      ];

    default:
      return [];
  }
}

export function getProjectsListChatPresets(): ChatPresetQuestion[] {
  return [
    {
      id: "portfolio-filters",
      label: "How should I use these filters?",
      question: "Explain how to use the portfolio filters on this page to triage projects quickly.",
    },
    {
      id: "portfolio-readiness",
      label: "What do these readiness bands mean?",
      question: "What do the readiness bands on the portfolio page mean operationally?",
    },
    {
      id: "portfolio-loi",
      label: "How should I read the LOI timing?",
      question: "How should I interpret the LOI countdown values across the project list?",
    },
  ];
}

const EXIM_CATEGORY_GUIDE = `EXIM requirement categories:
- corporate: Company formation, sponsor track record, board resolutions, legal opinions
- financial: Financial model, debt term sheets, DSCR covenants, sources and uses
- environmental: ESIA, environmental categorization, community engagement, resettlement plans
- studies: Feasibility study, independent engineer report, resource assessments
- commercial: EPC contract, off-take agreement, operation and maintenance contract, insurance
- insurance: Political risk insurance, completion guarantee, EXIM cover type determination`.trim();

export function buildMeetingActionItemsPrompt(
  transcript: string,
  projectName: string
): string {
  return `${EXIM_CATEGORY_GUIDE}

You are reviewing notes from a project finance meeting for ${projectName}.

Extract all action items from the following transcript. For each action item:
1. Write a concise action description
2. Identify the owner (person responsible) if mentioned — otherwise null
3. Identify the due date if mentioned — otherwise null
4. Suggest which EXIM requirement category the action relates to, choosing from: corporate, financial, environmental, studies, commercial, insurance — or null if none apply

Return a JSON array only. No prose, no markdown code fences. Use exactly this schema:
[
  {
    "action": "short description of the action item",
    "owner": "person name or null",
    "dueDate": "date text as stated or null",
    "requirementCategory": "one of: corporate | financial | environmental | studies | commercial | insurance | null"
  }
]

MEETING TRANSCRIPT:
${transcript}`;
}

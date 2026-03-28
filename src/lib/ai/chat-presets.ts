import type { ChatPresetQuestion } from "@/components/chat/ChatWidget";

export function getProjectDetailChatPresets(args: {
  projectName: string;
  scoreBps: number;
  loiReady: boolean;
  loiBlockerCount: number;
}): ChatPresetQuestion[] {
  const readinessPct = (args.scoreBps / 100).toFixed(1);

  return [
    {
      id: "project-next-step",
      label: "What should I do next?",
      question: `What is the next best action for ${args.projectName} based on a readiness score of ${readinessPct}%?`,
    },
    {
      id: "project-loi-blockers",
      label: args.loiReady ? "Why is this LOI-ready?" : "Which LOI blocker matters most?",
      question: args.loiReady
        ? `Why is ${args.projectName} considered LOI-ready, and what should I protect next?`
        : `What do the ${args.loiBlockerCount} current LOI blockers mean on this page, and which one should be resolved first?`,
    },
    {
      id: "project-sub-final",
      label: "What does 'substantially final' mean?",
      question: "What does 'substantially final' mean in this application, and why does it matter for readiness scoring?",
    },
    {
      id: "project-readiness-score",
      label: "How should I read this score?",
      question: `Explain how this project's ${readinessPct}% readiness score should be interpreted by an operator.`,
    },
    {
      id: "project-exim-cover",
      label: "What does EXIM cover mean here?",
      question: "Explain the EXIM cover concept shown on this page and when political-only versus comprehensive cover matters.",
    },
  ];
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

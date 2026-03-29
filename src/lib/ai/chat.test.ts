import { describe, expect, it, vi } from "vitest";
import {
  buildChatCitations,
  buildFallbackChatAnswer,
  buildChatPrompt,
  searchKnowledgeBase,
  type ChatRetrievalBundle,
} from "@/lib/ai/chat";

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {},
}));

const retrieval: ChatRetrievalBundle = {
  appContext: [
    {
      id: "app-1",
      title: "Readiness Score",
      snippet: "The readiness score tracks how many EXIM requirements are substantially final.",
      sourceType: "app",
      url: "https://app.example/readiness",
    },
  ],
  officialContext: [
    {
      id: "exim-1",
      title: "Country Limitation Schedule",
      snippet: "Official EXIM country eligibility schedule.",
      sourceType: "official_exim",
      url: "https://www.exim.gov/policies/country-limitation-schedule",
      lastVerifiedAt: "2026-03-28",
    },
  ],
};

describe("buildChatPrompt", () => {
  it("includes page context, history, and both context blocks", () => {
    const prompt = buildChatPrompt(
      {
        question: "What does the readiness score mean?",
        pageContext: "Project detail page for Kivu Hydro. Stage pre loi. Readiness 34.0%.",
        context: {
          page: "project_detail",
          projectId: "project-1",
          projectSlug: "kivu-hydro",
        },
        messages: [{ role: "user", content: "Explain this page." }],
      },
      {
        ...retrieval,
        appContext: [
          {
            id: "project-summary",
            title: "Kivu Hydro project summary",
            snippet: "Stage pre loi. Country RW. Sector power. Readiness 34.0%. 3 LOI blockers remain.",
            sourceType: "app",
            url: "/projects/kivu-hydro",
          },
          ...retrieval.appContext,
        ],
      }
    );

    expect(prompt).toContain("Current page context: Project detail page for Kivu Hydro.");
    expect(prompt).toContain("PROJECT CONTEXT");
    expect(prompt).toContain("Slug: kivu-hydro");
    expect(prompt).toContain("Stage: pre loi");
    expect(prompt).toContain("Readiness score: 34.0%");
    expect(prompt).toContain("USER: Explain this page.");
    expect(prompt).toContain("APP CONTEXT");
    expect(prompt).toContain("OFFICIAL EXIM CONTEXT");
    expect(prompt).toContain("Country Limitation Schedule");
  });

  it("falls back cleanly when there is no page context or history", () => {
    const prompt = buildChatPrompt(
      {
        question: "What can you answer?",
        messages: [],
      },
      { appContext: [], officialContext: [] }
    );

    expect(prompt).toContain("Current page context: not provided.");
    expect(prompt).toContain("PROJECT CONTEXT\n- None available.");
    expect(prompt).toContain("No previous messages.");
    expect(prompt).toContain("None available.");
  });
});

describe("buildChatCitations", () => {
  it("builds a flat citation list from retrieval documents with urls", () => {
    const citations = buildChatCitations(retrieval);

    expect(citations).toHaveLength(2);
    expect(citations[0]).toEqual({
      title: "Readiness Score",
      url: "https://app.example/readiness",
      sourceType: "app",
      lastVerifiedAt: undefined,
    });
    expect(citations[1]).toEqual({
      title: "Country Limitation Schedule",
      url: "https://www.exim.gov/policies/country-limitation-schedule",
      sourceType: "official_exim",
      lastVerifiedAt: "2026-03-28",
    });
  });

  it("skips documents without urls", () => {
    const citations = buildChatCitations({
      appContext: [
        {
          id: "app-2",
          title: "No Link",
          snippet: "This should not produce a citation.",
          sourceType: "app",
        },
      ],
      officialContext: [],
    });

    expect(citations).toEqual([]);
  });

  it("deduplicates citations with the same url", () => {
    const citations = buildChatCitations({
      appContext: [
        {
          id: "app-1",
          title: "Projects",
          snippet: "App route for projects.",
          sourceType: "app",
          url: "/projects",
        },
      ],
      officialContext: [
        {
          id: "app-2",
          title: "Projects duplicate",
          snippet: "Repeated route from another retrieval source.",
          sourceType: "app",
          url: "/projects",
        },
      ],
    });

    expect(citations).toHaveLength(1);
    expect(citations[0]).toEqual({
      title: "Projects",
      url: "/projects",
      sourceType: "app",
      lastVerifiedAt: undefined,
    });
  });
});

describe("searchKnowledgeBase", () => {
  it("returns app context for core Lodestar vocabulary", async () => {
    const docs = await searchKnowledgeBase({
      question: "What does substantially final mean for LOI readiness?",
      pageContext: "Project detail page.",
      messages: [],
    });

    expect(docs.length).toBeGreaterThan(0);
    expect(docs.some((doc) => doc.title === "Substantially final form")).toBe(true);
    expect(docs.some((doc) => doc.title === "LOI")).toBe(true);
  });

  it("returns requirement documents for checklist-specific questions", async () => {
    const docs = await searchKnowledgeBase({
      question: "Explain the EPC contract requirement and US content analysis.",
      pageContext: "Requirements section.",
      messages: [],
    });

    expect(docs.some((doc) => doc.title === "EPC Contract")).toBe(true);
    expect(docs.some((doc) => doc.title === "US Content Analysis & Certification")).toBe(true);
  });
});

describe("buildFallbackChatAnswer", () => {
  it("returns a conversational next-step answer instead of raw snippet concatenation", () => {
    const answer = buildFallbackChatAnswer(
      {
        question: "What should I do next?",
        pageContext: "Project detail page.",
        messages: [],
      },
      {
        appContext: [
          {
            id: "summary",
            title: "Kisongo project summary",
            snippet: "Stage pre loi. Country TZ. Sector power. Readiness 34.0%. 7 LOI blockers remain.",
            sourceType: "app",
          },
          {
            id: "blockers",
            title: "Kisongo LOI blockers",
            snippet:
              "Current LOI blockers: EPC Contract, Host Government Implementation Agreement, Financial Model, US Content Analysis & Certification, Independent Engineer's Report.",
            sourceType: "app",
          },
        ],
        officialContext: [],
      }
    );

    expect(answer).toContain("The next best action is to move EPC Contract");
    expect(answer).toContain("34.0");
    expect(answer).not.toContain("Stage pre loi. Country TZ. Sector power.");
  });

  it("explains score interpretation in a more operator-facing way", () => {
    const answer = buildFallbackChatAnswer(
      {
        question: "How should I read this score?",
        messages: [],
      },
      {
        appContext: [
          {
            id: "summary",
            title: "Delta project summary",
            snippet: "Stage pre loi. Country TZ. Sector power. Readiness 34.0%. 7 LOI blockers remain.",
            sourceType: "app",
          },
        ],
        officialContext: [],
      }
    );

    expect(answer).toContain("34.0% readiness should be read as a document-maturity signal");
    expect(answer).toContain("not as proof the transaction is de-risked");
  });
});

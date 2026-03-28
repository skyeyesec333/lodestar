import { describe, expect, it } from "vitest";
import {
  buildChatCitations,
  buildChatPrompt,
  searchKnowledgeBase,
  type ChatRetrievalBundle,
} from "@/lib/ai/chat";

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
        pageContext: "Project detail page for Kivu Hydro.",
        messages: [{ role: "user", content: "Explain this page." }],
      },
      retrieval
    );

    expect(prompt).toContain("Current page context: Project detail page for Kivu Hydro.");
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

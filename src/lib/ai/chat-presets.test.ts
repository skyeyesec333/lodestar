import { describe, expect, it } from "vitest";
import {
  getProjectDetailChatPresets,
  getProjectsListChatPresets,
  buildMeetingActionItemsPrompt,
} from "@/lib/ai/chat-presets";

describe("getProjectDetailChatPresets", () => {
  it("returns project-specific prompts with readiness details", () => {
    const presets = getProjectDetailChatPresets({
      projectName: "Kivu Hydro",
      dealType: "exim_project_finance",
      scoreBps: 5234,
      loiReady: false,
      loiBlockerCount: 3,
    });

    // EXIM deals return 6 presets (5 base + 1 EXIM cover item)
    expect(presets).toHaveLength(6);
    expect(presets[0]?.question).toContain("Kivu Hydro");
    expect(presets[0]?.question).toContain("52.3%");
    // project-loi-blockers is index 2 (after next-step and concept-framing)
    expect(presets[2]?.question).toContain("3 current LOI blockers");
  });

  it("switches the blocker prompt when the project is LOI-ready", () => {
    const presets = getProjectDetailChatPresets({
      projectName: "Delta Port",
      dealType: "exim_project_finance",
      scoreBps: 9000,
      loiReady: true,
      loiBlockerCount: 0,
    });

    expect(presets[2]?.question).toContain("considered LOI-ready");
  });
});

describe("getProjectsListChatPresets", () => {
  it("returns portfolio-oriented presets", () => {
    const presets = getProjectsListChatPresets();

    expect(presets).toHaveLength(3);
    expect(presets.map((preset) => preset.label)).toEqual([
      "How should I use these filters?",
      "What do these readiness bands mean?",
      "How should I read the LOI timing?",
    ]);
  });
});

describe("buildMeetingActionItemsPrompt", () => {
  const TRANSCRIPT =
    "Alice will draft the EPC term sheet by Friday. Bob needs to follow up with the off-taker on the PPA credit support.";
  const PROJECT = "Kivu Hydro";

  it("includes the transcript in the output", () => {
    const prompt = buildMeetingActionItemsPrompt(TRANSCRIPT, PROJECT);
    expect(prompt).toContain(TRANSCRIPT);
  });

  it("includes the project name in the output", () => {
    const prompt = buildMeetingActionItemsPrompt(TRANSCRIPT, PROJECT);
    expect(prompt).toContain(PROJECT);
  });

  it("contains the word 'action' (case-insensitive)", () => {
    const prompt = buildMeetingActionItemsPrompt(TRANSCRIPT, PROJECT);
    expect(prompt.toLowerCase()).toContain("action");
  });

  it("contains the JSON schema hint for the action field", () => {
    const prompt = buildMeetingActionItemsPrompt(TRANSCRIPT, PROJECT);
    expect(prompt).toContain('"action":');
  });
});

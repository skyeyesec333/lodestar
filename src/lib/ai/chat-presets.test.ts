import { describe, expect, it } from "vitest";
import {
  getProjectDetailChatPresets,
  getProjectsListChatPresets,
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

    expect(presets).toHaveLength(5);
    expect(presets[0]?.question).toContain("Kivu Hydro");
    expect(presets[0]?.question).toContain("52.3%");
    expect(presets[1]?.question).toContain("3 current LOI blockers");
  });

  it("switches the blocker prompt when the project is LOI-ready", () => {
    const presets = getProjectDetailChatPresets({
      projectName: "Delta Port",
      dealType: "exim_project_finance",
      scoreBps: 9000,
      loiReady: true,
      loiBlockerCount: 0,
    });

    expect(presets[1]?.question).toContain("considered LOI-ready");
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

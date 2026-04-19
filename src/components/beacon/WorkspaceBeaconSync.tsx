"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBeacon } from "./BeaconProvider";

// Each per-section route maps to a Beacon "workspace" label used for AI
// context routing. Kept in sync with `src/components/projects/projectSections.ts`.
const SEGMENT_TO_WORKSPACE: Record<string, string> = {
  overview: "overview",
  concept: "concept",
  team: "utilities",
  parties: "parties",
  capital: "capital",
  workplan: "workplan",
  evidence: "documents",
  execution: "execution",
};

export function WorkspaceBeaconSync() {
  const { setActiveWorkspace } = useBeacon();
  const pathname = usePathname() ?? "";

  useEffect(() => {
    // Expected shape: /projects/[slug] or /projects/[slug]/<segment>
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] !== "projects" || segments.length < 2) {
      setActiveWorkspace(null);
      return;
    }
    const segment = segments[2];
    if (!segment) {
      setActiveWorkspace("summary");
      return;
    }
    setActiveWorkspace(SEGMENT_TO_WORKSPACE[segment] ?? null);
  }, [pathname, setActiveWorkspace]);

  return null;
}

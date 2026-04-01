"use client";

import { useEffect, useRef } from "react";
import { useBeacon } from "./BeaconProvider";

// Section IDs mapped to their workspace name for Beacon context.
// Order matters — must match the visual order on the page.
const WORKSPACE_SECTIONS: Array<{ id: string; workspace: string }> = [
  { id: "section-collaborators", workspace: "utilities" },
  { id: "section-overview",      workspace: "overview" },
  { id: "section-concept",       workspace: "concept" },
  { id: "section-stakeholders",  workspace: "parties" },
  { id: "section-capital",       workspace: "capital" },
  { id: "section-workplan",      workspace: "workplan" },
  { id: "section-documents",     workspace: "documents" },
  { id: "section-execution",     workspace: "execution" },
];

export function WorkspaceBeaconSync() {
  const { setActiveWorkspace } = useBeacon();
  const ticking = useRef(false);

  useEffect(() => {
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const threshold = window.innerHeight * 0.35;
        let current: string | null = null;

        for (const { id, workspace } of WORKSPACE_SECTIONS) {
          const el = document.getElementById(id);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top <= threshold) {
            current = workspace;
          } else {
            break;
          }
        }

        setActiveWorkspace(current);
        ticking.current = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [setActiveWorkspace]);

  return null;
}

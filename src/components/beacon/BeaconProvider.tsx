"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { WALKTHROUGH_STEPS } from "@/lib/ai/walkthrough-synthesis";

export type BeaconTab = "assistant" | "signals" | "documents";

type BeaconContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  activeTab: BeaconTab;
  setActiveTab: (tab: BeaconTab) => void;
  activeWorkspace: string | null;
  setActiveWorkspace: (workspace: string | null) => void;
  // Walkthrough state
  walkthroughActive: boolean;
  walkthroughStep: number;
  startWalkthrough: () => void;
  advanceWalkthrough: () => void;
  retreatWalkthrough: () => void;
  jumpToStep: (step: number) => void;
  stopWalkthrough: () => void;
};

const BeaconContext = createContext<BeaconContextValue | null>(null);

export function BeaconProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BeaconTab>("assistant");
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  const startWalkthrough = useCallback(() => {
    setWalkthroughActive(true);
    setWalkthroughStep(0);
    setOpen(true);
    setActiveTab("assistant");
  }, []);

  const advanceWalkthrough = useCallback(() => {
    setWalkthroughStep((prev) => Math.min(prev + 1, WALKTHROUGH_STEPS.length - 1));
  }, []);

  const retreatWalkthrough = useCallback(() => {
    setWalkthroughStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const jumpToStep = useCallback((step: number) => {
    setWalkthroughStep(Math.max(0, Math.min(step, WALKTHROUGH_STEPS.length - 1)));
  }, []);

  const stopWalkthrough = useCallback(() => {
    setWalkthroughActive(false);
    setWalkthroughStep(0);
  }, []);

  return (
    <BeaconContext.Provider
      value={{
        open, setOpen,
        activeTab, setActiveTab,
        activeWorkspace, setActiveWorkspace,
        walkthroughActive, walkthroughStep,
        startWalkthrough, advanceWalkthrough, retreatWalkthrough, jumpToStep, stopWalkthrough,
      }}
    >
      {children}
    </BeaconContext.Provider>
  );
}

export function useBeacon(): BeaconContextValue {
  const ctx = useContext(BeaconContext);
  if (!ctx) throw new Error("useBeacon must be used inside BeaconProvider");
  return ctx;
}

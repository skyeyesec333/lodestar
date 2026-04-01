"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type BeaconTab = "assistant" | "signals" | "documents";

type BeaconContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  activeTab: BeaconTab;
  setActiveTab: (tab: BeaconTab) => void;
  activeWorkspace: string | null;
  setActiveWorkspace: (workspace: string | null) => void;
};

const BeaconContext = createContext<BeaconContextValue | null>(null);

export function BeaconProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BeaconTab>("assistant");
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);

  return (
    <BeaconContext.Provider value={{ open, setOpen, activeTab, setActiveTab, activeWorkspace, setActiveWorkspace }}>
      {children}
    </BeaconContext.Provider>
  );
}

export function useBeacon(): BeaconContextValue {
  const ctx = useContext(BeaconContext);
  if (!ctx) throw new Error("useBeacon must be used inside BeaconProvider");
  return ctx;
}

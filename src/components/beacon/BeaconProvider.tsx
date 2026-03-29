"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type BeaconTab = "assistant" | "signals" | "documents";

type BeaconContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  activeTab: BeaconTab;
  setActiveTab: (tab: BeaconTab) => void;
};

const BeaconContext = createContext<BeaconContextValue | null>(null);

export function BeaconProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<BeaconTab>("assistant");

  return (
    <BeaconContext.Provider value={{ open, setOpen, activeTab, setActiveTab }}>
      {children}
    </BeaconContext.Provider>
  );
}

export function useBeacon(): BeaconContextValue {
  const ctx = useContext(BeaconContext);
  if (!ctx) throw new Error("useBeacon must be used inside BeaconProvider");
  return ctx;
}

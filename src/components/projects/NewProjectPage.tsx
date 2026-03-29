"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EximEligibilityScreen,
  type EligibilityResult,
} from "@/components/projects/EximEligibilityScreen";
import { OnboardingWizard } from "@/components/projects/OnboardingWizard";

export function NewProjectPage() {
  const router = useRouter();
  const [screenDone, setScreenDone] = useState(false);
  const [initialSector, setInitialSector] = useState<string | undefined>(undefined);

  function handlePass(result: EligibilityResult) {
    if (result.sector) {
      setInitialSector(result.sector);
    }
    setScreenDone(true);
  }

  function handleExit() {
    router.push("/projects");
  }

  if (!screenDone) {
    return <EximEligibilityScreen onPass={handlePass} onExit={handleExit} />;
  }

  return (
    <OnboardingWizard
      initialSector={initialSector}
      onComplete={(slug) => router.push(`/projects/${slug}`)}
      onBack={handleExit}
    />
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DealTypeScreen, type DealTypeValue } from "@/components/projects/DealTypeScreen";
import {
  EximEligibilityScreen,
  type EligibilityResult,
} from "@/components/projects/EximEligibilityScreen";
import { OnboardingWizard } from "@/components/projects/OnboardingWizard";

type FlowStep = "deal_type" | "exim_eligibility" | "wizard";

export function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>("deal_type");
  const [dealType, setDealType] = useState<DealTypeValue | undefined>(undefined);
  const [initialSector, setInitialSector] = useState<string | undefined>(undefined);

  function handleDealTypeSelect(result: { dealType: DealTypeValue }) {
    setDealType(result.dealType);
    if (result.dealType === "exim_project_finance") {
      setStep("exim_eligibility");
    } else {
      setStep("wizard");
    }
  }

  function handleEximPass(result: EligibilityResult) {
    if (result.sector) setInitialSector(result.sector);
    setStep("wizard");
  }

  function handleExit() {
    router.push("/projects");
  }

  if (step === "deal_type") {
    return <DealTypeScreen onSelect={handleDealTypeSelect} onExit={handleExit} />;
  }

  if (step === "exim_eligibility") {
    return (
      <EximEligibilityScreen
        onPass={handleEximPass}
        onExit={handleExit}
      />
    );
  }

  return (
    <OnboardingWizard
      dealType={dealType}
      initialSector={initialSector}
      onComplete={(slug) => router.push(`/projects/${slug}`)}
      onBack={handleExit}
    />
  );
}

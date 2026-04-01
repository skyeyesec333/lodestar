"use client";

import { useRouter } from "next/navigation";
import { OnboardingWizard } from "@/components/projects/OnboardingWizard";

export function NewProjectPage({ templateId }: { templateId?: string }) {
  const router = useRouter();

  function handleExit() {
    router.push("/projects");
  }

  return (
    <OnboardingWizard
      templateId={templateId}
      onComplete={(slug) => router.push(`/projects/${slug}`)}
      onBack={handleExit}
    />
  );
}

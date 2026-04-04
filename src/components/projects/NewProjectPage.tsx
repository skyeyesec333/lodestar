"use client";

import { useRouter } from "next/navigation";
import { OnboardingWizard, type ExistingProjectOption } from "@/components/projects/OnboardingWizard";

export function NewProjectPage({
  templateId,
  existingProjects,
}: {
  templateId?: string;
  existingProjects?: ExistingProjectOption[];
}) {
  const router = useRouter();

  function handleExit() {
    router.push("/projects");
  }

  return (
    <OnboardingWizard
      templateId={templateId}
      existingProjects={existingProjects}
      onComplete={(slug) => router.push(`/projects/${slug}?new=1`)}
      onBack={handleExit}
    />
  );
}

import { auth } from "@clerk/nextjs/server";
import { NewProjectPage } from "@/components/projects/NewProjectPage";
import { getProjectsByUser } from "@/lib/db/projects";
import type { ExistingProjectOption } from "@/components/projects/OnboardingWizard";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const templateId = getSingleParam(resolvedSearchParams.template);

  const { userId } = await auth();
  let existingProjects: ExistingProjectOption[] = [];

  if (userId) {
    const result = await getProjectsByUser(userId);
    if (result.ok) {
      existingProjects = result.value.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
      }));
    }
  }

  return <NewProjectPage templateId={templateId} existingProjects={existingProjects} />;
}

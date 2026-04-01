import { NewProjectPage } from "@/components/projects/NewProjectPage";

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
  return <NewProjectPage templateId={templateId} />;
}

import { auth } from "@clerk/nextjs/server";
import { getProjectDealParties } from "@/lib/db/deal-parties";
import { getProjectDocuments } from "@/lib/db/documents";
import { getProjectFunders } from "@/lib/db/funders";
import { getProjectMilestones } from "@/lib/db/milestones";
import { getProjectBySlug } from "@/lib/db/projects";
import { getProjectRequirements } from "@/lib/db/requirements";
import { getProjectStakeholders } from "@/lib/db/stakeholders";

function formatRole(roleType: string): string {
  return roleType.replace(/_/g, " ");
}

function sortByString<T>(
  items: readonly T[],
  getKey: (item: T) => string
): T[] {
  return [...items].sort((a, b) => getKey(a).localeCompare(getKey(b)));
}

function sortByDateDesc<T>(
  items: readonly T[],
  getDate: (item: T) => Date | null | undefined
): T[] {
  return [...items].sort((a, b) => {
    const left = getDate(a)?.getTime() ?? -Infinity;
    const right = getDate(b)?.getTime() ?? -Infinity;
    if (left !== right) return right - left;
    return 0;
  });
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { slug } = await context.params;
  const projectResult = await getProjectBySlug(slug, userId);

  if (!projectResult.ok) {
    return new Response(
      projectResult.error.code === "NOT_FOUND" ? "Not found" : "Failed to load project",
      { status: projectResult.error.code === "NOT_FOUND" ? 404 : 500 }
    );
  }

  const project = projectResult.value;
  const [
    requirementsResult,
    stakeholdersResult,
    documentsResult,
    fundersResult,
    milestonesResult,
    dealPartiesResult,
  ] = await Promise.all([
    getProjectRequirements(project.id),
    getProjectStakeholders(project.id),
    getProjectDocuments(project.id),
    getProjectFunders(project.id),
    getProjectMilestones(project.id),
    getProjectDealParties(project.id),
  ]);

  if (!requirementsResult.ok) {
    return new Response(requirementsResult.error.message, { status: 500 });
  }
  if (!stakeholdersResult.ok) {
    return new Response(stakeholdersResult.error.message, { status: 500 });
  }
  if (!documentsResult.ok) {
    return new Response(documentsResult.error.message, { status: 500 });
  }
  if (!fundersResult.ok) {
    return new Response(fundersResult.error.message, { status: 500 });
  }
  if (!milestonesResult.ok) {
    return new Response(milestonesResult.error.message, { status: 500 });
  }
  if (!dealPartiesResult.ok) {
    return new Response(dealPartiesResult.error.message, { status: 500 });
  }

  const stakeholdersById = new Map<
    string,
    {
      name: string;
      title: string | null;
      organization: string | null;
      roles: string[];
    }
  >();

  for (const stakeholder of stakeholdersResult.value) {
    const existing = stakeholdersById.get(stakeholder.id);
    const roleLabel = formatRole(stakeholder.roleType);

    if (existing) {
      if (!existing.roles.includes(roleLabel)) {
        existing.roles.push(roleLabel);
      }
      continue;
    }

    stakeholdersById.set(stakeholder.id, {
      name: stakeholder.name,
      title: stakeholder.title,
      organization: stakeholder.organizationName,
      roles: [roleLabel],
    });
  }

  const requirements = sortByString(
    requirementsResult.value.map((requirement) => ({
      id: requirement.requirementId,
      name: requirement.name,
      category: requirement.category,
      phase: requirement.phaseRequired,
      status: requirement.status,
      sortOrder: requirement.sortOrder,
    })),
    (requirement) => `${String(requirement.sortOrder).padStart(4, "0")}-${requirement.id}`
  ).map(({ sortOrder: _sortOrder, ...requirement }) => requirement);

  const stakeholders = sortByString(
    [...stakeholdersById.values()].map((stakeholder) => ({
      ...stakeholder,
      roles: [...new Set(stakeholder.roles)].sort((a, b) => a.localeCompare(b)),
    })),
    (stakeholder) =>
      `${stakeholder.name.toLowerCase()}-${stakeholder.title?.toLowerCase() ?? ""}-${stakeholder.organization?.toLowerCase() ?? ""}`
  );

  const documents = sortByDateDesc(
    documentsResult.value.map((document) => ({
      name: document.filename,
      state: document.state,
      uploadedAt: document.createdAt,
      storagePath: document.storagePath,
    })),
    (document) => document.uploadedAt
  ).map(({ storagePath: _storagePath, ...document }) => document);

  const funders = sortByString(
    fundersResult.value.map((funder) => ({
      name: funder.organizationName,
      type: funder.funderType,
      stage: funder.engagementStage,
      amountUsdCents: funder.amountUsdCents,
      openConditions: funder.conditions.filter((condition) =>
        condition.status === "open" || condition.status === "in_progress"
      ).length,
    })),
    (funder) =>
      `${funder.name.toLowerCase()}-${funder.type.toLowerCase()}-${funder.stage.toLowerCase()}`
  );

  const milestones = sortByString(
    milestonesResult.value.map((milestone) => ({
      name: milestone.name,
      targetDate: milestone.targetDate,
      completedAt: milestone.completedAt,
      linkedPhase: milestone.linkedPhase,
      sortOrder: milestone.sortOrder,
    })),
    (milestone) => `${String(milestone.sortOrder).padStart(4, "0")}-${milestone.name.toLowerCase()}`
  ).map(({ sortOrder: _sortOrder, ...milestone }) => milestone);

  const dealParties = sortByString(
    dealPartiesResult.value.map((party) => ({
      organizationName: party.organizationName,
      partyType: party.partyType,
    })),
    (party) => `${party.organizationName.toLowerCase()}-${party.partyType.toLowerCase()}`
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    metadata: {
      counts: {
        requirements: requirements.length,
        stakeholders: stakeholders.length,
        documents: documents.length,
        funders: funders.length,
        milestones: milestones.length,
        dealParties: dealParties.length,
      },
    },
    deal: {
      name: project.name,
      slug: project.slug,
      stage: project.stage,
      sector: project.sector,
      capexUsdCents: project.capexUsdCents == null ? null : Number(project.capexUsdCents),
      countryCode: project.countryCode,
      readinessScore: project.cachedReadinessScore,
    },
    requirements,
    stakeholders,
    documents,
    funders,
    milestones,
    dealParties,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${project.slug}-export.json"`,
    },
  });
}

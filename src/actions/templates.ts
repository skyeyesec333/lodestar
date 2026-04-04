"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProjectTemplateById } from "@/lib/templates/index";
import { createProjectRecord } from "@/lib/db/projects";
import { createMilestone } from "@/lib/db/milestones";
import type { Result } from "@/types";
import type {
  ProjectSector,
  DealType,
} from "@prisma/client";

const SECTOR_MAP: Record<string, ProjectSector> = {
  power: "power",
  transport: "transport",
  water: "water",
  telecom: "telecom",
  mining: "mining",
  other: "other",
};

const DEAL_TYPE_MAP: Record<string, DealType> = {
  EXIM: "exim_project_finance",
  DFI: "development_finance",
  PE: "private_equity",
};

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

const cloneTemplateSchema = z.object({
  templateId: z.string().min(1),
  projectName: z.string().min(2, "Project name must be at least 2 characters").max(120),
  countryCode: z
    .string()
    .length(2, "Country code must be exactly 2 characters")
    .transform((v) => v.toUpperCase()),
});

export async function cloneTemplate(
  templateId: string,
  projectName: string,
  countryCode: string
): Promise<Result<{ slug: string }>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in to clone a template." },
    };
  }

  const parsed = cloneTemplateSchema.safeParse({ templateId, projectName, countryCode });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: first?.message ?? "Invalid input." },
    };
  }

  const template = getProjectTemplateById(parsed.data.templateId);
  if (!template) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: `Template "${templateId}" not found.` },
    };
  }

  const sector = SECTOR_MAP[template.sector] ?? "other";
  const dealType = DEAL_TYPE_MAP[template.dealType] ?? "other";
  const capexUsdCents =
    template.estimatedCapexUsd != null
      ? BigInt(Math.round(template.estimatedCapexUsd * 100))
      : null;

  const projectResult = await createProjectRecord({
    name: parsed.data.projectName,
    slug: generateSlug(parsed.data.projectName),
    description: template.description,
    countryCode: parsed.data.countryCode,
    sector,
    dealType,
    capexUsdCents,
    eximCoverType: null,
    environmentalCategory: null,
    programPath: "standard",
    stage: "concept",
    targetLoiDate: null,
    targetCloseDate: null,
    ownerClerkId: userId,
    userRole: null,
    subNationalLocation: null,
  });

  if (!projectResult.ok) return projectResult;

  const projectId = projectResult.value.id;
  const slug = projectResult.value.slug;
  const today = new Date();

  for (let i = 0; i < template.milestones.length; i++) {
    const milestone = template.milestones[i];
    if (!milestone) continue;

    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + milestone.daysFromStart);

    await createMilestone(projectId, userId, {
      name: milestone.name,
      linkedPhase: milestone.phaseTarget,
      targetDate,
      sortOrder: (i + 1) * 100,
    });
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${slug}`);

  return { ok: true, value: { slug } };
}

"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  addStakeholderToProject,
  removeStakeholderRole,
  updateStakeholderInProject,
} from "@/lib/db/stakeholders";
import { recordActivity } from "@/lib/db/activity";
import type { Result } from "@/types";
import type { StakeholderRoleType } from "@prisma/client";

const ROLE_VALUES = [
  "epc_contact",
  "offtaker_contact",
  "legal_counsel",
  "exim_officer",
  "government_liaison",
  "financial_advisor",
  "community_rep",
  "sponsor_team",
  "other",
] as const;

const addSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1).max(120),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  title: z.string().max(120).nullable().optional(),
  organizationName: z.string().max(120).nullable().optional(),
  roleType: z.enum(ROLE_VALUES),
  isPrimary: z.boolean().default(false),
});

const removeSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  roleId: z.string().min(1),
  stakeholderName: z.string().min(1),
  replacementRoleId: z.string().min(1).optional().nullable(),
  replacementStakeholderName: z.string().min(1).optional().nullable(),
});

const updateSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  roleId: z.string().min(1),
  name: z.string().min(1).max(120),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  title: z.string().max(120).nullable().optional(),
  organizationName: z.string().max(120).nullable().optional(),
  roleDescription: z.string().max(1000).nullable().optional(),
});

async function verifyOwnership(projectId: string, userId: string) {
  return db.project.findFirst({
    where: { id: projectId, ownerClerkId: userId },
    select: { id: true },
  });
}

export async function addStakeholder(input: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You must be signed in." } };
  }

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." },
    };
  }

  const { projectId, slug, name, email, phone, title, organizationName, roleType, isPrimary } =
    parsed.data;

  if (!(await verifyOwnership(projectId, userId))) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Project not found." } };
  }

  const result = await addStakeholderToProject(projectId, {
    name,
    email: email ?? null,
    phone: phone ?? null,
    title: title ?? null,
    organizationName: organizationName ?? null,
    roleType: roleType as StakeholderRoleType,
    isPrimary,
  });

  if (!result.ok) return result;

  const roleLabel = roleType.replace(/_/g, " ");
  await recordActivity(projectId, userId, "stakeholder_added",
    `${name} added as ${roleLabel}`,
    { name, roleType }
  );

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

export async function removeStakeholder(input: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You must be signed in." } };
  }

  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." },
    };
  }

  const { projectId, slug, roleId, stakeholderName, replacementRoleId, replacementStakeholderName } = parsed.data;

  if (!(await verifyOwnership(projectId, userId))) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Project not found." } };
  }

  const result = await removeStakeholderRole(roleId, projectId, replacementRoleId ?? null);
  if (!result.ok) return result;

  await recordActivity(projectId, userId, "stakeholder_removed",
    replacementStakeholderName
      ? `${stakeholderName} removed; primary reassigned to ${replacementStakeholderName}`
      : `${stakeholderName} removed`,
    { roleId, replacementRoleId: replacementRoleId ?? null }
  );

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

export async function updateStakeholder(input: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You must be signed in." } };
  }

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." },
    };
  }

  const { projectId, slug, roleId, name, email, phone, title, organizationName, roleDescription } =
    parsed.data;

  if (!(await verifyOwnership(projectId, userId))) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Project not found." } };
  }

  const result = await updateStakeholderInProject(projectId, roleId, {
    name,
    email: email ?? null,
    phone: phone ?? null,
    title: title ?? null,
    organizationName: organizationName ?? null,
    roleDescription: roleDescription ?? null,
  });
  if (!result.ok) return result;

  await recordActivity(projectId, userId, "stakeholder_updated",
    `${name} updated`,
    { roleId, name }
  );

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

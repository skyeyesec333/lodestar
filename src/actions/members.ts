"use server";

import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/index";
import {
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from "@/lib/db/members";
import type { Result } from "@/types";

const inviteSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  clerkUserId: z.string().min(1),
  role: z.enum(["editor", "viewer"]),
});

const changeRoleSchema = z.object({
  memberId: z.string().min(1),
  slug: z.string().min(1),
  role: z.enum(["editor", "viewer"]),
});

const removeMemberSchema = z.object({
  memberId: z.string().min(1),
  slug: z.string().min(1),
});

async function assertOwner(
  projectId: string,
  userId: string
): Promise<Result<void>> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerClerkId: true },
  });
  if (!project) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Project not found." } };
  }
  if (project.ownerClerkId !== userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "Only the project owner can manage collaborators." } };
  }
  return { ok: true, value: undefined };
}

export async function inviteMember(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in." } };
  }

  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const { projectId, slug, clerkUserId, role } = parsed.data;

  if (clerkUserId === userId) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "You cannot invite yourself." } };
  }

  const ownerCheck = await assertOwner(projectId, userId);
  if (!ownerCheck.ok) return ownerCheck;

  const result = await addProjectMember({ projectId, clerkUserId, role, invitedBy: userId });
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

const inviteByEmailSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]),
});

export async function inviteMemberByEmail(raw: unknown): Promise<Result<void>> {
  const { userId: callerId } = await auth();
  if (!callerId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in." } };
  }

  const parsed = inviteByEmailSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const { projectId, slug, email, role } = parsed.data;

  const ownerCheck = await assertOwner(projectId, callerId);
  if (!ownerCheck.ok) return ownerCheck;

  const client = await clerkClient();
  const users = await client.users.getUserList({ emailAddress: [email] });

  if (users.data.length === 0) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "No Lodestar account found for that email address.",
      },
    };
  }

  const clerkUserId = users.data[0].id;

  if (clerkUserId === callerId) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "You cannot invite yourself." } };
  }

  const result = await addProjectMember({ projectId, clerkUserId, role, invitedBy: callerId });
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

export async function changeMemberRole(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in." } };
  }

  const parsed = changeRoleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const { memberId, slug, role } = parsed.data;

  // Look up the member to get projectId for the owner check
  const member = await db.projectMember.findUnique({
    where: { id: memberId },
    select: { projectId: true },
  });
  if (!member) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Member not found." } };
  }

  const ownerCheck = await assertOwner(member.projectId, userId);
  if (!ownerCheck.ok) return ownerCheck;

  const result = await updateProjectMemberRole(memberId, role);
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

export async function removeMember(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in." } };
  }

  const parsed = removeMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const { memberId, slug } = parsed.data;

  const member = await db.projectMember.findUnique({
    where: { id: memberId },
    select: { projectId: true },
  });
  if (!member) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Member not found." } };
  }

  const ownerCheck = await assertOwner(member.projectId, userId);
  if (!ownerCheck.ok) return ownerCheck;

  const result = await removeProjectMember(memberId);
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

import type { TeamMember } from "@/types/collaboration";
import type { ProjectMemberRow } from "@/lib/db/members";

function roleLabel(role: TeamMember["role"]): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "editor":
      return "Editor";
    case "viewer":
    default:
      return "Viewer";
  }
}

function fallbackMemberName(clerkUserId: string, role: TeamMember["role"]): string {
  return `${roleLabel(role)} ${clerkUserId.slice(-4).toUpperCase()}`;
}

export function buildTeamMembers(
  ownerClerkId: string,
  members: ProjectMemberRow[],
  resolvedUsers: Map<string, { fullName: string; firstName: string; imageUrl: string }>
): TeamMember[] {
  const deduped = new Map<string, TeamMember>();
  const ownerResolved = resolvedUsers.get(ownerClerkId);
  deduped.set(ownerClerkId, {
    clerkUserId: ownerClerkId,
    name: ownerResolved?.fullName ?? fallbackMemberName(ownerClerkId, "owner"),
    email: null,
    imageUrl: ownerResolved?.imageUrl ?? null,
    role: "owner",
  });

  for (const member of members) {
    const role = member.role === "editor" ? "editor" : "viewer";
    if (member.clerkUserId === ownerClerkId) continue;
    const resolved = resolvedUsers.get(member.clerkUserId);
    deduped.set(member.clerkUserId, {
      clerkUserId: member.clerkUserId,
      name: resolved?.fullName ?? fallbackMemberName(member.clerkUserId, role),
      email: null,
      imageUrl: resolved?.imageUrl ?? null,
      role,
    });
  }

  return Array.from(deduped.values());
}

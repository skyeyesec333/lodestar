import { clerkClient } from "@clerk/nextjs/server";

export type ResolvedUser = {
  clerkUserId: string;
  fullName: string;
  firstName: string;
  imageUrl: string;
};

export async function resolveClerkUsers(
  clerkUserIds: string[]
): Promise<Map<string, ResolvedUser>> {
  if (clerkUserIds.length === 0) return new Map();

  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({
      userId: clerkUserIds,
      limit: 100,
    });
    const map = new Map<string, ResolvedUser>();
    for (const user of response.data) {
      map.set(user.id, {
        clerkUserId: user.id,
        fullName:
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.emailAddresses[0]?.emailAddress ||
          user.id.slice(-8),
        firstName: user.firstName ?? "",
        imageUrl: user.imageUrl,
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

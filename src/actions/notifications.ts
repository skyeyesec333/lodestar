"use server";

import { auth } from "@clerk/nextjs/server";
import { getRecentNotifications, type NotificationItem } from "@/lib/db/notifications";
import type { Result } from "@/types";

export async function getNotificationsAction(): Promise<Result<NotificationItem[]>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "You must be signed in to view notifications.",
      },
    };
  }

  return getRecentNotifications(userId);
}

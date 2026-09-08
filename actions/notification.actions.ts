"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, PermissionError, requireAuthenticatedUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationCenterData {
  unreadCount: number;
  notifications: NotificationItem[];
}

export type NotificationFilter = "all" | "unread";

export async function getNotificationCenterData(
  limit = 40,
  filter: NotificationFilter = "all",
): Promise<NotificationCenterData> {
  const user = await getCurrentUser();

  if (!user || user.isLocked) {
    return {
      unreadCount: 0,
      notifications: [],
    };
  }

  const userId = user.id;
  const notificationWhere = {
    userId,
    ...(filter === "unread" ? { readAt: null } : {}),
  };

  const [unreadCount, notifications] = await Promise.all([
    prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    }),
    prisma.notification.findMany({
      where: notificationWhere,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    unreadCount,
    notifications,
  };
}

export async function markNotificationAsRead(notificationId: string) {
  let userId: string;
  try {
    userId = (await requireAuthenticatedUser()).id;
  } catch (error: unknown) {
    if (error instanceof PermissionError) {
      return;
    }
    throw error;
  }

  if (!userId) {
    return;
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId.trim(),
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/notifications");
}

export async function markAllNotificationsAsRead() {
  let userId: string;
  try {
    userId = (await requireAuthenticatedUser()).id;
  } catch (error: unknown) {
    if (error instanceof PermissionError) {
      return;
    }
    throw error;
  }

  if (!userId) {
    return;
  }

  await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/notifications");
}

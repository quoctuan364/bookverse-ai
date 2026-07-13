import { NotificationType, type Prisma, type PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

interface NotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  href?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function createNotification(input: NotificationInput, client: DbClient = prisma) {
  await client.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? NotificationType.SYSTEM,
      href: input.href ?? null,
      metadata: input.metadata,
    },
  });
}

export async function createNotifications(inputs: NotificationInput[], client: DbClient = prisma) {
  if (inputs.length === 0) {
    return;
  }

  await client.notification.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? NotificationType.SYSTEM,
      href: input.href ?? null,
      metadata: input.metadata,
    })),
  });
}

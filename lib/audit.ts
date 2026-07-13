import type { Prisma, PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

interface AuditLogInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

export async function recordAuditLog(input: AuditLogInput, client: DbClient = prisma) {
  await client.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
    },
  });
}

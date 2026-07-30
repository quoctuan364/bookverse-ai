"use server";

import { buildIntegrationReadiness } from "@/lib/integration-readiness";
import { requireAdminUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export async function getIntegrationReadiness() {
  await requireAdminUser();

  let databaseReachable = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseReachable = true;
  } catch {
    databaseReachable = false;
  }

  const items = buildIntegrationReadiness(process.env, databaseReachable);
  return {
    items,
    summary: {
      ready: items.filter((item) => item.status === "READY").length,
      partial: items.filter((item) => item.status === "PARTIAL").length,
      missing: items.filter((item) => item.status === "MISSING").length,
    },
    checkedAt: new Date(),
  };
}

import { PrismaClient } from "@prisma/client";

import { DEMO_ACCOUNT_EMAILS } from "@/lib/demo-accounts";

const prisma = new PrismaClient();

function databaseNameFromUrl(databaseUrl?: string): string {
  if (!databaseUrl) throw new Error("Thiếu DATABASE_URL.");
  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/u, "").split("/")[0] ?? "");
  if (!databaseName.startsWith("bookverse_")) {
    throw new Error(`Từ chối cập nhật database ngoài BookVerse: ${databaseName || "(trống)"}.`);
  }
  return databaseName;
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  const databaseName = databaseNameFromUrl(process.env.DATABASE_URL);
  const confirmation = process.argv
    .find((argument) => argument.startsWith("--confirm-database="))
    ?.slice("--confirm-database=".length);

  if (execute && confirmation !== databaseName) {
    throw new Error(
      `Để cập nhật tài khoản demo, thêm --execute --confirm-database=${databaseName}.`,
    );
  }

  const mappings = Object.entries(DEMO_ACCOUNT_EMAILS).map(([userId, email]) => ({
    userId,
    email,
  }));
  const existing = await prisma.user.findMany({
    where: { id: { in: mappings.map((mapping) => mapping.userId) } },
    orderBy: { id: "asc" },
    select: { id: true, email: true, name: true, role: true },
  });
  if (existing.length !== mappings.length) {
    throw new Error(`Thiếu tài khoản demo: tìm thấy ${existing.length}/${mappings.length}.`);
  }

  if (execute) {
    await prisma.$transaction(
      mappings.map((mapping) =>
        prisma.user.update({
          where: { id: mapping.userId },
          data: { email: mapping.email },
        }),
      ),
    );
  }

  console.log(JSON.stringify({
    mode: execute ? "execute" : "dry-run",
    databaseName,
    accounts: existing.map((account) => ({
      id: account.id,
      name: account.name,
      role: account.role,
      before: account.email,
      after: DEMO_ACCOUNT_EMAILS[account.id as keyof typeof DEMO_ACCOUNT_EMAILS],
    })),
  }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

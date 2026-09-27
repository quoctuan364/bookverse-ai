import { spawnSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let shouldSeed = false;

try {
  const bookCount = await prisma.book.count();
  shouldSeed = bookCount === 0;

  console.log(
    shouldSeed
      ? "[render-seed] Database mới, bắt đầu tạo dữ liệu demo."
      : `[render-seed] Đã có ${bookCount} sách, bỏ qua bước seed.`
  );
} finally {
  await prisma.$disconnect();
}

if (shouldSeed) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["run", "db:seed"], {
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { detectCategoryProfile, loadCategoryProfiles } from "@/lib/category-profiles";
import { validateParentAssignments } from "@/lib/category-hierarchy";

const TEMP_DATABASE = "bookverse_ai_category_legacy_test";

interface CommandResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface DatabaseExistsRow {
  exists: boolean;
}

function checksum(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function redact(value: string): string {
  return value.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]");
}

function runNpx(args: string[], databaseUrl: string, allowFailure = false): CommandResult {
  const runner = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npx";
  const runnerArgs = process.platform === "win32" ? ["/d", "/s", "/c", "npx", ...args] : args;
  const result = spawnSync(runner, runnerArgs, {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      ALLOWED_DESTRUCTIVE_DATABASES: TEMP_DATABASE,
    },
    windowsHide: true,
  });
  const spawnError = result.error?.message ?? "";
  const exitCode = result.status ?? 1;
  const command = `npx ${args.join(" ")}`;
  const commandResult = {
    command,
    exitCode,
    stdout: redact(result.stdout ?? ""),
    stderr: redact([result.stderr ?? "", spawnError].filter(Boolean).join("\n")),
  };
  if (!allowFailure && exitCode !== 0) {
    throw new Error(`${command} thất bại (${exitCode}): ${commandResult.stderr || commandResult.stdout}`);
  }
  return commandResult;
}

function changedRows(result: CommandResult): number {
  const match = result.stdout.match(/"changedRows"\s*:\s*(\d+)/);
  if (!match) throw new Error(`Không đọc được changedRows từ ${result.command}.`);
  return Number(match[1]);
}

async function snapshot(client: PrismaClient) {
  const [categories, bookRelations] = await Promise.all([
    client.category.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        level: true,
        canonicalKey: true,
        canonicalName: true,
      },
    }),
    client.book.findMany({
      orderBy: { id: "asc" },
      select: { id: true, categoryId: true },
    }),
  ]);
  return {
    categories,
    bookRelations,
    identityChecksum: checksum(categories.map(({ id, name, slug }) => ({ id, name, slug }))),
    hierarchyChecksum: checksum(
      categories.map(({ id, parentId, level, canonicalKey, canonicalName }) => ({
        id,
        parentId,
        level,
        canonicalKey,
        canonicalName,
      })),
    ),
    relationChecksum: checksum(bookRelations),
  };
}

async function writeReport(report: Record<string, unknown>): Promise<string> {
  const outputDirectory = path.resolve(process.cwd(), "outputs", "categories");
  await mkdir(outputDirectory, { recursive: true });
  const stem = new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
  const reportPath = path.join(outputDirectory, `${stem}-legacy-integration.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  return reportPath;
}

async function main(): Promise<void> {
  const adminUrlValue = process.env.CATEGORY_LEGACY_TEST_ADMIN_URL;
  assert.ok(
    adminUrlValue,
    "Thiếu CATEGORY_LEGACY_TEST_ADMIN_URL trỏ tới database postgres trên server test.",
  );
  assert.equal(
    process.env.CATEGORY_LEGACY_TEST_ALLOW_CREATE,
    TEMP_DATABASE,
    `Phải đặt CATEGORY_LEGACY_TEST_ALLOW_CREATE=${TEMP_DATABASE} để xác nhận tạo database tạm.`,
  );
  const adminUrl = new URL(adminUrlValue);
  assert.ok(["postgres:", "postgresql:"].includes(adminUrl.protocol), "Admin URL phải là PostgreSQL.");
  assert.equal(
    decodeURIComponent(adminUrl.pathname.replace(/^\/+/, "")),
    "postgres",
    "Admin URL phải trỏ tới database postgres, không phải database dữ liệu.",
  );
  const tempUrl = new URL(adminUrl.toString());
  tempUrl.pathname = "/" + TEMP_DATABASE;
  tempUrl.searchParams.set("schema", "public");

  const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  let tempClient: PrismaClient | null = null;
  let createdByThisRun = false;
  let reportPath = "";
  try {
    const existing = await admin.$queryRawUnsafe<DatabaseExistsRow[]>(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = '${TEMP_DATABASE}') AS exists`,
    );
    assert.equal(
      existing[0]?.exists,
      false,
      `Database tạm ${TEMP_DATABASE} đã tồn tại; từ chối ghi đè hoặc xóa dữ liệu không do lượt này tạo.`,
    );
    await admin.$executeRawUnsafe(`CREATE DATABASE "${TEMP_DATABASE}"`);
    createdByThisRun = true;

    const migration = runNpx(["prisma", "migrate", "deploy"], tempUrl.toString());
    tempClient = new PrismaClient({ datasources: { db: { url: tempUrl.toString() } } });
    const profiles = await loadCategoryProfiles();
    const legacy = profiles.find((profile) => profile.profileName === "legacy-demo-24");
    assert.ok(legacy, "Không tải được profile legacy-demo-24.");

    await tempClient.category.createMany({
      data: legacy.entries.map((entry) => ({
        id: entry.expectedId,
        name: entry.expectedName,
        slug: entry.expectedSlug,
      })),
    });
    await tempClient.book.createMany({
      data: legacy.entries.map((entry, index) => ({
        id: `LEGACY-BOOK-${String(index + 1).padStart(3, "0")}`,
        title: `Sách kiểm thử Category ${index + 1}`,
        slug: `legacy-category-book-${index + 1}`,
        authorName: "BookVerse Integration",
        price: "100000",
        categoryId: entry.expectedId,
      })),
    });

    const initial = await snapshot(tempClient);
    assert.equal(initial.categories.length, 24);
    assert.equal(initial.bookRelations.length, 24);
    detectCategoryProfile(initial.categories, profiles);

    const dryRun = runNpx(
      ["tsx", "scripts/backfill_category_hierarchy.ts", "--dry-run"],
      tempUrl.toString(),
    );
    const afterDryRun = await snapshot(tempClient);
    assert.equal(afterDryRun.hierarchyChecksum, initial.hierarchyChecksum, "Dry-run đã ghi Category.");
    assert.equal(afterDryRun.relationChecksum, initial.relationChecksum, "Dry-run đổi Book–Category.");

    const execute = runNpx(
      ["tsx", "scripts/backfill_category_hierarchy.ts", "--execute"],
      tempUrl.toString(),
    );
    assert.equal(changedRows(execute), 24, "Execute đầu phải ghi đúng 24 Category.");
    const afterExecute = await snapshot(tempClient);
    const hierarchy = validateParentAssignments(afterExecute.categories);
    assert.equal(afterExecute.categories.filter((category) => category.parentId === null).length, 24);
    assert.equal(afterExecute.categories.filter((category) => category.parentId !== null).length, 0);
    assert.equal(
      afterExecute.categories.filter((category) => category.canonicalKey && category.canonicalName).length,
      24,
    );
    assert.equal(hierarchy.orphans.length, 0);
    assert.equal(hierarchy.cycles.length, 0);
    assert.equal(hierarchy.selfParents.length, 0);
    assert.equal(afterExecute.identityChecksum, initial.identityChecksum);
    assert.equal(afterExecute.relationChecksum, initial.relationChecksum);
    assert.equal(
      afterExecute.categories.find((category) => category.id === "C001")?.canonicalKey,
      "artificial-intelligence",
      "C001 legacy không được dùng mapping C001 của ultra-2200.",
    );

    const executeAgain = runNpx(
      ["tsx", "scripts/backfill_category_hierarchy.ts", "--execute"],
      tempUrl.toString(),
    );
    assert.equal(changedRows(executeAgain), 0, "Execute lần hai phải idempotent.");

    await tempClient.category.update({
      where: { id: "C001" },
      data: { name: "AI & Machine Learning (tampered)" },
    });
    const beforeTamperAttempt = await snapshot(tempClient);
    const tamperedExecute = runNpx(
      ["tsx", "scripts/backfill_category_hierarchy.ts", "--execute"],
      tempUrl.toString(),
      true,
    );
    assert.notEqual(tamperedExecute.exitCode, 0, "Profile bị đổi tên phải fail.");
    assert.match(tamperedExecute.stderr, /fail-closed|không khớp chính xác/i);
    const afterTamperAttempt = await snapshot(tempClient);
    assert.equal(
      afterTamperAttempt.hierarchyChecksum,
      beforeTamperAttempt.hierarchyChecksum,
      "Tampered profile gây partial update.",
    );
    await tempClient.category.update({
      where: { id: "C001" },
      data: { name: legacy.entries[0].expectedName },
    });

    const finalSnapshot = await snapshot(tempClient);
    const report = {
      status: "PASS",
      database: TEMP_DATABASE,
      categoryCount: finalSnapshot.categories.length,
      rootCount: finalSnapshot.categories.filter((category) => category.parentId === null).length,
      childCount: finalSnapshot.categories.filter((category) => category.parentId !== null).length,
      mappedCount: finalSnapshot.categories.filter(
        (category) => category.canonicalKey && category.canonicalName,
      ).length,
      bookCount: finalSnapshot.bookRelations.length,
      identityChecksumUnchanged: finalSnapshot.identityChecksum === initial.identityChecksum,
      relationChecksumUnchanged: finalSnapshot.relationChecksum === initial.relationChecksum,
      dryRun: { exitCode: dryRun.exitCode, changedRows: changedRows(dryRun) },
      execute: { exitCode: execute.exitCode, changedRows: changedRows(execute) },
      executeAgain: { exitCode: executeAgain.exitCode, changedRows: changedRows(executeAgain) },
      tamperedProfile: {
        exitCode: tamperedExecute.exitCode,
        partialUpdate: false,
      },
      idCollisionUsesLegacyMeaning: true,
      migrationExitCode: migration.exitCode,
    };
    reportPath = await writeReport(report);
    console.log("[PASS] Legacy Category integration trên database tạm");
    console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (tempClient) await tempClient.$disconnect();
    if (createdByThisRun) {
      await admin.$queryRawUnsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEMP_DATABASE}' AND pid <> pg_backend_pid()`,
      );
      await admin.$executeRawUnsafe(`DROP DATABASE "${TEMP_DATABASE}"`);
      console.log(`[CLEANUP] Đã drop ${TEMP_DATABASE} sau khi lưu report ${reportPath || "(run thất bại)"}.`);
    }
    await admin.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Lỗi integration không xác định.";
  console.error("[FAIL] " + redact(message));
  process.exitCode = 1;
});

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ListingStatus, OrderStatus } from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";
import prisma from "@/lib/prisma";
import { isValidStock, planInventoryBackfill } from "@/lib/stock-policy";

interface SourceListing {
  id: number;
  stock: number;
}

interface SourceDataset {
  listings: SourceListing[];
}

interface BackfillOptions {
  mode: "dry-run" | "execute";
  sourcePath: string;
}

function parseOptions(args: string[]): BackfillOptions {
  const dryRun = args.includes("--dry-run");
  const execute = args.includes("--execute");
  const sourceArgument = args.find((argument) => argument.startsWith("--source="));
  const knownFlags = new Set(["--dry-run", "--execute"]);
  const unknownFlags = args.filter(
    (argument) => argument.startsWith("--") && !knownFlags.has(argument) && !argument.startsWith("--source="),
  );

  if (dryRun === execute) {
    throw new Error("Phải chọn chính xác một mode: --dry-run hoặc --execute.");
  }
  if (unknownFlags.length > 0) {
    throw new Error("Flag không được hỗ trợ: " + unknownFlags.join(", "));
  }

  return {
    mode: dryRun ? "dry-run" : "execute",
    sourcePath: path.resolve(
      process.cwd(),
      sourceArgument?.slice("--source=".length) || "data/json/bookverse_ultra_seed_2200.json",
    ),
  };
}

function datasetListingId(value: number): string {
  return `L${String(value).padStart(5, "0")}`;
}

function checksum(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sameDate(left: Date | null, right: Date | null): boolean {
  return left?.getTime() === right?.getTime();
}

async function writeReport(report: Record<string, unknown>, mode: string): Promise<string> {
  const outputDirectory = path.resolve(process.cwd(), "outputs", "stock");
  await mkdir(outputDirectory, { recursive: true });
  const stem = new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
  const reportPath = path.join(outputDirectory, stem + "-stock-backfill-" + mode + ".json");
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  return reportPath;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const startedAt = new Date();
  const target = assertSafeDatabase({
    operation: options.mode === "execute" ? "destructive" : "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  if (!["bookverse_ai_test", "bookverse_ai_deploy_rehearsal"].includes(target.databaseName)) {
    throw new Error(`Stock backfill không được phép chạy trên database ${target.databaseName}.`);
  }

  const sourceContent = await readFile(options.sourcePath, "utf-8");
  const source = JSON.parse(sourceContent) as SourceDataset;
  if (!Array.isArray(source.listings)) {
    throw new Error("Dataset nguồn không có mảng listings.");
  }

  const sourceStockById = new Map<string, number>();
  const invalidSourceRows: Array<{ id: unknown; stock: unknown }> = [];
  const duplicateSourceIds: string[] = [];
  for (const listing of source.listings) {
    const id = datasetListingId(listing.id);
    if (!Number.isInteger(listing.id) || listing.id < 1 || !isValidStock(listing.stock)) {
      invalidSourceRows.push({ id: listing.id, stock: listing.stock });
      continue;
    }
    if (sourceStockById.has(id)) {
      duplicateSourceIds.push(id);
      continue;
    }
    sourceStockById.set(id, listing.stock);
  }
  if (invalidSourceRows.length > 0 || duplicateSourceIds.length > 0) {
    throw new Error(
      `Dataset stock không hợp lệ: invalid=${invalidSourceRows.length}, duplicate=${duplicateSourceIds.length}.`,
    );
  }

  const listings = await prisma.listing.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      status: true,
      stock: true,
      soldAt: true,
      updatedAt: true,
    },
  });
  const legacyIds = listings
    .filter((listing) => !sourceStockById.has(listing.id))
    .map((listing) => listing.id);
  const soldIds = listings.filter((listing) => listing.status === ListingStatus.SOLD).map((listing) => listing.id);
  const inventoryHistoryIds = [...new Set([...soldIds, ...legacyIds])];
  const reservedItems = inventoryHistoryIds.length
    ? await prisma.orderItem.findMany({
        where: {
          listingId: { in: inventoryHistoryIds },
          order: {
            paymentMethod: { not: null },
            status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
          },
        },
        select: {
          listingId: true,
          quantity: true,
          order: { select: { createdAt: true } },
        },
      })
    : [];
  const latestReservedAtById = new Map<string, Date>();
  const activeReservedQuantityById = new Map<string, number>();
  for (const item of reservedItems) {
    if (!item.listingId) continue;
    activeReservedQuantityById.set(
      item.listingId,
      (activeReservedQuantityById.get(item.listingId) ?? 0) + item.quantity,
    );
    const current = latestReservedAtById.get(item.listingId);
    if (!current || item.order.createdAt > current) {
      latestReservedAtById.set(item.listingId, item.order.createdAt);
    }
  }

  const decisions = listings.map((listing) => {
    const sourceStock = sourceStockById.get(listing.id);
    return {
      listing,
      matchedDataset: sourceStock !== undefined,
      activeReservedQuantity: activeReservedQuantityById.get(listing.id) ?? 0,
      decision: planInventoryBackfill({
        ...listing,
        sourceStock,
        latestReservedAt: latestReservedAtById.get(listing.id) ?? null,
        activeReservedQuantity: activeReservedQuantityById.get(listing.id) ?? 0,
      }),
    };
  });
  const changed = decisions.filter(
    ({ listing, decision }) =>
      listing.stock !== decision.stock ||
      listing.status !== decision.status ||
      !sameDate(listing.soldAt, decision.soldAt),
  );
  const unmatched = decisions.filter(({ matchedDataset }) => !matchedDataset);
  const soldWithoutSource = decisions.filter(
    ({ decision }) => decision.source === "SOLD_STATUS" && decision.needsReview,
  );
  const beforeSnapshot = listings.map((listing) => ({
    id: listing.id,
    status: listing.status,
    stock: listing.stock,
    soldAt: listing.soldAt?.toISOString() ?? null,
  }));

  console.log("[DATABASE] " + target.maskedUrl);
  console.log("[SOURCE] SHA-256 " + createHash("sha256").update(sourceContent).digest("hex"));
  console.log(
    "[PLAN] " +
      JSON.stringify({
        total: listings.length,
        matched: decisions.filter(({ matchedDataset }) => matchedDataset).length,
        soldRule: decisions.filter(({ decision }) => decision.source === "SOLD_STATUS").length,
        unmatched: unmatched.length,
        changed: changed.length,
      }),
  );

  if (options.mode === "execute" && changed.length > 0) {
    assertSafeDatabase({ operation: "destructive", databaseUrl: process.env.DATABASE_URL });
    await prisma.$transaction(
      async (tx) => {
        for (const { listing, decision } of changed) {
          await tx.listing.update({
            where: { id: listing.id },
            data: {
              stock: decision.stock,
              soldAt: decision.soldAt,
              status: decision.status as ListingStatus,
            },
          });
        }
      },
      { maxWait: 10_000, timeout: 120_000 },
    );
  }

  const afterListings = await prisma.listing.findMany({
    orderBy: { id: "asc" },
    select: { id: true, status: true, stock: true, soldAt: true },
  });
  const afterSnapshot = afterListings.map((listing) => ({
    id: listing.id,
    status: listing.status,
    stock: listing.stock,
    soldAt: listing.soldAt?.toISOString() ?? null,
  }));
  if (afterListings.length !== listings.length || afterListings.some((listing) => listing.stock < 0)) {
    throw new Error("Invariant backfill thất bại: count thay đổi hoặc có stock âm.");
  }
  if (options.mode === "dry-run" && checksum(beforeSnapshot) !== checksum(afterSnapshot)) {
    throw new Error("Dry-run đã làm thay đổi dữ liệu Listing.");
  }

  const finishedAt = new Date();
  const stocks = afterListings.map((listing) => listing.stock);
  const report = {
    mode: options.mode,
    databaseName: target.databaseName,
    sourceFile: path.relative(process.cwd(), options.sourcePath).replace(/\\/g, "/"),
    sourceChecksum: createHash("sha256").update(sourceContent).digest("hex"),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    plan: {
      total: listings.length,
      matchedDataset: decisions.filter(({ matchedDataset }) => matchedDataset).length,
      soldStatusRule: decisions.filter(({ decision }) => decision.source === "SOLD_STATUS").length,
      unmatchedLegacy: unmatched.length,
      changed: changed.length,
      unchanged: listings.length - changed.length,
    },
    review: {
      unmatchedListingIds: unmatched.map(({ listing }) => listing.id),
      soldWithoutSourceIds: soldWithoutSource.map(({ listing }) => listing.id),
      legacyWithActiveOrders: unmatched
        .filter(({ activeReservedQuantity }) => activeReservedQuantity > 0)
        .map(({ listing, activeReservedQuantity }) => ({ listingId: listing.id, activeReservedQuantity })),
      legacyOversubscribed: unmatched
        .filter(({ activeReservedQuantity }) => activeReservedQuantity > 1)
        .map(({ listing, activeReservedQuantity }) => ({ listingId: listing.id, activeReservedQuantity })),
    },
    after: {
      listingCount: afterListings.length,
      minStock: stocks.length ? Math.min(...stocks) : null,
      maxStock: stocks.length ? Math.max(...stocks) : null,
      zeroStock: afterListings.filter((listing) => listing.stock === 0).length,
      sold: afterListings.filter((listing) => listing.status === ListingStatus.SOLD).length,
      checksum: checksum(afterSnapshot),
    },
    changedRows: options.mode === "execute" ? changed.length : 0,
  };
  const reportPath = await writeReport(report, options.mode);
  console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

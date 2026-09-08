import assert from "node:assert/strict";

import { TargetType } from "@prisma/client";

import { getCatalogData } from "@/actions/catalog.actions";
import { assertSafeDatabase } from "@/lib/database-safety";
import prisma from "@/lib/prisma";

async function main(): Promise<void> {
  const target = assertSafeDatabase({ operation: "read-only", databaseUrl: process.env.DATABASE_URL });
  assert.equal(target.databaseName, "bookverse_ai_test", "Integration G2 chỉ được đọc bookverse_ai_test.");

  const before = await Promise.all([
    prisma.order.count(),
    prisma.review.count(),
    prisma.interaction.count(),
    prisma.interactionEvent.count(),
    prisma.recommendation.count(),
  ]);

  const firstPage = await getCatalogData({ source: "real", page: 1 });
  const secondPage = await getCatalogData({ source: "real", page: 2 });
  assert.equal(firstPage.totalBooks, 3_046);
  assert.equal(firstPage.pageSize, 24);
  assert.equal(firstPage.books.length, 24);
  assert.equal(secondPage.books.length, 24);
  assert.equal(new Set([...firstPage.books, ...secondPage.books].map((book) => book.id)).size, 48);
  assert.ok(firstPage.books.every((book) => book.catalogSource === "CURATED_REAL"));
  assert.ok(firstPage.books.every((book) => book.metadataBadge === "Sách tuyển chọn"));
  assert.ok(firstPage.books.every((book) => book.priceLabel === "Giá BookVerse"));

  const demoPage = await getCatalogData({ source: "demo", page: 1 });
  assert.equal(demoPage.totalBooks, firstPage.totalBooks);
  assert.ok(demoPage.books.every((book) => book.catalogSource === "CURATED_REAL"));

  const vietnamese = await getCatalogData({ source: "real", language: "vie", page: 1 });
  const missingLanguage = await getCatalogData({ source: "real", language: "NOT_AVAILABLE", page: 1 });
  const withIsbn = await getCatalogData({ source: "real", hasIsbn: true, page: 1 });
  assert.equal(vietnamese.totalBooks, 259);
  assert.equal(missingLanguage.totalBooks, 34);
  assert.equal(withIsbn.totalBooks, 2_343);

  const realBookIds = await prisma.bookSourceMetadata.findMany({ select: { bookId: true } });
  const ids = realBookIds.map((row) => row.bookId);
  const [recommendations, dailyRecommendations, requestItems] = await Promise.all([
    prisma.recommendation.count({
      where: { targetType: TargetType.BOOK, targetId: { in: ids } },
    }),
    prisma.dailyRecommendation.count({ where: { bookId: { in: ids } } }),
    prisma.recommendationRequestItem.count({ where: { bookId: { in: ids } } }),
  ]);
  assert.deepEqual(
    { recommendations, dailyRecommendations, requestItems },
    { recommendations: 0, dailyRecommendations: 0, requestItems: 0 },
  );

  const after = await Promise.all([
    prisma.order.count(),
    prisma.review.count(),
    prisma.interaction.count(),
    prisma.interactionEvent.count(),
    prisma.recommendation.count(),
  ]);
  assert.deepEqual(after, before, "Verifier read-only không được thay đổi các bảng hành vi.");

  console.log(
    JSON.stringify(
      {
        status: "VERIFIED",
        database: target.databaseName,
        pagination: { pageSize: firstPage.pageSize, firstTwoPagesUnique: 48 },
        filters: {
          curated: firstPage.totalBooks,
          syntheticDemoPubliclyBlocked: true,
          vietnameseEdition: vietnamese.totalBooks,
          missingLanguage: missingLanguage.totalBooks,
          hasIsbn: withIsbn.totalBooks,
        },
        recommendationIsolation: { recommendations, dailyRecommendations, requestItems },
        behaviorCountsUnchanged: before,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[FAILED] ${message.replace(/postgres(?:ql)?:\/\/\S+/giu, "[DATABASE_URL_REDACTED]")}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

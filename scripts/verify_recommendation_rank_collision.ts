import assert from "node:assert/strict";

import { RecommendationSurface } from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";
import prisma from "@/lib/prisma";
import { createRecommendationRequestSnapshot } from "@/lib/recommendation-telemetry";

async function main(): Promise<void> {
  const target = assertSafeDatabase({
    operation: "destructive",
    databaseUrl: process.env.DATABASE_URL,
    allowedDatabases: process.env.ALLOWED_DESTRUCTIVE_DATABASES,
  });
  assert.equal(target.databaseName, "bookverse_ai_test");

  const marker = `F1-1-RANK-COLLISION-${Date.now()}-${process.pid}`;
  const userId = `${marker}-USER`;
  const before = await prisma.recommendationRequest.count();
  const books = await prisma.book.findMany({
    orderBy: { id: "asc" },
    take: 2,
    select: { id: true },
  });
  assert.equal(books.length, 2, "Cần tối thiểu hai Book để tái hiện rank collision.");

  let requestId: string | null = null;
  try {
    await prisma.user.create({ data: { id: userId, name: "F1.1 rank collision fixture" } });

    // Đây là dữ liệu thật từng làm /api/recommendations bị requestId=null:
    // hai Book khác nhau nhưng cùng rank gốc được dùng thẳng làm position.
    try {
      requestId = await createRecommendationRequestSnapshot({
        userId,
        algorithmVersion: "f1-1-reproduction-before-fix",
        surface: RecommendationSurface.RECOMMENDATION_API,
        candidateProfile: "rank-collision-reproduction",
        filterProfile: "deployment-r1-observed-data-shape",
        items: [
          { bookId: books[0].id, position: 1, score: 9, evidence: "current" },
          { bookId: books[1].id, position: 1, score: 8, evidence: "legacy" },
        ],
      });
    } catch {
      // API R1 bắt lỗi persistence và tiếp tục trả recommendation với requestId null.
      requestId = null;
    }

    assert.ok(
      requestId,
      "REGRESSION: rank collision phải được normalize và vẫn tạo requestId khi database khỏe.",
    );

    const items = await prisma.recommendationRequestItem.findMany({
      where: { requestId },
      orderBy: { position: "asc" },
      select: { bookId: true, position: true },
    });
    assert.deepEqual(
      items.map((item) => item.position),
      [1, 2],
      "Position sau normalize phải liên tục và duy nhất.",
    );
    assert.equal(new Set(items.map((item) => item.bookId)).size, 2);
    console.log(JSON.stringify({ status: "PASS", requestId, items }, null, 2));
  } finally {
    if (requestId) {
      await prisma.recommendationRequest.delete({ where: { id: requestId } }).catch(() => undefined);
    }
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    const after = await prisma.recommendationRequest.count();
    assert.equal(after, before, "Fixture tái hiện phải cleanup về baseline.");
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Lỗi tái hiện không xác định.";
  console.error(`[FAIL] ${message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]")}`);
  process.exitCode = 1;
});

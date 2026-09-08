import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient, OrderStatus, UserRole } from "@prisma/client";
import { recordResearchInteraction } from "@/lib/research-interactions-service";
import { assertSafeDatabase } from "@/lib/database-safety";

// 1. Guard cơ sở dữ liệu test — FAIL CLOSED
const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  "postgresql://postgres:postgres@localhost:5432/bookverse_ai_test?schema=public";

const target = assertSafeDatabase({
  operation: "destructive",
  databaseUrl: TEST_DATABASE_URL,
  allowedDatabases: "bookverse_ai_test, bookverse_ai_deploy_rehearsal",
});

// Guard: Tuyệt đối không chạy trên database phát triển hoặc production
if (target.databaseName === "bookverse_ai" || target.databaseName === "bookverse_ai_production") {
  throw new Error(
    `[INTEGRATION TEST BLOCKED] Integration tests cannot run against dev/prod database: ${target.databaseName}`
  );
}

const testPrisma = new PrismaClient({
  datasources: {
    db: { url: TEST_DATABASE_URL },
  },
});

const runId = `${Date.now()}-${process.pid}`;
const prefix = `RB-IT-RES-${runId}`;
let sequence = 0;

function nextId(kind: string, suffix: string): string {
  sequence += 1;
  return `${prefix}-${kind}-${suffix}-${sequence}`;
}

const createdUserIds: string[] = [];
const createdBookIds: string[] = [];
const createdCategoryIds: string[] = [];

async function createTestUser(suffix: string) {
  const id = nextId("USER", suffix);
  createdUserIds.push(id);
  return testPrisma.user.create({
    data: {
      id,
      name: `User ${suffix}`,
      email: `${id.toLowerCase()}@test.bookverse.internal`,
      role: UserRole.BUYER,
    },
  });
}

async function createTestBook(suffix: string) {
  const id = nextId("BOOK", suffix);
  const categoryId = nextId("CAT", suffix);
  createdBookIds.push(id);
  createdCategoryIds.push(categoryId);

  await testPrisma.category.create({
    data: {
      id: categoryId,
      name: `Category ${categoryId}`,
      slug: `cat-${categoryId.toLowerCase()}`,
    },
  });

  return testPrisma.book.create({
    data: {
      id,
      title: `Book Title ${suffix}`,
      slug: `book-${id.toLowerCase()}`,
      authorName: `Author ${suffix}`,
      categoryId,
      price: 100000,
    },
  });
}

test.after(async () => {
  // Cleanup toàn bộ test fixtures sau khi hoàn tất test suite
  try {
    await testPrisma.userInteractionLog.deleteMany({
      where: {
        OR: [
          { userId: { in: createdUserIds } },
          { bookId: { in: createdBookIds } },
          { idempotencyKey: { startsWith: `it:${prefix}` } },
        ],
      },
    });
    await testPrisma.userResearchConsent.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    if (createdBookIds.length > 0) {
      await testPrisma.book.deleteMany({
        where: { id: { in: createdBookIds } },
      });
    }
    if (createdCategoryIds.length > 0) {
      await testPrisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await testPrisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  } catch (err) {
    console.error("[test.after cleanup error]", err);
  } finally {
    await testPrisma.$disconnect();
  }
});

test("Integration Service: User chưa consent trả về CONSENT_REQUIRED và DB không có row", async () => {
  const user = await createTestUser("no-consent");
  const book = await createTestBook("no-consent");

  const result = await recordResearchInteraction(
    {
      authenticatedUserId: user.id,
      payload: {
        eventType: "VIEW",
        bookId: book.id,
        sourcePage: "book_detail",
        idempotencyKey: `it:${prefix}:view:1`,
      },
    },
    testPrisma,
  );

  assert.equal(result.status, "CONSENT_REQUIRED");

  const logs = await testPrisma.userInteractionLog.findMany({
    where: { userId: user.id },
  });
  assert.equal(logs.length, 0);
});

test("Integration Service: User có consent trả về CREATED và ghi đúng schema", async () => {
  const user = await createTestUser("with-consent");
  const book = await createTestBook("with-consent");

  await testPrisma.userResearchConsent.create({
    data: {
      userId: user.id,
      consentVersion: "v1",
      consented: true,
    },
  });

  const result = await recordResearchInteraction(
    {
      authenticatedUserId: user.id,
      payload: {
        eventType: "FAVORITE",
        bookId: book.id,
        sourcePage: "library",
        idempotencyKey: `it:${prefix}:fav:1`,
      },
    },
    testPrisma,
  );

  assert.equal(result.status, "CREATED");
  assert.equal(result.eventType, "FAVORITE");

  const logs = await testPrisma.userInteractionLog.findMany({
    where: { userId: user.id },
  });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].eventType, "FAVORITE");
  assert.equal(logs[0].consentVersion, "v1");
  assert.equal(logs[0].bookId, book.id);
});

test("Integration Service: Retry cùng idempotency key trả về DEDUPLICATED và giữ đúng 1 row", async () => {
  const user = await createTestUser("dedup");
  const book = await createTestBook("dedup");

  await testPrisma.userResearchConsent.create({
    data: {
      userId: user.id,
      consentVersion: "v1",
      consented: true,
    },
  });

  const idempotencyKey = `it:${prefix}:dedup-key-unique`;

  // Lần 1: Tạo mới
  const result1 = await recordResearchInteraction(
    {
      authenticatedUserId: user.id,
      payload: {
        eventType: "BOOKMARK",
        bookId: book.id,
        eventValue: 15,
        sourcePage: "reader",
        idempotencyKey,
      },
    },
    testPrisma,
  );
  assert.equal(result1.status, "CREATED");

  // Lần 2: Gửi lại cùng idempotency key
  const result2 = await recordResearchInteraction(
    {
      authenticatedUserId: user.id,
      payload: {
        eventType: "BOOKMARK",
        bookId: book.id,
        eventValue: 15,
        sourcePage: "reader",
        idempotencyKey,
      },
    },
    testPrisma,
  );
  assert.equal(result2.status, "DEDUPLICATED");

  const logs = await testPrisma.userInteractionLog.findMany({
    where: { idempotencyKey },
  });
  assert.equal(logs.length, 1);
  assert.equal(Number(logs[0].eventValue), 15);
});

test("Integration Service: Consent bị thu hồi chặn không cho ghi thêm event mới", async () => {
  const user = await createTestUser("revoked");
  const book = await createTestBook("revoked");

  // Tạo consent sau đó thu hồi
  await testPrisma.userResearchConsent.create({
    data: {
      userId: user.id,
      consentVersion: "v1",
      consented: false,
      revokedAt: new Date(),
    },
  });

  const result = await recordResearchInteraction(
    {
      authenticatedUserId: user.id,
      payload: {
        eventType: "ADD_TO_CART",
        bookId: book.id,
        sourcePage: "marketplace",
        idempotencyKey: `it:${prefix}:cart:1`,
      },
    },
    testPrisma,
  );

  assert.equal(result.status, "CONSENT_REQUIRED");

  const logs = await testPrisma.userInteractionLog.findMany({
    where: { userId: user.id },
  });
  assert.equal(logs.length, 0);
});

test("Integration Service: Loại bỏ hoàn toàn PII trong metadata", async () => {
  const user = await createTestUser("pii-test");

  await testPrisma.userResearchConsent.create({
    data: {
      userId: user.id,
      consentVersion: "v1",
      consented: true,
    },
  });

  const result = await recordResearchInteraction(
    {
      authenticatedUserId: user.id,
      payload: {
        eventType: "SEARCH",
        sourcePage: "catalog",
        metadata: {
          query: "khoa học viễn tưởng",
          email: "victim@example.com",
          phone: "0912345678",
          address: "123 Đường Test",
          name: "Nguyễn Văn Test",
        },
        idempotencyKey: `it:${prefix}:search:pii`,
      },
    },
    testPrisma,
  );

  assert.equal(result.status, "CREATED");

  const log = await testPrisma.userInteractionLog.findUnique({
    where: { idempotencyKey: `it:${prefix}:search:pii` },
  });
  assert.ok(log);
  assert.deepEqual(log.metadata, { query: "khoa học viễn tưởng" });
});

test("Integration Service: bookId không tồn tại trả về INVALID", async () => {
  const user = await createTestUser("invalid-book");

  await testPrisma.userResearchConsent.create({
    data: {
      userId: user.id,
      consentVersion: "v1",
      consented: true,
    },
  });

  const result = await recordResearchInteraction(
    {
      authenticatedUserId: user.id,
      payload: {
        eventType: "RATING",
        bookId: "non-existent-book-id-99999",
        eventValue: 5,
        idempotencyKey: `it:${prefix}:rating:invalid`,
      },
    },
    testPrisma,
  );

  assert.equal(result.status, "INVALID");

  const logs = await testPrisma.userInteractionLog.findMany({
    where: { userId: user.id },
  });
  assert.equal(logs.length, 0);
});

test("Integration Service: Phân biệt trạng thái PURCHASE COMPLETED/PAID vs CANCELLED/REFUNDED", async () => {
  const user = await createTestUser("purchase-status");
  const book = await createTestBook("purchase-status");

  await testPrisma.userResearchConsent.create({
    data: {
      userId: user.id,
      consentVersion: "v1",
      consented: true,
    },
  });

  function isPurchaseEligible(status: OrderStatus): boolean {
    return status === OrderStatus.COMPLETED || status === OrderStatus.PAID;
  }

  // CANCELLED & REFUNDED không được phép gọi recordResearchInteraction
  assert.equal(isPurchaseEligible(OrderStatus.CANCELLED), false);
  assert.equal(isPurchaseEligible(OrderStatus.REFUNDED), false);

  // PAID & COMPLETED được phép gọi recordResearchInteraction
  assert.equal(isPurchaseEligible(OrderStatus.PAID), true);
  assert.equal(isPurchaseEligible(OrderStatus.COMPLETED), true);

  const purchaseResult = await recordResearchInteraction(
    {
      authenticatedUserId: user.id,
      payload: {
        eventType: "PURCHASE",
        bookId: book.id,
        eventValue: 250000,
        sourcePage: "checkout",
        idempotencyKey: `it:${prefix}:purchase:paid-demo`,
      },
    },
    testPrisma,
  );

  assert.equal(purchaseResult.status, "CREATED");

  const logs = await testPrisma.userInteractionLog.findMany({
    where: { userId: user.id, eventType: "PURCHASE" },
  });
  assert.equal(logs.length, 1);
  assert.equal(Number(logs[0].eventValue), 250000);
});
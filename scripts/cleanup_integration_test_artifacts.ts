import { assertSafeDatabase } from "../lib/database-safety";
import prisma from "../lib/prisma";

const TEST_PREFIX = "RB-IT-";

interface TableAudit {
  table: string;
  testCount: number;
  nonTestCount: number;
  totalCount: number;
}

async function auditAndCleanup() {
  const isExecute = process.argv.includes("--execute");

  const databaseUrl = process.env.DATABASE_URL;
  const target = assertSafeDatabase({
    operation: isExecute ? "destructive" : "read-only",
    databaseUrl,
    allowedDatabases: "bookverse_ai, bookverse_ai_test, bookverse_ai_deploy_rehearsal",
  });

  console.log("============================================================");
  console.log(`DATABASE AUDIT & CLEANUP: ${target.databaseName}`);
  console.log(`MODE: ${isExecute ? "EXECUTE (DESTRUCTIVE CLEANUP)" : "DRY-RUN (READ ONLY)"}`);
  console.log(`TARGET PREFIX: ${TEST_PREFIX}*`);
  console.log("============================================================");

  // 1. Audit counts before
  const auditLogs: TableAudit = {
    table: "user_interaction_logs",
    testCount: await prisma.userInteractionLog.count({
      where: {
        OR: [
          { userId: { startsWith: TEST_PREFIX } },
          { bookId: { startsWith: TEST_PREFIX } },
          { idempotencyKey: { startsWith: "it:" } },
        ],
      },
    }),
    nonTestCount: await prisma.userInteractionLog.count({
      where: {
        AND: [
          { OR: [{ userId: null }, { userId: { not: { startsWith: TEST_PREFIX } } }] },
          { OR: [{ bookId: null }, { bookId: { not: { startsWith: TEST_PREFIX } } }] },
          { OR: [{ idempotencyKey: null }, { idempotencyKey: { not: { startsWith: "it:" } } }] },
        ],
      },
    }),
    totalCount: await prisma.userInteractionLog.count(),
  };

  const auditConsents: TableAudit = {
    table: "user_research_consents",
    testCount: await prisma.userResearchConsent.count({
      where: { userId: { startsWith: TEST_PREFIX } },
    }),
    nonTestCount: await prisma.userResearchConsent.count({
      where: { userId: { not: { startsWith: TEST_PREFIX } } },
    }),
    totalCount: await prisma.userResearchConsent.count(),
  };

  const auditReviews: TableAudit = {
    table: "Review",
    testCount: await prisma.review.count({
      where: {
        OR: [{ userId: { startsWith: TEST_PREFIX } }, { bookId: { startsWith: TEST_PREFIX } }],
      },
    }),
    nonTestCount: await prisma.review.count({
      where: {
        NOT: { OR: [{ userId: { startsWith: TEST_PREFIX } }, { bookId: { startsWith: TEST_PREFIX } }] },
      },
    }),
    totalCount: await prisma.review.count(),
  };

  const auditBookmarks: TableAudit = {
    table: "Bookmark",
    testCount: await prisma.bookmark.count({
      where: {
        OR: [{ userId: { startsWith: TEST_PREFIX } }, { bookId: { startsWith: TEST_PREFIX } }],
      },
    }),
    nonTestCount: await prisma.bookmark.count({
      where: {
        NOT: { OR: [{ userId: { startsWith: TEST_PREFIX } }, { bookId: { startsWith: TEST_PREFIX } }] },
      },
    }),
    totalCount: await prisma.bookmark.count(),
  };

  const auditFavorites: TableAudit = {
    table: "FavoriteBook",
    testCount: await prisma.favoriteBook.count({
      where: {
        OR: [{ userId: { startsWith: TEST_PREFIX } }, { bookId: { startsWith: TEST_PREFIX } }],
      },
    }),
    nonTestCount: await prisma.favoriteBook.count({
      where: {
        NOT: { OR: [{ userId: { startsWith: TEST_PREFIX } }, { bookId: { startsWith: TEST_PREFIX } }] },
      },
    }),
    totalCount: await prisma.favoriteBook.count(),
  };

  const auditOrderItems: TableAudit = {
    table: "OrderItem",
    testCount: await prisma.orderItem.count({
      where: {
        OR: [
          { bookId: { startsWith: TEST_PREFIX } },
          { orderId: { startsWith: TEST_PREFIX } },
          { listingId: { startsWith: TEST_PREFIX } },
        ],
      },
    }),
    nonTestCount: await prisma.orderItem.count({
      where: {
        NOT: {
          OR: [
            { bookId: { startsWith: TEST_PREFIX } },
            { orderId: { startsWith: TEST_PREFIX } },
            { listingId: { startsWith: TEST_PREFIX } },
          ],
        },
      },
    }),
    totalCount: await prisma.orderItem.count(),
  };

  const auditOrders: TableAudit = {
    table: "Order",
    testCount: await prisma.order.count({
      where: {
        OR: [{ id: { startsWith: TEST_PREFIX } }, { buyerId: { startsWith: TEST_PREFIX } }],
      },
    }),
    nonTestCount: await prisma.order.count({
      where: {
        NOT: {
          OR: [{ id: { startsWith: TEST_PREFIX } }, { buyerId: { startsWith: TEST_PREFIX } }],
        },
      },
    }),
    totalCount: await prisma.order.count(),
  };

  const auditListings: TableAudit = {
    table: "Listing",
    testCount: await prisma.listing.count({
      where: {
        OR: [
          { id: { startsWith: TEST_PREFIX } },
          { sellerId: { startsWith: TEST_PREFIX } },
          { bookId: { startsWith: TEST_PREFIX } },
        ],
      },
    }),
    nonTestCount: await prisma.listing.count({
      where: {
        NOT: {
          OR: [
            { id: { startsWith: TEST_PREFIX } },
            { sellerId: { startsWith: TEST_PREFIX } },
            { bookId: { startsWith: TEST_PREFIX } },
          ],
        },
      },
    }),
    totalCount: await prisma.listing.count(),
  };

  const auditShipping: TableAudit = {
    table: "ShippingAddress",
    testCount: await prisma.shippingAddress.count({
      where: {
        OR: [{ id: { startsWith: TEST_PREFIX } }, { userId: { startsWith: TEST_PREFIX } }],
      },
    }),
    nonTestCount: await prisma.shippingAddress.count({
      where: {
        NOT: {
          OR: [{ id: { startsWith: TEST_PREFIX } }, { userId: { startsWith: TEST_PREFIX } }],
        },
      },
    }),
    totalCount: await prisma.shippingAddress.count(),
  };

  const auditBooks: TableAudit = {
    table: "Book",
    testCount: await prisma.book.count({
      where: {
        OR: [{ id: { startsWith: TEST_PREFIX } }, { categoryId: { startsWith: TEST_PREFIX } }],
      },
    }),
    nonTestCount: await prisma.book.count({
      where: {
        NOT: {
          OR: [{ id: { startsWith: TEST_PREFIX } }, { categoryId: { startsWith: TEST_PREFIX } }],
        },
      },
    }),
    totalCount: await prisma.book.count(),
  };

  const auditCategories: TableAudit = {
    table: "Category",
    testCount: await prisma.category.count({
      where: { id: { startsWith: TEST_PREFIX } },
    }),
    nonTestCount: await prisma.category.count({
      where: { id: { not: { startsWith: TEST_PREFIX } } },
    }),
    totalCount: await prisma.category.count(),
  };

  const auditUsers: TableAudit = {
    table: "User",
    testCount: await prisma.user.count({
      where: { id: { startsWith: TEST_PREFIX } },
    }),
    nonTestCount: await prisma.user.count({
      where: { id: { not: { startsWith: TEST_PREFIX } } },
    }),
    totalCount: await prisma.user.count(),
  };

  const audits: TableAudit[] = [
    auditLogs,
    auditConsents,
    auditReviews,
    auditBookmarks,
    auditFavorites,
    auditOrderItems,
    auditOrders,
    auditListings,
    auditShipping,
    auditBooks,
    auditCategories,
    auditUsers,
  ];

  console.table(audits);

  const totalTestArtifacts = audits.reduce((sum, item) => sum + item.testCount, 0);
  console.log(`[AUDIT SUMMARY] Total test artifact rows identified: ${totalTestArtifacts}`);

  if (!isExecute) {
    console.log("\n[INFO] Dry-run completed. No records were modified.");
    console.log("To perform actual cleanup of scoped RB-IT-* artifacts, run:");
    console.log("  npx tsx scripts/cleanup_integration_test_artifacts.ts --execute");
    return;
  }

  // 2. Perform scoped deletion in FK dependency order
  console.log("\n[INFO] Performing scoped deletion of test artifacts...");

  await prisma.$transaction(async (tx) => {
    // 1. Logs & consents
    const deletedLogs = await tx.userInteractionLog.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: TEST_PREFIX } },
          { bookId: { startsWith: TEST_PREFIX } },
          { idempotencyKey: { startsWith: "it:" } },
        ],
      },
    });
    console.log(`  - Deleted ${deletedLogs.count} rows from user_interaction_logs`);

    const deletedConsents = await tx.userResearchConsent.deleteMany({
      where: { userId: { startsWith: TEST_PREFIX } },
    });
    console.log(`  - Deleted ${deletedConsents.count} rows from user_research_consents`);

    // 2. User activities
    const deletedReviews = await tx.review.deleteMany({
      where: {
        OR: [{ userId: { startsWith: TEST_PREFIX } }, { bookId: { startsWith: TEST_PREFIX } }],
      },
    });
    console.log(`  - Deleted ${deletedReviews.count} rows from Review`);

    const deletedBookmarks = await tx.bookmark.deleteMany({
      where: {
        OR: [{ userId: { startsWith: TEST_PREFIX } }, { bookId: { startsWith: TEST_PREFIX } }],
      },
    });
    console.log(`  - Deleted ${deletedBookmarks.count} rows from Bookmark`);

    const deletedFavorites = await tx.favoriteBook.deleteMany({
      where: {
        OR: [{ userId: { startsWith: TEST_PREFIX } }, { bookId: { startsWith: TEST_PREFIX } }],
      },
    });
    console.log(`  - Deleted ${deletedFavorites.count} rows from FavoriteBook`);

    // 3. Orders & Marketplace
    const deletedOrderItems = await tx.orderItem.deleteMany({
      where: {
        OR: [
          { bookId: { startsWith: TEST_PREFIX } },
          { orderId: { startsWith: TEST_PREFIX } },
          { listingId: { startsWith: TEST_PREFIX } },
        ],
      },
    });
    console.log(`  - Deleted ${deletedOrderItems.count} rows from OrderItem`);

    const deletedOrders = await tx.order.deleteMany({
      where: {
        OR: [{ id: { startsWith: TEST_PREFIX } }, { buyerId: { startsWith: TEST_PREFIX } }],
      },
    });
    console.log(`  - Deleted ${deletedOrders.count} rows from Order`);

    const deletedListings = await tx.listing.deleteMany({
      where: {
        OR: [
          { id: { startsWith: TEST_PREFIX } },
          { sellerId: { startsWith: TEST_PREFIX } },
          { bookId: { startsWith: TEST_PREFIX } },
        ],
      },
    });
    console.log(`  - Deleted ${deletedListings.count} rows from Listing`);

    const deletedShipping = await tx.shippingAddress.deleteMany({
      where: {
        OR: [{ id: { startsWith: TEST_PREFIX } }, { userId: { startsWith: TEST_PREFIX } }],
      },
    });
    console.log(`  - Deleted ${deletedShipping.count} rows from ShippingAddress`);

    // 4. Books & Categories
    const deletedBooks = await tx.book.deleteMany({
      where: {
        OR: [{ id: { startsWith: TEST_PREFIX } }, { categoryId: { startsWith: TEST_PREFIX } }],
      },
    });
    console.log(`  - Deleted ${deletedBooks.count} rows from Book`);

    const deletedCategories = await tx.category.deleteMany({
      where: { id: { startsWith: TEST_PREFIX } },
    });
    console.log(`  - Deleted ${deletedCategories.count} rows from Category`);

    // 5. Users
    const deletedUsers = await tx.user.deleteMany({
      where: { id: { startsWith: TEST_PREFIX } },
    });
    console.log(`  - Deleted ${deletedUsers.count} rows from User`);
  });

  // 3. Re-verify post-cleanup counts
  const postTestLogs = await prisma.userInteractionLog.count({
    where: {
      OR: [
        { userId: { startsWith: TEST_PREFIX } },
        { bookId: { startsWith: TEST_PREFIX } },
        { idempotencyKey: { startsWith: "it:" } },
      ],
    },
  });
  const postTestConsents = await prisma.userResearchConsent.count({
    where: { userId: { startsWith: TEST_PREFIX } },
  });
  const postTestUsers = await prisma.user.count({
    where: { id: { startsWith: TEST_PREFIX } },
  });
  const postNonTestLogs = await prisma.userInteractionLog.count();
  const postNonTestConsents = await prisma.userResearchConsent.count();

  console.log("============================================================");
  console.log("POST-CLEANUP VERIFICATION:");
  console.log(`  Remaining ${TEST_PREFIX}* logs: ${postTestLogs}`);
  console.log(`  Remaining ${TEST_PREFIX}* consents: ${postTestConsents}`);
  console.log(`  Remaining ${TEST_PREFIX}* users: ${postTestUsers}`);
  console.log(`  Remaining total logs: ${postNonTestLogs}`);
  console.log(`  Remaining total consents: ${postNonTestConsents}`);
  console.log("============================================================");

  if (postTestLogs === 0 && postTestConsents === 0 && postTestUsers === 0) {
    console.log("[SUCCESS] Database is completely clean of test artifacts.");
  } else {
    console.error("[ERROR] Some test artifacts remain!");
    process.exit(1);
  }
}

auditAndCleanup()
  .catch((err) => {
    console.error("[CLEANUP ERROR]", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
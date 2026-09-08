import bcrypt from "bcrypt";
import {
  BookFormat,
  BookStatus,
  CoverReviewStatus,
  ListingCondition,
  ListingStatus,
  PrismaClient,
  UserRole,
} from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";

const DATABASE_NAME = "bookverse_e2e_test";
const TEST_FIXTURE = "TEST_FIXTURE";
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const target = assertSafeDatabase({
    operation: "destructive",
    databaseUrl: process.env.DATABASE_URL,
  });
  if (target.databaseName !== DATABASE_NAME) {
    throw new Error(`E2E seed chỉ được chạy trên ${DATABASE_NAME}.`);
  }

  const existingUsers = await prisma.user.count();
  const existingBooks = await prisma.book.count();
  if (existingUsers !== 0 || existingBooks !== 0) {
    throw new Error("Database E2E phải rỗng trước khi seed fixture.");
  }

  const password = await bcrypt.hash("123456", 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.createMany({
      data: [
        {
          id: "TEST-FIXTURE-READER",
          email: "reader.bookverse.demo@gmail.com",
          password,
          name: "[TEST_FIXTURE] Độc giả E2E",
          role: UserRole.BUYER,
        },
        {
          id: "TEST-FIXTURE-ADMIN",
          email: "admin.bookverse.demo@gmail.com",
          password,
          name: "[TEST_FIXTURE] Quản trị E2E",
          role: UserRole.ADMIN,
        },
        {
          id: "TEST-FIXTURE-SELLER",
          email: "seller.bookverse.demo@gmail.com",
          password,
          name: "[TEST_FIXTURE] Người bán E2E",
          role: UserRole.SELLER,
        },
      ],
    });
    await tx.category.create({
      data: {
        id: "TEST-FIXTURE-CATEGORY-AI",
        name: "Trí tuệ nhân tạo",
        slug: "tri-tue-nhan-tao-test-fixture",
        description: TEST_FIXTURE,
        level: 0,
        canonicalKey: "artificial-intelligence",
        canonicalName: "Trí tuệ nhân tạo",
      },
    });
    await tx.book.create({
      data: {
        id: "B-TEST-FIXTURE-AI",
        title: "Nhập môn trí tuệ nhân tạo",
        slug: "nhap-mon-tri-tue-nhan-tao-test-fixture",
        authorName: "BookVerse TEST_FIXTURE",
        description: "Dữ liệu kiểm thử E2E cô lập, không thuộc pilot hoặc nghiên cứu.",
        format: BookFormat.BOTH,
        price: "99000",
        rating: "4.50",
        pages: 120,
        publishYear: 2026,
        isEbook: true,
        status: BookStatus.ACTIVE,
        coverPath: "/covers/bookverse-editions/B0001.svg",
        languageCode: "vi",
        coverReviewStatus: CoverReviewStatus.NEEDS_COVER_REVIEW,
        isPubliclyVisible: true,
        categoryId: "TEST-FIXTURE-CATEGORY-AI",
        sourceMetadata: {
          create: {
            sourceProvider: TEST_FIXTURE,
            sourceRecordKey: "TEST-FIXTURE-BOOK-AI",
            sourceRecordType: TEST_FIXTURE,
            sourcePageUrl: "https://example.invalid/test-fixture/book-ai",
            dataLabel: TEST_FIXTURE,
            metadataQuality: TEST_FIXTURE,
            coverRightsStatus: "TEST_FIXTURE_ONLY",
            priceStatus: "TEST_FIXTURE_ONLY",
            languageProfile: "vi",
            languages: ["vi"],
            sourceFormat: TEST_FIXTURE,
            descriptionStatus: "TEST_FIXTURE_ONLY",
            sourceRatingStatus: "TEST_FIXTURE_ONLY",
            primarySourceCategoryId: "TEST-FIXTURE-CATEGORY-AI",
            primarySourceCategoryName: "Trí tuệ nhân tạo",
            sourceCategoryIds: ["TEST-FIXTURE-CATEGORY-AI"],
            isVietnameseEdition: true,
            authorNationality: "NOT_APPLICABLE_TEST_FIXTURE",
          },
        },
      },
    });
    await tx.listing.create({
      data: {
        id: "TEST-FIXTURE-LISTING-AI",
        sellerId: "TEST-FIXTURE-SELLER",
        bookId: "B-TEST-FIXTURE-AI",
        title: "[TEST_FIXTURE] Nhập môn trí tuệ nhân tạo",
        description: "Listing chỉ dành cho kiểm thử E2E cô lập.",
        condition: ListingCondition.NEW,
        price: "99000",
        status: ListingStatus.APPROVED,
        stock: 5,
        tags: [TEST_FIXTURE],
        hasCover: true,
      },
    });
  });

  console.log(
    JSON.stringify({
      status: "PASS",
      database: DATABASE_NAME,
      provenance: TEST_FIXTURE,
      users: await prisma.user.count(),
      books: await prisma.book.count(),
      pilotData: false,
      researchData: false,
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed E2E thất bại.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

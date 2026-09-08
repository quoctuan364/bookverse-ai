import { EditionType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_BUYER_EMAIL = "reader.bookverse.demo@gmail.com";
const PREFERRED_DEMO_BOOK_IDS = ["RB03002", "RB00123", "RB00047"];

async function main() {
  const buyer = await prisma.user.findUnique({
    where: { email: DEMO_BUYER_EMAIL },
    select: { id: true, isLocked: true },
  });

  if (!buyer || buyer.isLocked) {
    throw new Error(`Không tìm thấy Buyer demo đang hoạt động: ${DEMO_BUYER_EMAIL}`);
  }

  let readableBooks = await prisma.book.findMany({
    where: {
      id: { in: PREFERRED_DEMO_BOOK_IDS },
      chunks: { some: {} },
      editions: {
        some: {
          editionType: EditionType.EBOOK,
          isActive: true,
          digitalAsset: { isNot: null },
        },
      },
    },
    select: {
      id: true,
      title: true,
      _count: { select: { chunks: true } },
    },
  });

  // Clean clone chỉ có catalog Bxxxx; catalog RBxxxxx là dữ liệu mở rộng tùy chọn.
  if (readableBooks.length === 0) {
    readableBooks = await prisma.book.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        chunks: { some: {} },
        editions: {
          some: {
            editionType: EditionType.EBOOK,
            isActive: true,
            digitalAsset: { isNot: null },
          },
        },
      },
      orderBy: { id: "asc" },
      take: 3,
      select: {
        id: true,
        title: true,
        _count: { select: { chunks: true } },
      },
    });
  }

  if (readableBooks.length === 0) {
    throw new Error("Chưa có ebook nào đủ nội dung để chuẩn bị kịch bản đọc.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.book.updateMany({
      where: { id: { in: readableBooks.map((book) => book.id) } },
      data: { isEbook: true },
    });

    await tx.readingEntitlement.createMany({
      data: readableBooks.map((book) => ({
        userId: buyer.id,
        bookId: book.id,
      })),
      skipDuplicates: true,
    });

    for (const [index, book] of readableBooks.entries()) {
      const currentPage = Math.min(3 + index, book._count.chunks);
      const progressPercent = Math.round(
        (currentPage / Math.max(1, book._count.chunks)) * 100,
      );
      await tx.readingProgress.upsert({
        where: {
          userId_bookId: {
            userId: buyer.id,
            bookId: book.id,
          },
        },
        create: {
          userId: buyer.id,
          bookId: book.id,
          currentPage,
          currentChapter: 1,
          progressPercent,
          totalMinutes: 12 + index * 8,
          lastReadAt: new Date(),
        },
        update: {
          currentPage,
          progressPercent,
          totalMinutes: 12 + index * 8,
          lastReadAt: new Date(),
        },
      });

      await tx.readingSession.upsert({
        where: { id: `BV-DEMO-SESSION-${book.id}` },
        create: {
          id: `BV-DEMO-SESSION-${book.id}`,
          userId: buyer.id,
          bookId: book.id,
          currentPage,
          progressPercent,
          timeSpent: 720 + index * 360,
        },
        update: {
          currentPage,
          progressPercent,
          timeSpent: 720 + index * 360,
        },
      });

      await tx.bookmark.upsert({
        where: {
          userId_bookId_pageNumber: {
            userId: buyer.id,
            bookId: book.id,
            pageNumber: currentPage,
          },
        },
        create: {
          userId: buyer.id,
          bookId: book.id,
          pageNumber: currentPage,
        },
        update: {},
      });

      await tx.highlight.upsert({
        where: { id: `BV-DEMO-HIGHLIGHT-${book.id}` },
        create: {
          id: `BV-DEMO-HIGHLIGHT-${book.id}`,
          userId: buyer.id,
          bookId: book.id,
          pageNumber: currentPage,
          text: "Một kết luận tốt phải đi kèm bằng chứng, giới hạn và bước tiếp theo.",
          note: "Highlight minh họa để trình diễn thư viện và thống kê đọc.",
        },
        update: {
          pageNumber: currentPage,
          note: "Highlight minh họa để trình diễn thư viện và thống kê đọc.",
        },
      });

      await tx.favoriteBook.upsert({
        where: {
          userId_bookId: {
            userId: buyer.id,
            bookId: book.id,
          },
        },
        create: { userId: buyer.id, bookId: book.id },
        update: {},
      });
    }
  });

  console.log(
    JSON.stringify({
      buyer: DEMO_BUYER_EMAIL,
      preparedBooks: readableBooks.map((book) => ({
        id: book.id,
        title: book.title,
        chunks: book._count.chunks,
      })),
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

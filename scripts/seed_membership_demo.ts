import { createHash } from "node:crypto";
import {
  MembershipBillingPeriod,
  MembershipPaymentStatus,
  PaymentMethod,
  PrismaClient,
  SubscriptionStatus,
} from "@prisma/client";
import { DEMO_ACCOUNT_EMAILS } from "@/lib/demo-accounts";

const prisma = new PrismaClient();

async function resolveDemoBookTiers() {
  const books = await prisma.book.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      chunks: { some: {} },
    },
    orderBy: { id: "asc" },
    take: 15,
    select: { id: true },
  });
  const allBookIds = books.map(({ id }) => id);
  if (allBookIds.length < 3) {
    throw new Error(
      "Cần ít nhất 3 sách có nội dung để tạo các gói hội viên demo.",
    );
  }
  return {
    basicBookIds: allBookIds.slice(0, 3),
    premiumBookIds: allBookIds.slice(0, Math.min(7, allBookIds.length)),
    unlimitedBookIds: allBookIds,
  };
}

async function ensureDemoEbooks(bookIds: string[]) {
  for (const bookId of bookIds) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        chunks: {
          orderBy: [{ chapterNumber: "asc" }, { chunkIndex: "asc" }],
          select: { content: true },
        },
      },
    });
    if (!book || book.chunks.length < 2) {
      throw new Error(
        `Sách ${bookId} chưa có nội dung. Chạy npm run content:demo:seed trước.`,
      );
    }
    const plainText = book.chunks.map(({ content }) => content).join("\n\n");

    const editionId = `BV-MEMBER-EDITION-${bookId}`;
    await prisma.$transaction(async (tx) => {
      await tx.bookEdition.upsert({
        where: { id: editionId },
        update: { price: 69_000, stock: 999, isActive: true, editionType: "EBOOK" },
        create: {
          id: editionId,
          bookId,
          editionType: "EBOOK",
          price: 69_000,
          stock: 999,
          isActive: true,
        },
      });
      await tx.digitalAsset.upsert({
        where: { editionId },
        update: {
          fileUrl: `/read/${bookId}`,
          fileHash: createHash("sha256").update(plainText).digest("hex"),
          samplePages: Math.max(1, Math.floor(book.chunks.length * 0.1)),
          mimeType: "application/vnd.bookverse.demo-chunks+json",
          fileSize: Buffer.byteLength(plainText),
        },
        create: {
          id: `BV-MEMBER-ASSET-${bookId}`,
          editionId,
          fileUrl: `/read/${bookId}`,
          fileHash: createHash("sha256").update(plainText).digest("hex"),
          samplePages: Math.max(1, Math.floor(book.chunks.length * 0.1)),
          mimeType: "application/vnd.bookverse.demo-chunks+json",
          fileSize: Buffer.byteLength(plainText),
        },
      });
    });
  }
}

async function upsertPlan(input: {
  slug: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  billingPeriod?: MembershipBillingPeriod;
  features: string[];
  bookIds: string[];
}) {
  const availableBooks = await prisma.book.findMany({
    where: {
      id: { in: input.bookIds },
      chunks: { some: {} },
      editions: {
        some: {
          editionType: "EBOOK",
          isActive: true,
          digitalAsset: { isNot: null },
        },
      },
    },
    select: { id: true },
  });

  return prisma.membershipPlan.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      description: input.description,
      price: input.price,
      durationDays: input.durationDays,
      billingPeriod: input.billingPeriod ?? MembershipBillingPeriod.MONTHLY,
      isActive: true,
      features: input.features,
      // Chỉ đồng bộ quan hệ của gói demo, không sửa dữ liệu Book.
      books: { set: availableBooks.map(({ id }) => ({ id })) },
    },
    create: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      price: input.price,
      durationDays: input.durationDays,
      billingPeriod: input.billingPeriod ?? MembershipBillingPeriod.MONTHLY,
      isActive: true,
      features: input.features,
      books: { connect: availableBooks.map(({ id }) => ({ id })) },
    },
    include: { _count: { select: { books: true } } },
  });
}

async function ensureDemoSubscription(planId: string) {
  const buyer = await prisma.user.findUnique({
    where: { email: DEMO_ACCOUNT_EMAILS.U001 },
    select: { id: true, isLocked: true },
  });
  if (!buyer || buyer.isLocked) {
    throw new Error(`Không tìm thấy tài khoản độc giả demo ${DEMO_ACCOUNT_EMAILS.U001}.`);
  }

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setUTCFullYear(endsAt.getUTCFullYear() + 1);
  const subscriptionId = "BV-DEMO-SUBSCRIPTION-U001";
  const readableBooks = await prisma.book.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      chunks: { some: {} },
    },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: { id: subscriptionId },
      update: {
        planId,
        status: SubscriptionStatus.ACTIVE,
        startsAt: now,
        endsAt,
        cancelledAt: null,
      },
      create: {
        id: subscriptionId,
        userId: buyer.id,
        planId,
        status: SubscriptionStatus.ACTIVE,
        startsAt: now,
        endsAt,
      },
    });
    await tx.membershipPayment.upsert({
      where: { transactionRef: "MEM-DEMO-U001-READY" },
      update: {
        planId,
        subscriptionId,
        amount: 299_000,
        status: MembershipPaymentStatus.PAID_DEMO,
        paymentMethod: PaymentMethod.WALLET_DEMO,
        paidAt: now,
      },
      create: {
        id: "BV-DEMO-MEMBERSHIP-PAYMENT-U001",
        userId: buyer.id,
        planId,
        subscriptionId,
        amount: 299_000,
        status: MembershipPaymentStatus.PAID_DEMO,
        paymentMethod: PaymentMethod.WALLET_DEMO,
        transactionRef: "MEM-DEMO-U001-READY",
        paidAt: now,
      },
    });
    await tx.subscriptionBookAccess.createMany({
      data: readableBooks.map((book) => ({
        subscriptionId,
        bookId: book.id,
      })),
      skipDuplicates: true,
    });
  });

  return {
    email: DEMO_ACCOUNT_EMAILS.U001,
    readableBooks: readableBooks.length,
    endsAt,
  };
}

async function main() {
  const { basicBookIds, premiumBookIds, unlimitedBookIds } =
    await resolveDemoBookTiers();
  await ensureDemoEbooks(unlimitedBookIds);
  const basic = await upsertPlan({
    slug: "bookverse-co-ban",
    name: "BookVerse Cơ bản",
    description: "Gói đọc tiết kiệm dành cho người mới bắt đầu.",
    price: 39_000,
    durationDays: 30,
    features: ["Đọc toàn bộ sách thuộc gói", "Lưu tiến độ, bookmark và highlight"],
    bookIds: basicBookIds,
  });
  const premium = await upsertPlan({
    slug: "bookverse-premium-3-thang",
    name: "BookVerse Premium",
    description: "Kho Ebook demo đầy đủ trong 90 ngày.",
    price: 99_000,
    durationDays: 90,
    features: [
      "Toàn bộ quyền lợi gói Cơ bản",
      "Mở toàn bộ kho Ebook demo",
      "Sử dụng trợ lý đọc AI và ghi chú",
    ],
    bookIds: premiumBookIds,
  });
  const unlimited = await upsertPlan({
    slug: "bookverse-khong-gioi-han",
    name: "BookVerse Không giới hạn",
    description: "Gói năm dành cho độc giả đọc thường xuyên và muốn tiết kiệm dài hạn.",
    price: 299_000,
    durationDays: 365,
    billingPeriod: MembershipBillingPeriod.YEARLY,
    features: [
      "Toàn bộ quyền lợi gói Premium",
      "Mở kho Ebook demo lớn nhất",
      "Ưu tiên các tính năng đọc và trợ lý AI mới",
      "Tiết kiệm hơn so với gia hạn từng tháng",
    ],
    bookIds: unlimitedBookIds,
  });
  const demoSubscription = await ensureDemoSubscription(unlimited.id);

  console.log(JSON.stringify({
    plans: [
      { slug: basic.slug, books: basic._count.books },
      { slug: premium.slug, books: premium._count.books },
      { slug: unlimited.slug, books: unlimited._count.books },
    ],
    demoSubscription,
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

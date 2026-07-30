import prisma from "../lib/prisma";

interface ReadinessCheck {
  label: string;
  value: number;
  required: boolean;
  passed: boolean;
  hint: string;
}

function printCheck(check: ReadinessCheck): void {
  const status = check.passed ? "PASS" : check.required ? "FAIL" : "WARN";
  console.log(`[${status}] ${check.label}: ${check.value}`);
  if (!check.passed) console.log(`       ${check.hint}`);
}

async function main(): Promise<void> {
  console.log("BookVerse AI - Kiểm tra mức sẵn sàng demo\n");

  const [
    activeBooks,
    readableBooks,
    activePlans,
    admins,
    readers,
    activeSubscriptions,
    readingProgress,
    bookmarks,
    highlights,
    approvedListings,
  ] = await Promise.all([
    prisma.book.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.book.count({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        chunks: { some: {} },
      },
    }),
    prisma.membershipPlan.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "ADMIN", isLocked: false } }),
    prisma.user.count({ where: { role: "BUYER", isLocked: false } }),
    prisma.subscription.count({
      where: { status: "ACTIVE", endsAt: { gt: new Date() } },
    }),
    prisma.readingProgress.count(),
    prisma.bookmark.count(),
    prisma.highlight.count(),
    prisma.listing.count({ where: { status: "APPROVED", stock: { gt: 0 } } }),
  ]);

  const checks: ReadinessCheck[] = [
    {
      label: "Sách đang hoạt động",
      value: activeBooks,
      required: true,
      passed: activeBooks > 0,
      hint: "Cần import hoặc seed catalog trước khi demo.",
    },
    {
      label: "Sách có nội dung đọc",
      value: readableBooks,
      required: true,
      passed: readableBooks > 0,
      hint: "Chạy npm run demo:prepare-reader hoặc pipeline ingest Ebook.",
    },
    {
      label: "Gói hội viên đang mở bán",
      value: activePlans,
      required: true,
      passed: activePlans > 0,
      hint: "Chạy npm run membership:seed-demo.",
    },
    {
      label: "Tài khoản quản trị không bị khóa",
      value: admins,
      required: true,
      passed: admins > 0,
      hint: "Cần ít nhất một tài khoản ADMIN để trình diễn trang quản trị.",
    },
    {
      label: "Tài khoản độc giả không bị khóa",
      value: readers,
      required: true,
      passed: readers > 0,
      hint: "Cần tài khoản USER để trình diễn luồng đọc và mua hội viên.",
    },
    {
      label: "Hội viên còn hạn",
      value: activeSubscriptions,
      required: false,
      passed: activeSubscriptions > 0,
      hint: "Nên chuẩn bị sẵn một tài khoản hội viên để demo đọc toàn bộ.",
    },
    {
      label: "Bản ghi tiến độ đọc",
      value: readingProgress,
      required: false,
      passed: readingProgress > 0,
      hint: "Nên đọc thử một cuốn để trang thống kê và lịch đọc có dữ liệu.",
    },
    {
      label: "Bookmark",
      value: bookmarks,
      required: false,
      passed: bookmarks > 0,
      hint: "Nên tạo bookmark để trình diễn thư viện cá nhân.",
    },
    {
      label: "Highlight",
      value: highlights,
      required: false,
      passed: highlights > 0,
      hint: "Nên tạo highlight để trình diễn tính năng đọc sâu.",
    },
    {
      label: "Tin bán đã duyệt và còn hàng",
      value: approvedListings,
      required: false,
      passed: approvedListings > 0,
      hint: "Nên có ít nhất một tin bán để demo chợ sách cũ.",
    },
  ];

  checks.forEach(printCheck);
  const failed = checks.filter((check) => check.required && !check.passed);
  const warnings = checks.filter((check) => !check.required && !check.passed);

  console.log(
    `\nKết quả: ${checks.length - failed.length - warnings.length} PASS, ${warnings.length} WARN, ${failed.length} FAIL.`,
  );

  if (failed.length > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`Không thể kiểm tra database: ${message.slice(0, 200)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { BookStatus, CoverReviewStatus, type Prisma } from "@prisma/client";

/**
 * Một đầu sách chỉ được xuất hiện ở Catalog/Marketplace khi đã có bìa local
 * được audit và admin cho phép hiển thị.
 */
export function publicBookQualityWhere(): Prisma.BookWhereInput {
  return {
    id: { startsWith: "RB" },
    status: BookStatus.ACTIVE,
    deletedAt: null,
    isPubliclyVisible: true,
    coverReviewStatus: CoverReviewStatus.VERIFIED_LOCAL,
    sourceMetadata: { isNot: null },
  };
}

/**
 * Catalog học thuật cũ chỉ được dùng làm phương án dự phòng khi catalog thật
 * chưa được import. Giao diện luôn gắn nhãn "Dữ liệu demo" cho các sách này.
 */
export function publicDemoBookWhere(): Prisma.BookWhereInput {
  return {
    id: { startsWith: "B" },
    status: BookStatus.ACTIVE,
    deletedAt: null,
    isPubliclyVisible: true,
    coverPath: { not: null },
  };
}

export function isDemoCatalogExperienceEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.NODE_ENV !== "production" &&
    env.BOOKVERSE_ALLOW_DEMO_CATALOG?.trim().toLowerCase() === "true"
  );
}

/**
 * Cho phép bản demo chạy trọn hành trình catalog → chi tiết → reader.
 * Production luôn chỉ nhận catalog thật đã qua quality gate.
 */
export function publicExperienceBookWhere(): Prisma.BookWhereInput {
  if (!isDemoCatalogExperienceEnabled()) return publicBookQualityWhere();
  return { OR: [publicBookQualityWhere(), publicDemoBookWhere()] };
}

export function catalogBookQualityWhere(hasPublicRealCatalog: boolean): Prisma.BookWhereInput {
  if (hasPublicRealCatalog || !isDemoCatalogExperienceEnabled()) {
    return publicBookQualityWhere();
  }

  // Chỉ môi trường demo có flag rõ ràng mới dùng catalog tổng hợp và UI phải gắn nhãn.
  return publicDemoBookWhere();
}

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

export function catalogBookQualityWhere(hasPublicRealCatalog: boolean): Prisma.BookWhereInput {
  return hasPublicRealCatalog ? publicBookQualityWhere() : publicDemoBookWhere();
}

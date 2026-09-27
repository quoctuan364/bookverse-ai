export type CatalogPaginationItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * Tạo danh sách số trang gọn, không làm tràn màn hình nhỏ.
 * Bản compact dùng cho điện thoại; bản thường hiển thị thêm trang lân cận.
 */
export function buildCatalogPaginationItems(
  currentPage: number,
  totalPages: number,
  compact = false,
): CatalogPaginationItem[] {
  const safeTotalPages = Math.max(1, Math.floor(totalPages));
  const safeCurrentPage = Math.min(
    safeTotalPages,
    Math.max(1, Math.floor(currentPage)),
  );
  const visibleLimit = compact ? 5 : 7;

  if (safeTotalPages <= visibleLimit) {
    return Array.from({ length: safeTotalPages }, (_, index) => index + 1);
  }

  if (compact) {
    if (safeCurrentPage <= 3) {
      return [1, 2, 3, "ellipsis-end", safeTotalPages];
    }

    if (safeCurrentPage >= safeTotalPages - 2) {
      return [
        1,
        "ellipsis-start",
        safeTotalPages - 2,
        safeTotalPages - 1,
        safeTotalPages,
      ];
    }

    return [
      1,
      "ellipsis-start",
      safeCurrentPage,
      "ellipsis-end",
      safeTotalPages,
    ];
  }

  if (safeCurrentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", safeTotalPages];
  }

  if (safeCurrentPage >= safeTotalPages - 3) {
    return [
      1,
      "ellipsis-start",
      safeTotalPages - 4,
      safeTotalPages - 3,
      safeTotalPages - 2,
      safeTotalPages - 1,
      safeTotalPages,
    ];
  }

  return [
    1,
    "ellipsis-start",
    safeCurrentPage - 1,
    safeCurrentPage,
    safeCurrentPage + 1,
    "ellipsis-end",
    safeTotalPages,
  ];
}

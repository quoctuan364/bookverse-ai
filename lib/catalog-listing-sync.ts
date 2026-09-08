export const CATALOG_STORE_USER_ID = "BOOKVERSE-CATALOG-STORE";
export const CATALOG_STORE_EMAIL = "catalog-store@bookverse.local";
export const CATALOG_STORE_NAME = "Gian hàng BookVerse";
export const EXPECTED_REAL_CATALOG_BOOKS = 3_046;

export function catalogListingId(bookId: string): string {
  if (!/^RB\d{5}$/u.test(bookId)) {
    throw new Error(`Mã sách catalog không hợp lệ: ${bookId}`);
  }

  return `BV-CATALOG-${bookId}`;
}

export function catalogPaperEditionId(bookId: string): string {
  if (!/^RB\d{5}$/u.test(bookId)) {
    throw new Error(`Mã sách catalog không hợp lệ: ${bookId}`);
  }

  return `BV-EDITION-PAPER-NEW-${bookId}`;
}

/** FNV-1a giúp số lượng tồn kho ổn định giữa các lần chạy seed. */
export function stableCatalogStock(bookId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < bookId.length; index += 1) {
    hash ^= bookId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return 5 + ((hash >>> 0) % 16);
}

export function normalizeCatalogListingPrice(value: number): number {
  const fallbackPrice = 149_000;
  const finitePrice = Number.isFinite(value) && value > 0 ? value : fallbackPrice;
  const clampedPrice = Math.min(Math.max(finitePrice, 69_000), 499_000);

  return Math.round(clampedPrice / 1_000) * 1_000;
}

export function buildCatalogListingDescription(title: string, author: string): string {
  const safeTitle = title.trim() || "Sách chưa có tiêu đề";
  const safeAuthor = author.trim() || "Tác giả đang cập nhật";

  return `${safeTitle} của ${safeAuthor}. Sách mới do gian hàng BookVerse phân phối, có sẵn trong kho và sử dụng đúng bìa của đầu sách.`;
}

export type BookMoneyValue = number | string | { toNumber: () => number } | null | undefined;

export interface BookDisplayPrice {
  /** Giá chuẩn của đầu sách trong Book.price. */
  catalogPrice: number;
  /** Giá của tin bán đang được chọn; đây không mặc định là giá khuyến mãi. */
  listingPrice: number | null;
  /** Giá server sẽ dùng khi mua listing, nếu có. */
  purchasePrice: number;
  hasPromotion: false;
}

function numberFromMoney(value: BookMoneyValue): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value.toNumber === "function") return value.toNumber();
  return Number.NaN;
}

/**
 * Chuẩn hóa giá để giao diện không bao giờ nhận NaN hoặc số âm.
 * Giá 0 được giữ lại để hỗ trợ sách miễn phí.
 */
export function normalizeBookPrice(value: BookMoneyValue): number {
  const price = numberFromMoney(value);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

/**
 * Phân biệt rõ giá catalog và giá listing. Listing sách cũ không phải là một
 * chương trình giảm giá nên không được tự động hiển thị như salePrice.
 */
export function getBookDisplayPrice(input: {
  bookPrice: BookMoneyValue;
  listingPrice?: BookMoneyValue;
}): BookDisplayPrice {
  const catalogPrice = normalizeBookPrice(input.bookPrice);
  const rawListingPrice = numberFromMoney(input.listingPrice);
  const listingPrice = Number.isFinite(rawListingPrice) && rawListingPrice >= 0
    ? rawListingPrice
    : null;

  return {
    catalogPrice,
    listingPrice,
    purchasePrice: listingPrice ?? catalogPrice,
    hasPromotion: false,
  };
}

export function formatBookPrice(value: BookMoneyValue): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(normalizeBookPrice(value));
}

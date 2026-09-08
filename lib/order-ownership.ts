export interface SellerOwnedOrderItem {
  listing: { sellerId: string } | null;
}

export function filterSellerOwnedItems<T extends SellerOwnedOrderItem>(items: T[], sellerId: string): T[] {
  return items.filter((item) => item.listing?.sellerId === sellerId);
}

export function sellerCanAccessOrder<T extends SellerOwnedOrderItem>(items: T[], sellerId: string): boolean {
  return items.some((item) => item.listing?.sellerId === sellerId);
}

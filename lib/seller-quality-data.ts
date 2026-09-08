import { ListingStatus, OrderStatus } from "@prisma/client";

import prisma from "@/lib/prisma";
import {
  calculateSellerQualityScore,
  type SellerQualityScoreInput,
  type SellerQualityScoreResult,
} from "@/lib/seller-score";

/**
 * Tính điểm từ dữ liệu giao dịch/listing đang có. Hàm không đọc bảng
 * seller_ai_scores legacy và không dùng ID người bán để tạo số giả.
 */
export async function loadSellerQualityScores(
  sellerIds: string[],
): Promise<Map<string, SellerQualityScoreResult>> {
  const uniqueSellerIds = [...new Set(sellerIds.map((sellerId) => sellerId.trim()).filter(Boolean))];

  if (uniqueSellerIds.length === 0) {
    return new Map();
  }

  const [listings, orders] = await Promise.all([
    prisma.listing.findMany({
      where: {
        sellerId: { in: uniqueSellerIds },
      },
      select: {
        sellerId: true,
        status: true,
        reportCount: true,
        description: true,
      },
    }),
    prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
        items: {
          some: {
            listing: {
              is: {
                sellerId: { in: uniqueSellerIds },
              },
            },
          },
        },
      },
      select: {
        id: true,
        status: true,
        items: {
          where: {
            listing: {
              is: {
                sellerId: { in: uniqueSellerIds },
              },
            },
          },
          select: {
            listing: {
              select: {
                sellerId: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const inputs = new Map<string, SellerQualityScoreInput>(
    uniqueSellerIds.map((sellerId) => [
      sellerId,
      {
        completedOrders: 0,
        cancelledOrders: 0,
        reportedListings: 0,
        longDescriptionListings: 0,
        approvedListings: 0,
        totalListings: 0,
      },
    ]),
  );

  for (const listing of listings) {
    const input = inputs.get(listing.sellerId);
    if (!input) {
      continue;
    }

    input.totalListings += 1;
    input.reportedListings += listing.reportCount > 0 ? 1 : 0;
    input.longDescriptionListings += (listing.description?.trim().length ?? 0) >= 80 ? 1 : 0;
    input.approvedListings += listing.status === ListingStatus.APPROVED ? 1 : 0;
  }

  for (const order of orders) {
    // Một order chỉ được tính một lần cho mỗi seller, kể cả có nhiều item cùng seller.
    const sellersInOrder = new Set(
      order.items.map((item) => item.listing?.sellerId).filter((sellerId): sellerId is string => Boolean(sellerId)),
    );

    for (const sellerId of sellersInOrder) {
      const input = inputs.get(sellerId);
      if (!input) {
        continue;
      }

      if (order.status === OrderStatus.COMPLETED) {
        input.completedOrders += 1;
      } else if (order.status === OrderStatus.CANCELLED) {
        input.cancelledOrders += 1;
      }
    }
  }

  return new Map(
    [...inputs.entries()].map(([sellerId, input]) => [sellerId, calculateSellerQualityScore(input)]),
  );
}

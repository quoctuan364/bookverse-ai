import { SubscriptionStatus } from "@prisma/client";
import prisma from "@/lib/prisma";

export interface MembershipAccessResult {
  hasAccess: boolean;
  source: "PURCHASE" | "MEMBERSHIP" | "NONE";
  subscriptionEndsAt: Date | null;
}

/**
 * Kiểm tra quyền đọc ở server.
 *
 * Một kỳ hội viên đang hoạt động mở toàn bộ kho đọc. Quyền mua riêng cũ vẫn
 * được ưu tiên để không tước quyền Ebook mà người dùng đã thanh toán trước đây.
 */
export async function getBookReadingAccess(
  userId: string | null,
  bookId: string,
): Promise<MembershipAccessResult> {
  if (!userId) {
    return { hasAccess: false, source: "NONE", subscriptionEndsAt: null };
  }

  const now = new Date();
  const [entitlement, subscription] = await Promise.all([
    prisma.readingEntitlement.findUnique({
      where: { userId_bookId: { userId, bookId } },
      select: { id: true },
    }),
    prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { endsAt: "desc" },
      select: { endsAt: true },
    }),
  ]);

  if (entitlement) {
    return { hasAccess: true, source: "PURCHASE", subscriptionEndsAt: null };
  }

  if (subscription) {
    return {
      hasAccess: true,
      source: "MEMBERSHIP",
      subscriptionEndsAt: subscription.endsAt,
    };
  }

  return { hasAccess: false, source: "NONE", subscriptionEndsAt: null };
}

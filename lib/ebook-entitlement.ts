import { EditionType, OrderStatus, Prisma } from "@prisma/client";

/**
 * PAID_DEMO là trạng thái thanh toán thành công trong môi trường đồ án.
 * Ebook được mở ngay sau khi thanh toán, không chờ bước giao hàng vật lý.
 */
export function shouldGrantEbookEntitlements(status: OrderStatus): boolean {
  return (
    status === OrderStatus.PAID ||
    status === OrderStatus.PAID_DEMO ||
    status === OrderStatus.COMPLETED
  );
}

/**
 * Cấp quyền đọc cho các OrderItem thuộc edition EBOOK.
 * createMany + skipDuplicates bảo đảm gọi lại nhiều lần vẫn không tạo bản ghi trùng.
 */
export async function grantEbookEntitlementsForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<number> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      buyerId: true,
      status: true,
      items: {
        select: {
          bookId: true,
          edition: {
            select: { editionType: true },
          },
          listing: {
            select: {
              edition: {
                select: { editionType: true },
              },
            },
          },
        },
      },
    },
  });

  if (!order || !shouldGrantEbookEntitlements(order.status)) {
    return 0;
  }

  const ebookBookIds = Array.from(
    new Set(
      order.items
        .filter(
          (item) =>
            item.edition?.editionType === EditionType.EBOOK ||
            item.listing?.edition?.editionType === EditionType.EBOOK,
        )
        .map((item) => item.bookId),
    ),
  );

  if (ebookBookIds.length === 0) {
    return 0;
  }

  const result = await tx.readingEntitlement.createMany({
    data: ebookBookIds.map((bookId) => ({
      userId: order.buyerId,
      bookId,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

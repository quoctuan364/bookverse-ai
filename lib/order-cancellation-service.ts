import { ListingStatus, NotificationType, OrderStatus, Prisma, UserRole } from "@prisma/client";

import { recordAuditLog } from "@/lib/audit";
import { createNotifications } from "@/lib/notifications";
import { checkOrderTransition, type OrderTransitionActor } from "@/lib/order-workflow";
import prisma from "@/lib/prisma";

export type OrderCancellationErrorCode =
  | "AUTH_REQUIRED"
  | "ACCOUNT_LOCKED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "CONFLICT";

export class OrderCancellationError extends Error {
  constructor(
    public readonly code: OrderCancellationErrorCode,
    public readonly publicMessage: string,
  ) {
    super(publicMessage);
    this.name = "OrderCancellationError";
  }
}

export interface CancelOrderCommand {
  orderId: string;
  actorId: string;
  actor: OrderTransitionActor;
  note?: string;
  source: "buyer_order_detail" | "admin";
}

export interface CancelOrderReceipt {
  orderId: string;
  previousStatus: OrderStatus;
  restoredQuantity: number;
  missingListingIds: string[];
}

function roleMatchesActor(role: UserRole, actor: OrderTransitionActor): boolean {
  if (actor === "ADMIN") return role === UserRole.ADMIN;
  if (actor === "MODERATOR") return role === UserRole.MODERATOR;
  if (actor === "SELLER") return role === UserRole.SELLER || role === UserRole.ADMIN;
  return true;
}

export async function cancelOrderWithRestock(command: CancelOrderCommand): Promise<CancelOrderReceipt> {
  const orderId = command.orderId.trim();
  const actorId = command.actorId.trim();
  if (!orderId || !actorId) {
    throw new OrderCancellationError("NOT_FOUND", "Không tìm thấy đơn hàng cần hủy.");
  }

  return prisma.$transaction(
    async (tx) => {
      // Quyền và trạng thái khóa được xác minh lại trong cùng transaction với hoàn kho.
      const actorUser = await tx.user.findUnique({
        where: { id: actorId },
        select: { id: true, role: true, isLocked: true },
      });
      if (!actorUser) {
        throw new OrderCancellationError("AUTH_REQUIRED", "Bạn cần đăng nhập lại để hủy đơn.");
      }
      if (actorUser.isLocked) {
        throw new OrderCancellationError(
          "ACCOUNT_LOCKED",
          "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
        );
      }
      if (!roleMatchesActor(actorUser.role, command.actor)) {
        throw new OrderCancellationError("FORBIDDEN", "Bạn không có quyền hủy đơn hàng này.");
      }

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          buyer: { select: { id: true } },
          items: {
            select: {
              listingId: true,
              quantity: true,
              listing: { select: { sellerId: true } },
            },
          },
        },
      });
      if (!order || !order.paymentMethod) {
        throw new OrderCancellationError("NOT_FOUND", "Không tìm thấy order đã checkout.");
      }
      if (command.actor === "BUYER" && order.buyerId !== actorId) {
        throw new OrderCancellationError("FORBIDDEN", "Bạn không có quyền hủy đơn hàng này.");
      }

      const transition = checkOrderTransition(order.status, OrderStatus.CANCELLED, command.actor);
      if (!transition.allowed) {
        throw new OrderCancellationError("INVALID_TRANSITION", transition.message);
      }

      // Chỉ request đổi được đúng trạng thái cũ mới được hoàn kho và tạo side effect.
      const claimed = await tx.order.updateMany({
        where: {
          id: order.id,
          status: order.status,
          paymentMethod: { not: null },
        },
        data: { status: OrderStatus.CANCELLED },
      });
      if (claimed.count !== 1) {
        throw new OrderCancellationError(
          "CONFLICT",
          "Đơn hàng vừa được cập nhật bởi request khác. Tồn kho chưa bị hoàn lặp.",
        );
      }

      const quantityByListingId = new Map<string, number>();
      const sellerIds = new Set<string>();
      const missingListingIds = new Set<string>();
      for (const item of order.items) {
        if (!item.listingId || !item.listing) {
          if (item.listingId) missingListingIds.add(item.listingId);
          continue;
        }
        quantityByListingId.set(
          item.listingId,
          (quantityByListingId.get(item.listingId) ?? 0) + item.quantity,
        );
        sellerIds.add(item.listing.sellerId);
      }

      let restoredQuantity = 0;
      for (const [listingId, quantity] of [...quantityByListingId].sort(([left], [right]) =>
        left.localeCompare(right),
      )) {
        const reopened = await tx.listing.updateMany({
          where: { id: listingId, status: ListingStatus.SOLD },
          data: {
            stock: { increment: quantity },
            status: ListingStatus.APPROVED,
            soldAt: null,
          },
        });
        const restored =
          reopened.count === 1
            ? reopened
            : await tx.listing.updateMany({
                where: { id: listingId, status: { not: ListingStatus.SOLD } },
                data: { stock: { increment: quantity }, soldAt: null },
              });
        if (restored.count !== 1) {
          missingListingIds.add(listingId);
        } else {
          restoredQuantity += quantity;
        }
      }

      const note =
        command.note?.trim() ||
        (command.actor === "BUYER"
          ? "Buyer hủy đơn khi đơn còn PENDING."
          : `${command.actor} hủy đơn và hoàn tồn kho.`);
      await tx.orderTimelineEvent.create({
        data: {
          orderId: order.id,
          actorId,
          status: OrderStatus.CANCELLED,
          note,
          metadata: {
            source: command.source,
            previousStatus: order.status,
            restoredQuantity,
            missingListingIds: [...missingListingIds],
          },
        },
      });

      const notificationByUserId = new Map<
        string,
        { userId: string; title: string; message: string; type: NotificationType; href: string }
      >();
      notificationByUserId.set(order.buyer.id, {
        userId: order.buyer.id,
        title: "Đơn hàng đã hủy",
        message: `Đơn ${order.id} đã được hủy và tồn kho đã được cập nhật.`,
        type: NotificationType.ORDER,
        href: `/orders/${order.id}`,
      });
      for (const sellerId of sellerIds) {
        notificationByUserId.set(sellerId, {
          userId: sellerId,
          title: "Đơn hàng đã bị hủy",
          message: `Đơn ${order.id} đã bị hủy và sản phẩm đã được hoàn kho.`,
          type: NotificationType.ORDER,
          href: `/seller/orders/${order.id}`,
        });
      }
      await createNotifications([...notificationByUserId.values()], tx);

      await recordAuditLog(
        {
          actorId,
          action: command.actor === "BUYER" ? "BUYER_ORDER_CANCEL" : "ADMIN_ORDER_CANCEL",
          entityType: "ORDER",
          entityId: order.id,
          metadata: {
            previousStatus: order.status,
            nextStatus: OrderStatus.CANCELLED,
            actorRole: actorUser.role,
            restoredQuantity,
            missingListingIds: [...missingListingIds],
            source: command.source,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );

      return {
        orderId: order.id,
        previousStatus: order.status,
        restoredQuantity,
        missingListingIds: [...missingListingIds],
      };
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}

import { randomUUID } from "node:crypto";

import {
  InteractionType,
  ListingStatus,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  Prisma,
  TargetType,
} from "@prisma/client";

import { recordAuditLog } from "@/lib/audit";
import { createNotifications } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { validateRequestedQuantity } from "@/lib/stock-policy";

export type CheckoutErrorCode =
  | "AUTH_REQUIRED"
  | "ACCOUNT_LOCKED"
  | "INVALID_INPUT"
  | "CART_EMPTY"
  | "ADDRESS_FORBIDDEN"
  | "SELF_PURCHASE"
  | "LISTING_UNAVAILABLE"
  | "OUT_OF_STOCK"
  | "MIXED_SELLERS"
  | "IDEMPOTENCY_REPLAY"
  | "CONFLICT";

export class CheckoutDomainError extends Error {
  constructor(
    public readonly code: CheckoutErrorCode,
    public readonly publicMessage: string,
  ) {
    super(publicMessage);
    this.name = "CheckoutDomainError";
  }
}

export interface CheckoutCommand {
  buyerId: string;
  shippingAddressId: string;
  paymentMethod: PaymentMethod;
  checkoutKey: string;
}

export interface CheckoutReceipt {
  orderId: string;
  replayed: boolean;
}

type DecimalLike = { toNumber: () => number } | number | string;

function decimalToNumber(value: DecimalLike): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}

export function normalizeCheckoutKey(value: string): string {
  const key = value.trim();
  if (!/^[A-Za-z0-9:_-]{8,128}$/.test(key)) {
    throw new CheckoutDomainError(
      "INVALID_INPUT",
      "Mã chống gửi trùng của checkout không hợp lệ. Vui lòng tải lại giỏ hàng.",
    );
  }
  return key;
}

async function findReplayOrder(buyerId: string, checkoutKey: string): Promise<CheckoutReceipt | null> {
  const order = await prisma.order.findFirst({
    where: {
      buyerId,
      checkoutKey,
      paymentMethod: { not: null },
      buyer: { isLocked: false },
    },
    select: { id: true },
  });

  return order ? { orderId: order.id, replayed: true } : null;
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function checkoutOrder(command: CheckoutCommand): Promise<CheckoutReceipt> {
  const buyerId = command.buyerId.trim();
  const shippingAddressId = command.shippingAddressId.trim();
  const checkoutKey = normalizeCheckoutKey(command.checkoutKey);

  if (!buyerId || !shippingAddressId) {
    throw new CheckoutDomainError("INVALID_INPUT", "Thông tin checkout chưa đầy đủ.");
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        // Không tin riêng session: user luôn được đọc lại ngay trong transaction.
        const buyer = await tx.user.findUnique({
          where: { id: buyerId },
          select: { id: true, isLocked: true },
        });
        if (!buyer) {
          throw new CheckoutDomainError("AUTH_REQUIRED", "Bạn cần đăng nhập lại để checkout.");
        }
        if (buyer.isLocked) {
          throw new CheckoutDomainError(
            "ACCOUNT_LOCKED",
            "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
          );
        }

        const replay = await tx.order.findFirst({
          where: { buyerId, checkoutKey, paymentMethod: { not: null } },
          select: { id: true },
        });
        if (replay) {
          return { orderId: replay.id, replayed: true };
        }

        const [order, shippingAddress] = await Promise.all([
          tx.order.findFirst({
            where: {
              buyerId,
              status: OrderStatus.PENDING,
              paymentMethod: null,
            },
            include: {
              items: {
                include: {
                  listing: {
                    select: {
                      id: true,
                      bookId: true,
                      sellerId: true,
                      status: true,
                      price: true,
                      stock: true,
                    },
                  },
                },
              },
            },
          }),
          tx.shippingAddress.findFirst({
            where: { id: shippingAddressId, userId: buyerId },
            select: {
              id: true,
              fullName: true,
              phone: true,
              province: true,
              district: true,
              ward: true,
              addressLine: true,
              note: true,
            },
          }),
        ]);

        if (!order || order.items.length === 0) {
          throw new CheckoutDomainError("CART_EMPTY", "Giỏ hàng đang trống.");
        }
        if (!shippingAddress) {
          throw new CheckoutDomainError(
            "ADDRESS_FORBIDDEN",
            "Địa chỉ giao hàng không thuộc tài khoản của bạn.",
          );
        }

        const sortedItems = [...order.items].sort((left, right) =>
          (left.listingId ?? "").localeCompare(right.listingId ?? ""),
        );
        const sellerIds = new Set<string>();
        let totalAmount = 0;

        for (const item of sortedItems) {
          const listing = item.listing;
          if (!item.listingId || !listing || listing.bookId !== item.bookId) {
            throw new CheckoutDomainError(
              "LISTING_UNAVAILABLE",
              "Một listing trong giỏ không còn tồn tại hoặc không còn khớp với sách.",
            );
          }
          if (listing.sellerId === buyerId) {
            throw new CheckoutDomainError("SELF_PURCHASE", "Bạn không thể mua listing do chính mình đăng.");
          }
          if (listing.status !== ListingStatus.APPROVED) {
            if (listing.status === ListingStatus.SOLD || listing.stock <= 0) {
              throw new CheckoutDomainError("OUT_OF_STOCK", "Một listing trong giỏ đã hết hàng.");
            }
            throw new CheckoutDomainError(
              "LISTING_UNAVAILABLE",
              "Một listing trong giỏ không còn ở trạng thái đã duyệt.",
            );
          }

          const quantityError = validateRequestedQuantity(item.quantity, listing.stock);
          if (quantityError) {
            throw new CheckoutDomainError("OUT_OF_STOCK", quantityError);
          }
          const unitPrice = decimalToNumber(listing.price);
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            throw new CheckoutDomainError("LISTING_UNAVAILABLE", "Giá listing không hợp lệ.");
          }

          sellerIds.add(listing.sellerId);
          totalAmount += unitPrice * item.quantity;
        }

        if (sellerIds.size !== 1) {
          throw new CheckoutDomainError(
            "MIXED_SELLERS",
            "Mỗi đơn chỉ được checkout sản phẩm của một người bán.",
          );
        }
        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
          throw new CheckoutDomainError("INVALID_INPUT", "Tổng tiền checkout không hợp lệ.");
        }

        const checkoutStatus =
          command.paymentMethod === PaymentMethod.COD ? OrderStatus.PENDING : OrderStatus.PAID_DEMO;
        const shippingSnapshot = {
          addressId: shippingAddress.id,
          fullName: shippingAddress.fullName,
          phone: shippingAddress.phone,
          province: shippingAddress.province,
          district: shippingAddress.district,
          ward: shippingAddress.ward,
          addressLine: shippingAddress.addressLine,
          note: shippingAddress.note,
        } satisfies Prisma.InputJsonObject;

        // Claim cart trước. Hai request cùng cart/key chỉ có một request nhận count = 1.
        const claimedOrder = await tx.order.updateMany({
          where: {
            id: order.id,
            buyerId,
            status: OrderStatus.PENDING,
            paymentMethod: null,
            checkoutKey: null,
          },
          data: {
            checkoutKey,
            paymentMethod: command.paymentMethod,
            status: checkoutStatus,
            shippingSnapshot,
            shippingFullName: shippingAddress.fullName,
            shippingPhone: shippingAddress.phone,
            shippingProvince: shippingAddress.province,
            shippingDistrict: shippingAddress.district,
            shippingWard: shippingAddress.ward,
            shippingAddressLine: shippingAddress.addressLine,
            shippingNote: shippingAddress.note,
            totalAmount,
          },
        });
        if (claimedOrder.count !== 1) {
          throw new CheckoutDomainError(
            "IDEMPOTENCY_REPLAY",
            "Checkout này đã được xử lý bởi một request khác.",
          );
        }

        const reservedAt = new Date();
        for (const item of sortedItems) {
          const listing = item.listing!;
          const reserved = await tx.listing.updateMany({
            where: {
              id: listing.id,
              sellerId: listing.sellerId,
              bookId: item.bookId,
              status: ListingStatus.APPROVED,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });
          if (reserved.count !== 1) {
            throw new CheckoutDomainError(
              "OUT_OF_STOCK",
              "Một listing vừa hết hàng hoặc không còn khả dụng. Đơn chưa được tạo.",
            );
          }

          await tx.listing.updateMany({
            where: { id: listing.id, status: ListingStatus.APPROVED, stock: 0 },
            data: { status: ListingStatus.SOLD, soldAt: reservedAt },
          });

          const unitPrice = decimalToNumber(listing.price);
          const totalPrice = unitPrice * item.quantity;
          await tx.orderItem.update({
            where: { id: item.id },
            data: { unitPrice, totalPrice },
          });
          await tx.listing.update({
            where: { id: listing.id },
            data: { purchases: { increment: item.quantity } },
          });
          await tx.interactionEvent.create({
            data: {
              userId: buyerId,
              bookId: item.bookId,
              actionType: "PURCHASE",
              metadata: {
                orderId: order.id,
                listingId: listing.id,
                quantity: item.quantity,
                source: "cart_checkout",
              },
            },
          });
          await tx.interaction.create({
            data: {
              id: `CHECKOUT-${Date.now()}-${randomUUID().slice(0, 8)}`,
              userId: buyerId,
              bookId: item.bookId,
              type: InteractionType.PURCHASE,
              targetType: TargetType.LISTING,
              targetId: listing.id,
              value: totalPrice,
              metadata: { orderId: order.id, quantity: item.quantity, source: "cart_checkout" },
            },
          });
        }

        await tx.orderTimelineEvent.create({
          data: {
            orderId: order.id,
            actorId: buyerId,
            status: checkoutStatus,
            note:
              checkoutStatus === OrderStatus.PAID_DEMO
                ? "Buyer tạo đơn và thanh toán demo thành công."
                : "Buyer tạo đơn COD từ checkout và chờ xử lý.",
            metadata: {
              source: "cart_checkout",
              paymentMethod: command.paymentMethod,
              shippingAddressId: shippingAddress.id,
              checkoutStatus,
              checkoutKey,
            },
          },
        });

        const sellerId = [...sellerIds][0];
        await createNotifications(
          [
            {
              userId: buyerId,
              title: "Đơn hàng đã được tạo",
              message: `Đơn ${order.id} đã được tạo với phương thức ${command.paymentMethod}.`,
              type: NotificationType.ORDER,
              href: `/orders/${order.id}`,
            },
            {
              userId: sellerId,
              title: "Bạn có đơn hàng mới",
              message: `Đơn ${order.id} có sản phẩm thuộc listing của bạn.`,
              type: NotificationType.ORDER,
              href: `/seller/orders/${order.id}`,
            },
          ],
          tx,
        );
        await recordAuditLog(
          {
            actorId: buyerId,
            action: "BUYER_CHECKOUT_ORDER_CREATE",
            entityType: "ORDER",
            entityId: order.id,
            metadata: {
              paymentMethod: command.paymentMethod,
              checkoutStatus,
              itemCount: sortedItems.length,
              shippingAddressId: shippingAddress.id,
              checkoutKey,
            } satisfies Prisma.InputJsonObject,
          },
          tx,
        );

        return { orderId: order.id, replayed: false };
      },
      { maxWait: 10_000, timeout: 30_000 },
    );
  } catch (error: unknown) {
    if (
      isUniqueConflict(error) ||
      (error instanceof CheckoutDomainError && error.code === "IDEMPOTENCY_REPLAY")
    ) {
      const replay = await findReplayOrder(buyerId, checkoutKey);
      if (replay) return replay;
      throw new CheckoutDomainError("CONFLICT", "Checkout đang được xử lý. Vui lòng thử lại.");
    }
    throw error;
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { NotificationType, OrderStatus, Prisma, UserRole } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { createNotifications } from "@/lib/notifications";
import { checkOrderTransition } from "@/lib/order-workflow";
import prisma from "@/lib/prisma";
import { PermissionError, requireAuthenticatedUser } from "@/lib/permissions";

type DecimalLike = {
  toNumber: () => number;
};

export interface OrderDetailItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  book: {
    id: string;
    title: string;
    author: string;
    coverImage: string | null;
  };
  seller: {
    id: string;
    name: string;
  } | null;
}

export interface OrderTimelineItem {
  id: string;
  status: OrderStatus;
  note: string | null;
  actorName: string | null;
  createdAt: Date;
}

export interface OrderShippingSnapshot {
  fullName: string | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  addressLine: string | null;
  note: string | null;
}

export interface OrderDetailData {
  id: string;
  status: OrderStatus;
  paymentMethod: string | null;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  buyer: {
    id: string;
    name: string;
    email: string | null;
  };
  shipping: OrderShippingSnapshot;
  items: OrderDetailItem[];
  timeline: OrderTimelineItem[];
  canCancel: boolean;
  isSellerScoped: boolean;
}

export interface OrderActionResult {
  success: boolean;
  message: string;
  reason?: "AUTH_REQUIRED" | "FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "DATABASE_ERROR";
}

function decimalToNumber(value: DecimalLike | number | string): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

function normalizeCoverPath(coverPath: string | null): string | null {
  if (!coverPath) {
    return null;
  }

  if (coverPath.startsWith("/") || coverPath.startsWith("http")) {
    return coverPath;
  }

  return `/${coverPath}`;
}

function handleOrderError(error: unknown, fallbackMessage: string): OrderActionResult {
  if (error instanceof PermissionError) {
    return {
      success: false,
      message: error.message,
      reason: "AUTH_REQUIRED",
    };
  }

  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  console.error(`[order] ${message}`);

  return {
    success: false,
    message: fallbackMessage,
    reason: "DATABASE_ERROR",
  };
}

export async function getOrderDetailData(orderId: string): Promise<OrderDetailData | null> {
  const user = await requireAuthenticatedUser();
  const cleanOrderId = orderId.trim();

  if (!cleanOrderId) {
    return null;
  }

  const order = await prisma.order.findUnique({
    where: {
      id: cleanOrderId,
    },
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              authorName: true,
              coverPath: true,
            },
          },
          listing: {
            select: {
              seller: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      timelineEvents: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          actor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!order || (order.status === OrderStatus.PENDING && !order.paymentMethod)) {
    return null;
  }

  const sellerIds = new Set(order.items.map((item) => item.listing?.seller.id).filter(Boolean) as string[]);
  const isBuyer = order.buyerId === user.id;
  const isPlatformManager = user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;
  const isSellerViewer = sellerIds.has(user.id);
  const canView = isBuyer || isSellerViewer || isPlatformManager;

  if (!canView) {
    return null;
  }

  const isSellerScoped = isSellerViewer && !isBuyer && !isPlatformManager;
  const visibleItems = isSellerScoped
    ? order.items.filter((item) => item.listing?.seller.id === user.id)
    : order.items;

  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    totalAmount: isSellerScoped
      ? visibleItems.reduce((total, item) => total + decimalToNumber(item.totalPrice), 0)
      : decimalToNumber(order.totalAmount),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    buyer: order.buyer,
    shipping: {
      fullName: order.shippingFullName,
      phone: order.shippingPhone,
      province: order.shippingProvince,
      district: order.shippingDistrict,
      ward: order.shippingWard,
      addressLine: order.shippingAddressLine,
      note: order.shippingNote,
    },
    items: visibleItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: decimalToNumber(item.unitPrice),
      totalPrice: decimalToNumber(item.totalPrice),
      book: {
        id: item.book.id,
        title: item.book.title,
        author: item.book.authorName,
        coverImage: normalizeCoverPath(item.book.coverPath),
      },
      seller: item.listing?.seller ?? null,
    })),
    timeline: order.timelineEvents.map((event) => ({
      id: event.id,
      status: event.status,
      note: event.note,
      actorName: event.actor?.name ?? null,
      createdAt: event.createdAt,
    })),
    canCancel: order.buyerId === user.id && order.status === OrderStatus.PENDING && Boolean(order.paymentMethod),
    isSellerScoped,
  };
}

export async function cancelPendingOrder(orderId: string): Promise<OrderActionResult> {
  try {
    const user = await requireAuthenticatedUser();
    const cleanOrderId = orderId.trim();

    const order = await prisma.order.findFirst({
      where: {
        id: cleanOrderId,
        buyerId: user.id,
        status: OrderStatus.PENDING,
        paymentMethod: {
          not: null,
        },
      },
      include: {
        items: {
          include: {
            listing: {
              select: {
                sellerId: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        message: "Không tìm thấy đơn PENDING có thể hủy.",
        reason: "NOT_FOUND",
      };
    }

    const transition = checkOrderTransition(order.status, OrderStatus.CANCELLED, "BUYER");
    if (!transition.allowed) {
      return {
        success: false,
        message: transition.message,
        reason: "VALIDATION_ERROR",
      };
    }

    const sellerIds = Array.from(
      new Set(order.items.map((item) => item.listing?.sellerId).filter(Boolean) as string[]),
    );

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.CANCELLED,
        },
      });

      await tx.orderTimelineEvent.create({
        data: {
          orderId: order.id,
          actorId: user.id,
          status: OrderStatus.CANCELLED,
          note: "Buyer hủy đơn khi đơn còn PENDING.",
          metadata: {
            source: "buyer_order_detail",
          },
        },
      });

      await createNotifications(
        [
          {
            userId: user.id,
            title: "Đơn hàng đã hủy",
            message: `Đơn ${order.id} đã được hủy theo yêu cầu của bạn.`,
            type: NotificationType.ORDER,
            href: `/orders/${order.id}`,
          },
          ...sellerIds.map((sellerId) => ({
            userId: sellerId,
            title: "Đơn hàng đã bị hủy",
            message: `Buyer đã hủy đơn ${order.id} khi đơn còn PENDING.`,
            type: NotificationType.ORDER,
            href: `/seller/orders/${order.id}`,
          })),
        ],
        tx,
      );

      await recordAuditLog(
        {
          actorId: user.id,
          action: "BUYER_ORDER_CANCEL",
          entityType: "ORDER",
          entityId: order.id,
          metadata: {
            previousStatus: OrderStatus.PENDING,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });

    revalidatePath(`/orders/${order.id}`);
    revalidatePath("/profile");
    revalidatePath("/notifications");

    return {
      success: true,
      message: "Đã hủy đơn hàng.",
    };
  } catch (error: unknown) {
    return handleOrderError(error, "Không thể hủy đơn hàng.");
  }
}

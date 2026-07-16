"use server";

import { revalidatePath } from "next/cache";
import { OrderStatus, UserRole } from "@prisma/client";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import {
  cancelOrderWithRestock,
  OrderCancellationError,
} from "@/lib/order-cancellation-service";
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
        coverImage: normalizeBookCoverUrl(item.book.coverPath),
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
    const receipt = await cancelOrderWithRestock({
      orderId: cleanOrderId,
      actorId: user.id,
      actor: "BUYER",
      source: "buyer_order_detail",
    });

    revalidatePath(`/orders/${receipt.orderId}`);
    revalidatePath("/profile");
    revalidatePath("/notifications");

    return {
      success: true,
      message: `Đã hủy đơn hàng và hoàn ${receipt.restoredQuantity} sản phẩm vào tồn kho.`,
    };
  } catch (error: unknown) {
    if (error instanceof OrderCancellationError) {
      return {
        success: false,
        message: error.publicMessage,
        reason:
          error.code === "AUTH_REQUIRED" || error.code === "ACCOUNT_LOCKED"
            ? "AUTH_REQUIRED"
            : error.code === "FORBIDDEN"
              ? "FORBIDDEN"
              : error.code === "NOT_FOUND"
                ? "NOT_FOUND"
                : "VALIDATION_ERROR",
      };
    }
    return handleOrderError(error, "Không thể hủy đơn hàng.");
  }
}

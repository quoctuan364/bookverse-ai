"use server";

import {
  InteractionType,
  ListingCondition,
  ListingStatus,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  Prisma,
  TargetType,
} from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { createNotifications } from "@/lib/notifications";
import { getCurrentUser, PermissionError, requireAuthenticatedUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

type DecimalLike = {
  toNumber: () => number;
};

export interface CartItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  listingId: string | null;
  listingTitle: string | null;
  listingStatus: ListingStatus | null;
  condition: ListingCondition | null;
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
  availability: {
    ok: boolean;
    message: string;
  };
}

export interface CartShippingAddress {
  id: string;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  note: string | null;
  isDefault: boolean;
}

export interface CartPageData {
  orderId: string | null;
  totalAmount: number;
  totalItems: number;
  items: CartItem[];
  shippingAddresses: CartShippingAddress[];
  selectedShippingAddressId: string | null;
  checkoutIssues: string[];
  canCheckout: boolean;
}

export interface CartActionResult {
  success: boolean;
  message: string;
  orderId?: string;
  reason?: "AUTH_REQUIRED" | "VALIDATION_ERROR" | "NOT_FOUND" | "DATABASE_ERROR";
}

class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutValidationError";
  }
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

function parsePaymentMethod(value: string): PaymentMethod | null {
  const cleanValue = value.trim().toUpperCase();

  if (
    cleanValue === PaymentMethod.COD ||
    cleanValue === PaymentMethod.BANK_TRANSFER_DEMO ||
    cleanValue === PaymentMethod.WALLET_DEMO
  ) {
    return cleanValue as PaymentMethod;
  }

  return null;
}

function buildEmptyCartData(shippingAddresses: CartShippingAddress[] = []): CartPageData {
  const selectedShippingAddressId = shippingAddresses[0]?.id ?? null;

  return {
    orderId: null,
    totalAmount: 0,
    totalItems: 0,
    items: [],
    shippingAddresses,
    selectedShippingAddressId,
    checkoutIssues: ["Giỏ hàng đang trống."],
    canCheckout: false,
  };
}

function getAvailabilityMessage(item: {
  listingId: string | null;
  unitPrice: DecimalLike | number | string;
  totalPrice: DecimalLike | number | string;
  bookId: string;
  listing: {
    bookId: string | null;
    sellerId: string;
    status: ListingStatus;
    price: DecimalLike | number | string;
  } | null;
}, userId: string): string | null {
  if (!item.listingId || !item.listing) {
    return "Listing không còn tồn tại.";
  }

  if (item.listing.status !== ListingStatus.APPROVED) {
    return "Listing không còn ở trạng thái đã duyệt.";
  }

  if (item.listing.bookId !== item.bookId) {
    return "Listing không còn khớp với sách trong giỏ.";
  }

  if (item.listing.sellerId === userId) {
    return "Bạn không thể mua listing do chính mình đăng.";
  }

  const listingPrice = decimalToNumber(item.listing.price);
  if (!Number.isFinite(listingPrice) || listingPrice <= 0) {
    return "Giá listing không hợp lệ.";
  }

  if (decimalToNumber(item.unitPrice) <= 0 || decimalToNumber(item.totalPrice) <= 0) {
    return "Giá trong giỏ hàng không hợp lệ.";
  }

  return null;
}

function buildCheckoutIssues(items: CartItem[], shippingAddresses: CartShippingAddress[]): string[] {
  const issues = new Set<string>();

  if (items.length === 0) {
    issues.add("Giỏ hàng đang trống.");
  }

  for (const item of items) {
    if (!item.availability.ok) {
      issues.add(item.availability.message);
    }
  }

  const sellerIds = new Set(items.map((item) => item.seller?.id).filter(Boolean) as string[]);
  if (sellerIds.size > 1) {
    issues.add("Giỏ hàng đang có nhiều seller. Demo Phase 4 chỉ cho checkout một seller mỗi đơn.");
  }

  if (shippingAddresses.length === 0) {
    issues.add("Bạn cần thêm địa chỉ giao hàng trước khi checkout.");
  }

  return Array.from(issues);
}

async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();

  if (!user || user.isLocked) {
    return null;
  }

  return user.id;
}

async function requireCurrentUserId(): Promise<string> {
  const user = await requireAuthenticatedUser();
  return user.id;
}

function handleCartError(error: unknown, fallbackMessage: string): CartActionResult {
  if (error instanceof PermissionError) {
    return {
      success: false,
      message: error.message,
      reason: "AUTH_REQUIRED",
    };
  }

  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  console.error(`[cart] ${message}`);

  return {
    success: false,
    message: fallbackMessage,
    reason: "DATABASE_ERROR",
  };
}

export async function getCartPageData(): Promise<CartPageData> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return buildEmptyCartData();
  }

  try {
    const [order, shippingAddresses] = await Promise.all([
      prisma.order.findFirst({
        where: {
          buyerId: userId,
          status: OrderStatus.PENDING,
          paymentMethod: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          items: {
            orderBy: {
              createdAt: "desc",
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
                  id: true,
                  title: true,
                  bookId: true,
                  condition: true,
                  price: true,
                  status: true,
                  sellerId: true,
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
        },
      }),
      prisma.shippingAddress.findMany({
        where: {
          userId,
        },
        orderBy: [
          {
            isDefault: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        select: {
          id: true,
          fullName: true,
          phone: true,
          province: true,
          district: true,
          ward: true,
          addressLine: true,
          note: true,
          isDefault: true,
        },
      }),
    ]);

    if (!order) {
      return buildEmptyCartData(shippingAddresses);
    }

    const items = order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: decimalToNumber(item.unitPrice),
      totalPrice: decimalToNumber(item.totalPrice),
      listingId: item.listingId,
      listingTitle: item.listing?.title ?? null,
      listingStatus: item.listing?.status ?? null,
      condition: item.listing?.condition ?? null,
      book: {
        id: item.book.id,
        title: item.book.title,
        author: item.book.authorName,
        coverImage: normalizeCoverPath(item.book.coverPath),
      },
      seller: item.listing?.seller ?? null,
      availability: {
        ok: !getAvailabilityMessage(item, userId),
        message: getAvailabilityMessage(item, userId) ?? "Có thể checkout.",
      },
    }));
    const selectedShippingAddressId =
      shippingAddresses.find((address) => address.isDefault)?.id ?? shippingAddresses[0]?.id ?? null;
    const checkoutIssues = buildCheckoutIssues(items, shippingAddresses);

    return {
      orderId: order.id,
      totalAmount: decimalToNumber(order.totalAmount),
      totalItems: items.reduce((total, item) => total + item.quantity, 0),
      items,
      shippingAddresses,
      selectedShippingAddressId,
      checkoutIssues,
      canCheckout: checkoutIssues.length === 0,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getCartPageData] ${message}`);
    return buildEmptyCartData();
  }
}

export async function updateCartItemQuantity(
  orderItemId: string,
  quantity: number,
): Promise<CartActionResult> {
  try {
    const userId = await requireCurrentUserId();

    const safeQuantity = Math.min(Math.max(Math.floor(quantity), 1), 9);
    const item = await prisma.orderItem.findFirst({
      where: {
        id: orderItemId.trim(),
        order: {
          buyerId: userId,
          status: OrderStatus.PENDING,
          paymentMethod: null,
        },
      },
      include: {
        order: {
          select: {
            id: true,
          },
        },
        listing: {
          select: {
            bookId: true,
            sellerId: true,
            status: true,
            price: true,
          },
        },
      },
    });

    if (!item) {
      return {
        success: false,
        message: "Không tìm thấy sản phẩm trong giỏ.",
        reason: "NOT_FOUND",
      };
    }

    const availabilityMessage = getAvailabilityMessage(item, userId);
    if (availabilityMessage) {
      return {
        success: false,
        message: availabilityMessage,
        reason: "VALIDATION_ERROR",
      };
    }

    const unitPrice = decimalToNumber(item.listing?.price ?? item.unitPrice);
    const currentTotal = decimalToNumber(item.totalPrice);
    const nextTotal = unitPrice * safeQuantity;
    const diff = nextTotal - currentTotal;

    await prisma.$transaction([
      prisma.orderItem.update({
        where: {
          id: item.id,
        },
        data: {
          quantity: safeQuantity,
          unitPrice,
          totalPrice: nextTotal,
        },
      }),
      prisma.order.update({
        where: {
          id: item.order.id,
        },
        data: {
          totalAmount: {
            increment: diff,
          },
        },
      }),
    ]);

    return {
      success: true,
      message: "Đã cập nhật số lượng.",
    };
  } catch (error: unknown) {
    return handleCartError(error, "Không thể cập nhật giỏ hàng.");
  }
}

export async function removeCartItem(orderItemId: string): Promise<CartActionResult> {
  try {
    const userId = await requireCurrentUserId();

    const item = await prisma.orderItem.findFirst({
      where: {
        id: orderItemId.trim(),
        order: {
          buyerId: userId,
          status: OrderStatus.PENDING,
          paymentMethod: null,
        },
      },
      include: {
        order: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!item) {
      return {
        success: false,
        message: "Không tìm thấy sản phẩm trong giỏ.",
        reason: "NOT_FOUND",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({
        where: {
          id: item.id,
        },
      });

      const remainingItems = await tx.orderItem.findMany({
        where: {
          orderId: item.order.id,
        },
        select: {
          totalPrice: true,
        },
      });

      await tx.order.update({
        where: {
          id: item.order.id,
        },
        data: {
          totalAmount: remainingItems.reduce((total, currentItem) => total + decimalToNumber(currentItem.totalPrice), 0),
        },
      });
    });

    return {
      success: true,
      message: "Đã xóa sản phẩm khỏi giỏ.",
    };
  } catch (error: unknown) {
    return handleCartError(error, "Không thể xóa sản phẩm khỏi giỏ.");
  }
}

export async function checkoutCart(
  shippingAddressId: string,
  paymentMethodValue: string,
): Promise<CartActionResult> {
  try {
    const userId = await requireCurrentUserId();

    const paymentMethod = parsePaymentMethod(paymentMethodValue);
    const cleanShippingAddressId = shippingAddressId.trim();

    if (!paymentMethod) {
      return {
        success: false,
        message: "Phương thức thanh toán không hợp lệ.",
        reason: "VALIDATION_ERROR",
      };
    }

    if (!cleanShippingAddressId) {
      return {
        success: false,
        message: "Vui lòng chọn địa chỉ giao hàng.",
        reason: "VALIDATION_ERROR",
      };
    }

    const checkoutOrderId = await prisma.$transaction(async (tx) => {
      const [order, shippingAddress] = await Promise.all([
        tx.order.findFirst({
          where: {
            buyerId: userId,
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
                  },
                },
              },
            },
          },
        }),
        tx.shippingAddress.findFirst({
          where: {
            id: cleanShippingAddressId,
            userId,
          },
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
        throw new CheckoutValidationError("Giỏ hàng đang trống.");
      }

      if (!shippingAddress) {
        throw new CheckoutValidationError("Địa chỉ giao hàng không thuộc tài khoản của bạn.");
      }

      const invalidMessages = order.items
        .map((item) => getAvailabilityMessage(item, userId))
        .filter((message): message is string => Boolean(message));

      if (invalidMessages.length > 0) {
        throw new CheckoutValidationError(`Giỏ hàng có item không hợp lệ: ${invalidMessages[0]}`);
      }

      const sellerIds = Array.from(
        new Set(order.items.map((item) => item.listing?.sellerId).filter(Boolean) as string[]),
      );

      if (sellerIds.length !== 1) {
        throw new CheckoutValidationError("Demo Phase 4 chỉ cho checkout một seller mỗi đơn. Vui lòng xóa bớt item khác seller.");
      }

      const totalAmount = order.items.reduce((total, item) => {
        const unitPrice = decimalToNumber(item.listing?.price ?? item.unitPrice);
        return total + unitPrice * item.quantity;
      }, 0);

      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        throw new CheckoutValidationError("Tổng tiền không hợp lệ.");
      }

      const checkoutStatus =
        paymentMethod === PaymentMethod.COD ? OrderStatus.PENDING : OrderStatus.PAID_DEMO;
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

      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          paymentMethod,
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

      await tx.orderTimelineEvent.create({
        data: {
          orderId: order.id,
          actorId: userId,
          status: checkoutStatus,
          note:
            checkoutStatus === OrderStatus.PAID_DEMO
              ? "Buyer tạo đơn và thanh toán demo thành công."
              : "Buyer tạo đơn COD từ checkout và chờ xử lý.",
          metadata: {
            source: "cart_checkout",
            paymentMethod,
            shippingAddressId: shippingAddress.id,
            checkoutStatus,
          },
        },
      });

      for (const item of order.items) {
        const unitPrice = decimalToNumber(item.listing?.price ?? item.unitPrice);
        const totalPrice = unitPrice * item.quantity;

        await tx.orderItem.update({
          where: {
            id: item.id,
          },
          data: {
            unitPrice,
            totalPrice,
          },
        });

        if (item.listingId) {
          await tx.listing.update({
            where: {
              id: item.listingId,
            },
            data: {
              purchases: {
                increment: item.quantity,
              },
            },
          });
        }

        await tx.interactionEvent.create({
          data: {
            userId,
            bookId: item.bookId,
            actionType: "PURCHASE",
            metadata: {
              orderId: order.id,
              listingId: item.listingId,
              quantity: item.quantity,
              source: "cart_checkout",
            },
          },
        });

        await tx.interaction.create({
          data: {
            id: `CHECKOUT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
            userId,
            bookId: item.bookId,
            type: InteractionType.PURCHASE,
            targetType: item.listingId ? TargetType.LISTING : TargetType.BOOK,
            targetId: item.listingId ?? item.bookId,
            value: totalPrice,
            metadata: {
              orderId: order.id,
              quantity: item.quantity,
              source: "cart_checkout",
            },
          },
        });
      }

      await createNotifications(
        [
          {
            userId,
            title: "Đơn hàng đã được tạo",
            message: `Đơn ${order.id} đã được tạo với phương thức ${paymentMethod}.`,
            type: NotificationType.ORDER,
            href: `/orders/${order.id}`,
          },
          ...sellerIds.map((sellerId) => ({
            userId: sellerId,
            title: "Bạn có đơn hàng mới",
            message: `Đơn ${order.id} có sản phẩm thuộc listing của bạn.`,
            type: NotificationType.ORDER,
            href: `/seller/orders/${order.id}`,
          })),
        ],
        tx,
      );

      await recordAuditLog(
        {
          actorId: userId,
          action: "BUYER_CHECKOUT_ORDER_CREATE",
          entityType: "ORDER",
          entityId: order.id,
          metadata: {
            paymentMethod,
            checkoutStatus,
            itemCount: order.items.length,
            shippingAddressId: shippingAddress.id,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );

      return order.id;
    });

    return {
      success: true,
      message: `Đã tạo đơn hàng. Mã đơn: ${checkoutOrderId}`,
      orderId: checkoutOrderId,
    };
  } catch (error: unknown) {
    if (error instanceof CheckoutValidationError) {
      return {
        success: false,
        message: error.message,
        reason: "VALIDATION_ERROR",
      };
    }

    return handleCartError(error, "Không thể thanh toán giỏ hàng.");
  }
}

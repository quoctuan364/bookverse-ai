"use server";

import {
  ListingCondition,
  ListingStatus,
  OrderStatus,
  PaymentMethod,
} from "@prisma/client";
import { checkoutOrder, CheckoutDomainError } from "@/lib/checkout-service";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import { getCurrentUser, PermissionError, requireAuthenticatedUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { validateRequestedQuantity } from "@/lib/stock-policy";

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
  stock: number;
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

function decimalToNumber(value: DecimalLike | number | string): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
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
  quantity: number;
  listing: {
    bookId: string | null;
    sellerId: string;
    status: ListingStatus;
    price: DecimalLike | number | string;
    stock: number;
  } | null;
}, userId: string): string | null {
  if (!item.listingId || !item.listing) {
    return "Listing không còn tồn tại.";
  }

  if (item.listing.status !== ListingStatus.APPROVED) {
    return "Listing không còn ở trạng thái đã duyệt.";
  }

  const quantityError = validateRequestedQuantity(item.quantity, item.listing.stock);
  if (quantityError) {
    return quantityError;
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
                  stock: true,
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
      // Listing.title là snapshot do seller nhập; giao diện dùng tên chuẩn theo bookId.
      listingTitle: getVietnameseBookTitle(item.book.id, item.book.title),
      listingStatus: item.listing?.status ?? null,
      stock: item.listing?.stock ?? 0,
      condition: item.listing?.condition ?? null,
      book: {
        id: item.book.id,
        title: getVietnameseBookTitle(item.book.id, item.book.title),
        author: item.book.authorName,
        coverImage: normalizeBookCoverUrl(item.book.coverPath),
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

    const safeQuantity = Math.floor(quantity);
    if (!Number.isInteger(safeQuantity) || safeQuantity < 1 || safeQuantity > 999) {
      return {
        success: false,
        message: "Số lượng phải là số nguyên từ 1 đến 999.",
        reason: "VALIDATION_ERROR",
      };
    }
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
            stock: true,
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

    const availabilityMessage = getAvailabilityMessage({ ...item, quantity: safeQuantity }, userId);
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
  checkoutKeyValue: string,
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

    const receipt = await checkoutOrder({
      buyerId: userId,
      shippingAddressId: cleanShippingAddressId,
      paymentMethod,
      checkoutKey: checkoutKeyValue,
    });

    return {
      success: true,
      message: receipt.replayed
        ? `Checkout đã được xử lý trước đó. Mã đơn: ${receipt.orderId}`
        : `Đã tạo đơn hàng. Mã đơn: ${receipt.orderId}`,
      orderId: receipt.orderId,
    };
  } catch (error: unknown) {
    if (error instanceof CheckoutDomainError) {
      return {
        success: false,
        message: error.publicMessage,
        reason:
          error.code === "AUTH_REQUIRED" || error.code === "ACCOUNT_LOCKED"
            ? "AUTH_REQUIRED"
            : "VALIDATION_ERROR",
      };
    }

    return handleCartError(error, "Không thể thanh toán giỏ hàng.");
  }
}

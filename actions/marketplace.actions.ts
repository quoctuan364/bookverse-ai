"use server";

import {
  InteractionType,
  ListingCondition,
  ListingStatus,
  NotificationType,
  OrderStatus,
  Prisma,
  TargetType,
  UserRole,
} from "@prisma/client";
import { createNotifications } from "@/lib/notifications";
import { PermissionError, requireAuthenticatedUser, requireSellerUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

type DecimalLike = {
  toNumber: () => number;
};

export interface MarketplaceBookOption {
  id: string;
  title: string;
  author: string;
}

export interface MarketplaceListingItem {
  id: string;
  title: string;
  description: string | null;
  condition: ListingCondition;
  price: number;
  status: ListingStatus;
  views: number;
  cartAdds: number;
  purchases: number;
  targetAudience: string | null;
  seller: {
    id: string;
    name: string;
  };
  sellerAiScore: {
    score: number;
    completedOrders: number;
    responseRate: number;
    isTrusted: boolean;
  };
  book: {
    id: string;
    title: string;
    author: string;
    coverImage: string | null;
    category: string;
  } | null;
}

export interface MarketplacePageData {
  listings: MarketplaceListingItem[];
  bookOptions: MarketplaceBookOption[];
  totalListings: number;
  visibleListings: number;
}

export interface MarketplacePageFilters {
  query?: string;
  condition?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  reason?: "AUTH_REQUIRED" | "FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "DATABASE_ERROR";
}

export interface CreateListingInput {
  bookId?: string;
  title: string;
  description: string;
  price: string;
  condition: string;
  targetAudience?: string;
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

function buildListingId(): string {
  return `LIST-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function buildCartOrderId(): string {
  return `CART-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function buildMockSellerAiScore(sellerId: string, cartAdds: number, purchases: number) {
  const sellerSeed = Array.from(sellerId).reduce((total, character) => total + character.charCodeAt(0), 0);
  const behaviorBonus = Math.min(18, purchases * 4 + cartAdds);
  const score = Math.min(99, 72 + (sellerSeed % 14) + behaviorBonus);
  const responseRate = Math.min(99, 82 + (sellerSeed % 12));

  return {
    score,
    completedOrders: Math.max(3, purchases + (sellerSeed % 17)),
    responseRate,
    isTrusted: score >= 85,
  };
}

function parseCondition(value: string): ListingCondition {
  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue in ListingCondition) {
    return ListingCondition[normalizedValue as keyof typeof ListingCondition];
  }

  return ListingCondition.GOOD;
}

function parseOptionalCondition(value?: string): ListingCondition | undefined {
  const normalizedValue = value?.trim().toUpperCase();

  if (!normalizedValue || normalizedValue === "ALL") {
    return undefined;
  }

  if (normalizedValue in ListingCondition) {
    return ListingCondition[normalizedValue as keyof typeof ListingCondition];
  }

  return undefined;
}

function parsePrice(value: string): number {
  const price = Number(value.replace(/[^\d.]/g, ""));

  if (!Number.isFinite(price) || price <= 0) {
    return 0;
  }

  return Math.round(price);
}

async function requireCurrentUserId(): Promise<string> {
  const user = await requireAuthenticatedUser();
  return user.id;
}

function permissionReason(error: PermissionError): ActionResult["reason"] {
  return error.message.includes("đăng nhập") ? "AUTH_REQUIRED" : "FORBIDDEN";
}

function buildMarketplaceWhere(filters: MarketplacePageFilters = {}): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {
    status: ListingStatus.APPROVED,
  };
  const condition = parseOptionalCondition(filters.condition);
  const query = filters.query?.trim();

  if (condition) {
    where.condition = condition;
  }

  if (query) {
    where.OR = [
      {
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        targetAudience: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        seller: {
          is: {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      },
      {
        book: {
          is: {
            title: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      },
      {
        book: {
          is: {
            authorName: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  return where;
}

export async function getMarketplacePageData(
  filters: MarketplacePageFilters = {},
): Promise<MarketplacePageData> {
  try {
    const where = buildMarketplaceWhere(filters);

    const [listings, bookOptions, totalListings] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: 40,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
            },
          },
          book: {
            include: {
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.book.findMany({
        orderBy: {
          title: "asc",
        },
        take: 80,
        select: {
          id: true,
          title: true,
          authorName: true,
        },
      }),
      prisma.listing.count({
        where: {
          status: ListingStatus.APPROVED,
        },
      }),
    ]);

    return {
      listings: listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        condition: listing.condition,
        price: decimalToNumber(listing.price),
        status: listing.status,
        views: listing.views,
        cartAdds: listing.cartAdds,
        purchases: listing.purchases,
        targetAudience: listing.targetAudience,
        seller: listing.seller,
        sellerAiScore: buildMockSellerAiScore(listing.seller.id, listing.cartAdds, listing.purchases),
        book: listing.book
          ? {
              id: listing.book.id,
              title: listing.book.title,
              author: listing.book.authorName,
              coverImage: normalizeCoverPath(listing.book.coverPath),
              category: listing.book.category.name,
            }
          : null,
      })),
      bookOptions: bookOptions.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.authorName,
      })),
      totalListings,
      visibleListings: listings.length,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getMarketplacePageData] ${message}`);
    return {
      listings: [],
      bookOptions: [],
      totalListings: 0,
      visibleListings: 0,
    };
  }
}

export async function createListing(data: CreateListingInput): Promise<ActionResult> {
  try {
    const seller = await requireSellerUser();
    const sellerId = seller.id;
    const title = data.title.trim();
    const description = data.description.trim();
    const targetAudience = data.targetAudience?.trim() || null;
    const price = parsePrice(data.price);
    const condition = parseCondition(data.condition);
    const bookId = data.bookId?.trim() || null;

    if (!title || !description || price <= 0) {
      return {
        success: false,
        message: "Vui lòng nhập đầy đủ tiêu đề, mô tả và giá bán hợp lệ.",
        reason: "VALIDATION_ERROR",
      };
    }

    await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          id: buildListingId(),
          sellerId,
          bookId,
          title,
          description,
          price,
          condition,
          status: ListingStatus.PENDING_REVIEW,
          targetAudience,
          hasCover: Boolean(bookId),
        },
      });
      const moderators = await tx.user.findMany({
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.MODERATOR],
          },
          isLocked: false,
        },
        select: {
          id: true,
        },
        take: 20,
      });

      await createNotifications(
        moderators.map((moderator) => ({
          userId: moderator.id,
          title: "Listing mới chờ duyệt",
          message: `Seller vừa gửi tin bán "${listing.title}".`,
          type: NotificationType.MARKETPLACE,
          href: "/admin#marketplace",
        })),
        tx,
      );
    });

    return {
      success: true,
      message: "Đã gửi listing. Admin cần duyệt trước khi hiển thị chính thức.",
    };
  } catch (error: unknown) {
    if (error instanceof PermissionError) {
      return {
        success: false,
        message: error.message,
        reason: permissionReason(error),
      };
    }

    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[createListing] ${message}`);
    return {
      success: false,
      message: "Không thể tạo listing. Vui lòng thử lại.",
      reason: "DATABASE_ERROR",
    };
  }
}

export async function addListingToCart(listingId: string): Promise<ActionResult> {
  try {
    const userId = await requireCurrentUserId();
    const cleanListingId = listingId.trim();

    const listing = await prisma.listing.findUnique({
      where: {
        id: cleanListingId,
      },
      select: {
        id: true,
        bookId: true,
        price: true,
        sellerId: true,
        status: true,
      },
    });

    if (!listing || !listing.bookId) {
      return {
        success: false,
        message: "Không tìm thấy listing hợp lệ.",
        reason: "NOT_FOUND",
      };
    }

    if (listing.status !== ListingStatus.APPROVED) {
      return {
        success: false,
        message: "Listing này chưa được duyệt nên chưa thể thêm vào giỏ.",
        reason: "VALIDATION_ERROR",
      };
    }

    if (listing.sellerId === userId) {
      return {
        success: false,
        message: "Bạn không thể mua listing do chính mình đăng.",
        reason: "VALIDATION_ERROR",
      };
    }

    const listingBookId = listing.bookId;
    const price = decimalToNumber(listing.price);

    if (!Number.isFinite(price) || price <= 0) {
      return {
        success: false,
        message: "Giá listing không hợp lệ.",
        reason: "VALIDATION_ERROR",
      };
    }

    const currentCart = await prisma.order.findFirst({
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
                sellerId: true,
              },
            },
          },
        },
      },
    });
    const currentSellerIds = new Set(
      currentCart?.items.map((item) => item.listing?.sellerId).filter(Boolean) as string[] | undefined,
    );

    if (currentSellerIds.size > 0 && !currentSellerIds.has(listing.sellerId)) {
      return {
        success: false,
        message: "Giỏ hàng đang có item của seller khác. Demo Phase 4 chỉ checkout một seller mỗi đơn.",
        reason: "VALIDATION_ERROR",
      };
    }

    await prisma.$transaction(async (tx) => {
      let cartOrder = currentCart ? { id: currentCart.id } : null;

      if (!cartOrder) {
        cartOrder = await tx.order.create({
          data: {
            id: buildCartOrderId(),
            buyerId: userId,
            status: OrderStatus.PENDING,
            totalAmount: 0,
          },
          select: {
            id: true,
          },
        });
      }

      const existingItem = await tx.orderItem.findFirst({
        where: {
          orderId: cartOrder.id,
          listingId: listing.id,
        },
        select: {
          id: true,
          quantity: true,
        },
      });

      if (existingItem) {
        const nextQuantity = existingItem.quantity + 1;
        await tx.orderItem.update({
          where: {
            id: existingItem.id,
          },
          data: {
            quantity: nextQuantity,
            unitPrice: price,
            totalPrice: price * nextQuantity,
          },
        });
      } else {
        await tx.orderItem.create({
          data: {
            orderId: cartOrder.id,
            bookId: listingBookId,
            listingId: listing.id,
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
          },
        });
      }

      await tx.order.update({
        where: {
          id: cartOrder.id,
        },
        data: {
          totalAmount: {
            increment: price,
          },
        },
      });

      await tx.listing.update({
        where: {
          id: listing.id,
        },
        data: {
          cartAdds: {
            increment: 1,
          },
        },
      });

      await tx.interactionEvent.create({
        data: {
          userId,
          bookId: listingBookId,
          actionType: "CART_ADD",
          metadata: {
            listingId: listing.id,
            cartOrderId: cartOrder.id,
            source: "marketplace",
          },
        },
      });

      await tx.interaction.create({
        data: {
          id: `CART-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          userId,
          bookId: listingBookId,
          type: InteractionType.CART_ADD,
          targetType: TargetType.LISTING,
          targetId: listing.id,
          metadata: {
            source: "marketplace",
            cartOrderId: cartOrder.id,
          },
        },
      });
    });

    return {
      success: true,
      message: "Đã thêm vào giỏ hàng và ghi nhận hành vi CART_ADD.",
    };
  } catch (error: unknown) {
    if (error instanceof PermissionError) {
      return {
        success: false,
        message: error.message,
        reason: permissionReason(error),
      };
    }

    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[addListingToCart] ${message}`);
    return {
      success: false,
      message: "Không thể thêm giỏ hàng.",
      reason: "DATABASE_ERROR",
    };
  }
}

export async function createDemoOrder(listingId: string): Promise<ActionResult> {
  const result = await addListingToCart(listingId);

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    message: "Đã đưa sách vào giỏ hàng. Hãy chọn địa chỉ giao hàng để hoàn tất checkout.",
  };
}

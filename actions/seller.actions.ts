"use server";

import { revalidatePath } from "next/cache";
import {
  ListingCondition,
  ListingStatus,
  NotificationType,
  OrderStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { grantEbookEntitlementsForOrder } from "@/lib/ebook-entitlement";
import { recordAuditLog } from "@/lib/audit";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { createNotification, createNotifications } from "@/lib/notifications";
import { checkOrderTransition, getAllowedOrderNextStatuses } from "@/lib/order-workflow";
import { filterSellerOwnedItems } from "@/lib/order-ownership";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { calculateSellerQualityScore, type SellerQualityScoreResult } from "@/lib/seller-score";

type DecimalLike = {
  toNumber: () => number;
};

export interface SellerActionResult {
  success: boolean;
  message: string;
  reason?: "AUTH_REQUIRED" | "FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "DATABASE_ERROR";
}

export interface SellerGateData {
  status: "UNAUTHENTICATED" | "NEEDS_SELLER" | "SELLER";
  user: {
    id: string;
    name: string;
    email: string | null;
    role: UserRole;
  } | null;
}

export interface SellerBookOption {
  id: string;
  title: string;
  author: string;
}

export interface SellerListingInput {
  bookId?: string;
  title: string;
  description: string;
  price: string;
  condition: string;
  targetAudience?: string;
  imageUrl?: string;
}

export interface SellerListingItem {
  id: string;
  title: string;
  description: string | null;
  condition: ListingCondition;
  price: number;
  status: ListingStatus;
  rejectionReason: string | null;
  moderationNote: string | null;
  reportCount: number;
  views: number;
  cartAdds: number;
  purchases: number;
  targetAudience: string | null;
  imageUrl: string | null;
  orderCount: number;
  createdAt: Date;
  updatedAt: Date;
  book: {
    id: string;
    title: string;
    author: string;
    coverImage: string | null;
  } | null;
}

export interface SellerListingsData {
  gate: SellerGateData;
  listings: SellerListingItem[];
  bookOptions: SellerBookOption[];
  filters: {
    q: string;
    status: string;
  };
}

export interface SellerListingEditorData {
  gate: SellerGateData;
  listing: SellerListingItem | null;
  bookOptions: SellerBookOption[];
}

export interface SellerOrderListItem {
  id: string;
  status: OrderStatus;
  paymentMethod: string | null;
  buyerName: string;
  buyerEmail: string | null;
  sellerRevenue: number;
  sellerItemCount: number;
  createdAt: Date;
  items: Array<{
    id: string;
    listingId: string | null;
    listingTitle: string | null;
    bookTitle: string;
    quantity: number;
    totalPrice: number;
  }>;
}

export interface SellerOrdersData {
  gate: SellerGateData;
  orders: SellerOrderListItem[];
  filters: {
    q: string;
    status: string;
  };
}

export interface SellerOrderDetailData {
  gate: SellerGateData;
  order: (SellerOrderListItem & {
    shipping: {
      fullName: string | null;
      phone: string | null;
      province: string | null;
      district: string | null;
      ward: string | null;
      addressLine: string | null;
      note: string | null;
    };
    timeline: Array<{
      id: string;
      status: OrderStatus;
      note: string | null;
      actorName: string | null;
      createdAt: Date;
    }>;
    allowedNextStatuses: OrderStatus[];
  }) | null;
}

export interface SellerRevenueData {
  gate: SellerGateData;
  totalCompletedRevenue: number;
  monthRevenue: number;
  sevenDayRevenue: number;
  completedOrderCount: number;
  cancelledOrderCount: number;
  topListings: Array<{
    listingId: string;
    title: string;
    quantity: number;
    revenue: number;
  }>;
  recentTransactions: SellerOrderListItem[];
}

export interface SellerOverviewData {
  gate: SellerGateData;
  metrics: Array<{
    label: string;
    value: number;
    tone?: "money" | "warning" | "success";
  }>;
  listingCounts: Record<string, number>;
  orderCounts: Record<string, number>;
  recentListings: SellerListingItem[];
  recentOrders: SellerOrderListItem[];
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    href: string | null;
    readAt: Date | null;
    createdAt: Date;
  }>;
  score: SellerQualityScoreResult;
}

const nonCartOrderWhere: Prisma.OrderWhereInput = {
  NOT: {
    AND: [
      {
        status: OrderStatus.PENDING,
      },
      {
        paymentMethod: null,
      },
    ],
  },
};

function decimalToNumber(value: DecimalLike | number | string): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

function cleanText(value: string, maxLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function parsePrice(value: string): number {
  const price = Number(value.replace(/[^\d.]/g, ""));

  if (!Number.isFinite(price) || price <= 0) {
    return 0;
  }

  return Math.round(price);
}

function parseCondition(value: string): ListingCondition {
  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue === "ACCEPTABLE") {
    return ListingCondition.FAIR;
  }

  if (normalizedValue in ListingCondition) {
    return ListingCondition[normalizedValue as keyof typeof ListingCondition];
  }

  return ListingCondition.GOOD;
}

function parseListingStatusFilter(value?: string): ListingStatus | undefined {
  const normalizedValue = value?.trim().toUpperCase();

  if (!normalizedValue || normalizedValue === "ALL") {
    return undefined;
  }

  if (normalizedValue === "PENDING") {
    return ListingStatus.PENDING_REVIEW;
  }

  if (normalizedValue in ListingStatus) {
    return ListingStatus[normalizedValue as keyof typeof ListingStatus];
  }

  return undefined;
}

function parseOrderStatusFilter(value?: string): OrderStatus | undefined {
  const normalizedValue = value?.trim().toUpperCase();

  if (!normalizedValue || normalizedValue === "ALL") {
    return undefined;
  }

  if (normalizedValue in OrderStatus) {
    return OrderStatus[normalizedValue as keyof typeof OrderStatus];
  }

  return undefined;
}

function buildListingId(): string {
  return `LIST-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeImageUrl(value?: string): string | null {
  const cleanValue = cleanText(value ?? "", 500);

  if (!cleanValue) {
    return null;
  }

  if (cleanValue.startsWith("/") || cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
    return cleanValue;
  }

  return null;
}

function handleSellerError(error: unknown, fallbackMessage: string): SellerActionResult {
  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  console.error(`[seller] ${message}`);

  return {
    success: false,
    message: fallbackMessage,
    reason: "DATABASE_ERROR",
  };
}

async function getUserFromSession(): Promise<SellerGateData["user"]> {
  const user = await getCurrentUser();

  if (!user || user.isLocked) {
    return null;
  }

  return {
    id: user.id,
    name: user.name ?? "BookVerse User",
    email: user.email ?? null,
    role: user.role,
  };
}

export async function getSellerGateData(): Promise<SellerGateData> {
  const user = await getUserFromSession();

  if (!user) {
    return {
      status: "UNAUTHENTICATED",
      user: null,
    };
  }

  if (user.role !== UserRole.SELLER && user.role !== UserRole.ADMIN) {
    return {
      status: "NEEDS_SELLER",
      user,
    };
  }

  return {
    status: "SELLER",
    user,
  };
}

async function requireSellerFromDb(): Promise<NonNullable<SellerGateData["user"]>> {
  const gate = await getSellerGateData();

  if (!gate.user) {
    throw new Error("AUTH_REQUIRED");
  }

  if (gate.status !== "SELLER") {
    throw new Error("FORBIDDEN");
  }

  return gate.user;
}

function buildListingWhere(sellerId: string, filters: { q?: string; status?: string } = {}): Prisma.ListingWhereInput {
  const status = parseListingStatusFilter(filters.status);
  const query = cleanText(filters.q ?? "", 120);
  const where: Prisma.ListingWhereInput = {
    sellerId,
  };

  if (status) {
    where.status = status;
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

function serializeListing(listing: {
  id: string;
  title: string;
  description: string | null;
  condition: ListingCondition;
  price: DecimalLike | number | string;
  status: ListingStatus;
  rejectionReason: string | null;
  moderationNote: string | null;
  reportCount: number;
  views: number;
  cartAdds: number;
  purchases: number;
  targetAudience: string | null;
  createdAt: Date;
  updatedAt: Date;
  book: { id: string; title: string; authorName: string; coverPath: string | null } | null;
  images?: Array<{ url: string }>;
  _count?: { orderItems: number };
}): SellerListingItem {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    condition: listing.condition,
    price: decimalToNumber(listing.price),
    status: listing.status,
    rejectionReason: listing.rejectionReason,
    moderationNote: listing.moderationNote,
    reportCount: listing.reportCount,
    views: listing.views,
    cartAdds: listing.cartAdds,
    purchases: listing.purchases,
    targetAudience: listing.targetAudience,
    imageUrl: normalizeBookCoverUrl(listing.images?.[0]?.url ?? null),
    orderCount: listing._count?.orderItems ?? 0,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    book: listing.book
      ? {
          id: listing.book.id,
          title: listing.book.title,
          author: listing.book.authorName,
          coverImage: normalizeBookCoverUrl(listing.book.coverPath),
        }
      : null,
  };
}

async function getBookOptions(): Promise<SellerBookOption[]> {
  const books = await prisma.book.findMany({
    orderBy: {
      title: "asc",
    },
    take: 120,
    select: {
      id: true,
      title: true,
      authorName: true,
    },
  });

  return books.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.authorName,
  }));
}

function buildOrderWhere(sellerId: string, filters: { q?: string; status?: string } = {}): Prisma.OrderWhereInput {
  const status = parseOrderStatusFilter(filters.status);
  const query = cleanText(filters.q ?? "", 120);
  const where: Prisma.OrderWhereInput = {
    ...nonCartOrderWhere,
    items: {
      some: {
        listing: {
          is: {
            sellerId,
          },
        },
      },
    },
  };

  if (status) {
    where.status = status;
  }

  if (query) {
    where.OR = [
      {
        id: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        buyer: {
          is: {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      },
      {
        buyer: {
          is: {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      },
      {
        items: {
          some: {
            listing: {
              is: {
                sellerId,
                title: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            },
          },
        },
      },
      {
        items: {
          some: {
            book: {
              is: {
                title: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            },
          },
        },
      },
    ];
  }

  return where;
}

function serializeSellerOrder(order: {
  id: string;
  status: OrderStatus;
  paymentMethod: string | null;
  createdAt: Date;
  buyer: { name: string; email: string | null };
  items: Array<{
    id: string;
    listingId: string | null;
    quantity: number;
    totalPrice: DecimalLike | number | string;
    book: { title: string };
    listing: { title: string; sellerId: string } | null;
  }>;
}, sellerId: string): SellerOrderListItem {
  const sellerItems = filterSellerOwnedItems(order.items, sellerId);

  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    buyerName: order.buyer.name,
    buyerEmail: order.buyer.email,
    sellerRevenue: sellerItems.reduce((total, item) => total + decimalToNumber(item.totalPrice), 0),
    sellerItemCount: sellerItems.reduce((total, item) => total + item.quantity, 0),
    createdAt: order.createdAt,
    items: sellerItems.map((item) => ({
      id: item.id,
      listingId: item.listingId,
      listingTitle: item.listing?.title ?? null,
      bookTitle: item.book.title,
      quantity: item.quantity,
      totalPrice: decimalToNumber(item.totalPrice),
    })),
  };
}

async function loadSellerOrders(
  sellerId: string,
  filters: { q?: string; status?: string } = {},
  take = 40,
): Promise<SellerOrderListItem[]> {
  const orders = await prisma.order.findMany({
    where: buildOrderWhere(sellerId, filters),
    orderBy: {
      createdAt: "desc",
    },
    take,
    include: {
      buyer: {
        select: {
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          book: {
            select: {
              title: true,
            },
          },
          listing: {
            select: {
              title: true,
              sellerId: true,
            },
          },
        },
      },
    },
  });

  return orders.map((order) => serializeSellerOrder(order, sellerId));
}

async function getSellerQualityScore(sellerId: string): Promise<SellerQualityScoreResult> {
  const [listings, completedOrders, cancelledOrders] = await Promise.all([
    prisma.listing.findMany({
      where: {
        sellerId,
      },
      select: {
        status: true,
        reportCount: true,
        description: true,
      },
    }),
    prisma.order.count({
      where: {
        status: OrderStatus.COMPLETED,
        items: {
          some: {
            listing: {
              is: {
                sellerId,
              },
            },
          },
        },
      },
    }),
    prisma.order.count({
      where: {
        status: OrderStatus.CANCELLED,
        items: {
          some: {
            listing: {
              is: {
                sellerId,
              },
            },
          },
        },
      },
    }),
  ]);

  return calculateSellerQualityScore({
    completedOrders,
    cancelledOrders,
    reportedListings: listings.filter((listing) => listing.reportCount > 0).length,
    longDescriptionListings: listings.filter((listing) => (listing.description?.trim().length ?? 0) >= 80).length,
    approvedListings: listings.filter((listing) => listing.status === ListingStatus.APPROVED).length,
    totalListings: listings.length,
  });
}

export async function becomeSeller(): Promise<SellerActionResult> {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return {
        success: false,
        message: "Bạn cần đăng nhập để trở thành người bán.",
        reason: "AUTH_REQUIRED",
      };
    }

    if (user.role === UserRole.SELLER || user.role === UserRole.ADMIN) {
      return {
        success: true,
        message: "Tài khoản đã có quyền người bán.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          role: UserRole.SELLER,
        },
      });

      await createNotification(
        {
          userId: user.id,
          title: "Đã bật vai trò người bán",
          message: "Bạn có thể mở Seller Dashboard và đăng listing chờ duyệt.",
          type: NotificationType.MARKETPLACE,
          href: "/seller",
        },
        tx,
      );

      await recordAuditLog(
        {
          actorId: user.id,
          action: "USER_BECOME_SELLER",
          entityType: "USER",
          entityId: user.id,
        },
        tx,
      );
    });

    revalidatePath("/seller");
    revalidatePath("/seller/apply");
    revalidatePath("/profile");

    return {
      success: true,
      message: "Đã bật vai trò người bán. Bạn có thể dùng Seller Dashboard ngay.",
    };
  } catch (error: unknown) {
    return handleSellerError(error, "Không thể bật vai trò người bán.");
  }
}

export async function getSellerOverviewData(): Promise<SellerOverviewData> {
  const gate = await getSellerGateData();

  if (gate.status !== "SELLER" || !gate.user) {
    return {
      gate,
      metrics: [],
      listingCounts: {},
      orderCounts: {},
      recentListings: [],
      recentOrders: [],
      notifications: [],
      score: calculateSellerQualityScore({
        completedOrders: 0,
        cancelledOrders: 0,
        reportedListings: 0,
        longDescriptionListings: 0,
        approvedListings: 0,
        totalListings: 0,
      }),
    };
  }

  const sellerId = gate.user.id;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [
    totalListings,
    pendingListings,
    approvedListings,
    rejectedListings,
    hiddenListings,
    sellerOrders,
    completedItems,
    monthCompletedItems,
    recentListingsRows,
    notifications,
    score,
  ] = await Promise.all([
    prisma.listing.count({ where: { sellerId } }),
    prisma.listing.count({ where: { sellerId, status: ListingStatus.PENDING_REVIEW } }),
    prisma.listing.count({ where: { sellerId, status: ListingStatus.APPROVED } }),
    prisma.listing.count({ where: { sellerId, status: ListingStatus.REJECTED } }),
    prisma.listing.count({ where: { sellerId, status: ListingStatus.HIDDEN } }),
    loadSellerOrders(sellerId, {}, 80),
    prisma.orderItem.findMany({
      where: {
        listing: {
          is: {
            sellerId,
          },
        },
        order: {
          status: OrderStatus.COMPLETED,
        },
      },
      select: {
        totalPrice: true,
      },
    }),
    prisma.orderItem.findMany({
      where: {
        listing: {
          is: {
            sellerId,
          },
        },
        order: {
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: monthStart,
          },
        },
      },
      select: {
        totalPrice: true,
      },
    }),
    prisma.listing.findMany({
      where: {
        sellerId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authorName: true,
            coverPath: true,
          },
        },
        images: {
          take: 1,
          select: {
            url: true,
          },
        },
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    }),
    prisma.notification.findMany({
      where: {
        userId: sellerId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    }),
    getSellerQualityScore(sellerId),
  ]);

  const orderCounts = sellerOrders.reduce<Record<string, number>>((result, order) => {
    result[order.status] = (result[order.status] ?? 0) + 1;
    return result;
  }, {});
  const totalCompletedRevenue = completedItems.reduce((total, item) => total + decimalToNumber(item.totalPrice), 0);
  const monthRevenue = monthCompletedItems.reduce((total, item) => total + decimalToNumber(item.totalPrice), 0);

  return {
    gate,
    listingCounts: {
      total: totalListings,
      pending: pendingListings,
      approved: approvedListings,
      rejected: rejectedListings,
      hidden: hiddenListings,
    },
    orderCounts,
    metrics: [
      { label: "Tổng listing", value: totalListings },
      { label: "Listing chờ duyệt", value: pendingListings, tone: "warning" },
      { label: "Listing đã duyệt", value: approvedListings, tone: "success" },
      { label: "Listing bị từ chối", value: rejectedListings, tone: "warning" },
      { label: "Listing bị ẩn", value: hiddenListings, tone: "warning" },
      { label: "Tổng đơn liên quan", value: sellerOrders.length },
      { label: "Doanh thu completed", value: totalCompletedRevenue, tone: "money" },
      { label: "Doanh thu tháng này", value: monthRevenue, tone: "money" },
      { label: "Điểm chất lượng (quy tắc)", value: score.score, tone: score.score >= 80 ? "success" : "warning" },
    ],
    recentListings: recentListingsRows.map(serializeListing),
    recentOrders: sellerOrders.slice(0, 5),
    notifications,
    score,
  };
}

export async function getSellerListingsData(filters: { q?: string; status?: string } = {}): Promise<SellerListingsData> {
  const gate = await getSellerGateData();

  if (gate.status !== "SELLER" || !gate.user) {
    return {
      gate,
      listings: [],
      bookOptions: [],
      filters: {
        q: filters.q ?? "",
        status: filters.status ?? "ALL",
      },
    };
  }

  const [listings, bookOptions] = await Promise.all([
    prisma.listing.findMany({
      where: buildListingWhere(gate.user.id, filters),
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
        images: {
          take: 1,
          select: {
            url: true,
          },
        },
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    }),
    getBookOptions(),
  ]);

  return {
    gate,
    listings: listings.map(serializeListing),
    bookOptions,
    filters: {
      q: filters.q ?? "",
      status: filters.status ?? "ALL",
    },
  };
}

export async function getSellerListingEditorData(listingId?: string): Promise<SellerListingEditorData> {
  const gate = await getSellerGateData();
  const bookOptions = gate.status === "SELLER" ? await getBookOptions() : [];

  if (gate.status !== "SELLER" || !gate.user || !listingId) {
    return {
      gate,
      listing: null,
      bookOptions,
    };
  }

  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId.trim(),
      sellerId: gate.user.id,
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
      images: {
        take: 1,
        select: {
          url: true,
        },
      },
      _count: {
        select: {
          orderItems: true,
        },
      },
    },
  });

  return {
    gate,
    listing: listing ? serializeListing(listing) : null,
    bookOptions,
  };
}

export async function createSellerListing(input: SellerListingInput): Promise<SellerActionResult> {
  try {
    const seller = await requireSellerFromDb();
    const title = cleanText(input.title, 180);
    const description = cleanText(input.description, 2_000);
    const targetAudience = cleanText(input.targetAudience ?? "", 160) || null;
    const imageUrl = normalizeImageUrl(input.imageUrl);
    const price = parsePrice(input.price);
    const condition = parseCondition(input.condition);
    const bookId = cleanText(input.bookId ?? "", 120) || null;

    if (!title || !description || price <= 0) {
      return {
        success: false,
        message: "Vui lòng nhập đầy đủ tiêu đề, mô tả và giá bán hợp lệ.",
        reason: "VALIDATION_ERROR",
      };
    }

    if ((input.imageUrl ?? "").trim() && !imageUrl) {
      return {
        success: false,
        message: "URL ảnh phải bắt đầu bằng http://, https:// hoặc /.",
        reason: "VALIDATION_ERROR",
      };
    }

    await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          id: buildListingId(),
          sellerId: seller.id,
          bookId,
          title,
          description,
          price,
          condition,
          status: ListingStatus.PENDING_REVIEW,
          targetAudience,
          hasCover: Boolean(bookId || imageUrl),
          images: imageUrl
            ? {
                create: {
                  url: imageUrl,
                  altText: title,
                  sortOrder: 0,
                },
              }
            : undefined,
        },
        select: {
          id: true,
          title: true,
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
        [
          {
            userId: seller.id,
            title: "Listing đã gửi duyệt",
            message: `Tin bán "${listing.title}" đang chờ admin duyệt.`,
            type: NotificationType.MARKETPLACE,
            href: `/seller/listings/${listing.id}/edit`,
          },
          ...moderators.map((moderator) => ({
            userId: moderator.id,
            title: "Listing mới chờ duyệt",
            message: `Seller ${seller.name} vừa gửi tin bán "${listing.title}".`,
            type: NotificationType.MARKETPLACE,
            href: "/admin#marketplace",
          })),
        ],
        tx,
      );

      await recordAuditLog(
        {
          actorId: seller.id,
          action: "SELLER_LISTING_CREATE",
          entityType: "LISTING",
          entityId: listing.id,
          metadata: {
            status: ListingStatus.PENDING_REVIEW,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });

    revalidatePath("/seller");
    revalidatePath("/seller/listings");
    revalidatePath("/marketplace");

    return {
      success: true,
      message: "Đã tạo listing và gửi admin duyệt.",
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return {
        success: false,
        message: "Bạn cần đăng nhập để tạo listing.",
        reason: "AUTH_REQUIRED",
      };
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return {
        success: false,
        message: "Bạn cần trở thành người bán trước khi tạo listing.",
        reason: "FORBIDDEN",
      };
    }

    return handleSellerError(error, "Không thể tạo listing.");
  }
}

export async function updateSellerListing(listingId: string, input: SellerListingInput): Promise<SellerActionResult> {
  try {
    const seller = await requireSellerFromDb();
    const cleanListingId = listingId.trim();
    const title = cleanText(input.title, 180);
    const description = cleanText(input.description, 2_000);
    const targetAudience = cleanText(input.targetAudience ?? "", 160) || null;
    const imageUrl = normalizeImageUrl(input.imageUrl);
    const price = parsePrice(input.price);
    const condition = parseCondition(input.condition);
    const bookId = cleanText(input.bookId ?? "", 120) || null;

    if (!cleanListingId || !title || !description || price <= 0) {
      return {
        success: false,
        message: "Vui lòng nhập đầy đủ tiêu đề, mô tả và giá bán hợp lệ.",
        reason: "VALIDATION_ERROR",
      };
    }

    if ((input.imageUrl ?? "").trim() && !imageUrl) {
      return {
        success: false,
        message: "URL ảnh phải bắt đầu bằng http://, https:// hoặc /.",
        reason: "VALIDATION_ERROR",
      };
    }

    const listing = await prisma.listing.findFirst({
      where: {
        id: cleanListingId,
        sellerId: seller.id,
      },
      select: {
        id: true,
        status: true,
        title: true,
      },
    });

    if (!listing) {
      return {
        success: false,
        message: "Không tìm thấy listing thuộc tài khoản người bán.",
        reason: "NOT_FOUND",
      };
    }

    const nextStatus =
      listing.status === ListingStatus.APPROVED || listing.status === ListingStatus.REJECTED
        ? ListingStatus.PENDING_REVIEW
        : listing.status;

    await prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: {
          id: listing.id,
        },
        data: {
          bookId,
          title,
          description,
          price,
          condition,
          targetAudience,
          status: nextStatus,
          rejectionReason: nextStatus === ListingStatus.PENDING_REVIEW ? null : undefined,
          moderationNote: nextStatus === ListingStatus.PENDING_REVIEW ? null : undefined,
          reviewedAt: nextStatus === ListingStatus.PENDING_REVIEW ? null : undefined,
          hiddenAt: nextStatus === ListingStatus.HIDDEN ? new Date() : undefined,
          hasCover: Boolean(bookId || imageUrl),
        },
      });

      if (imageUrl) {
        const existingImage = await tx.listingImage.findFirst({
          where: {
            listingId: listing.id,
          },
          select: {
            id: true,
          },
        });

        if (existingImage) {
          await tx.listingImage.update({
            where: {
              id: existingImage.id,
            },
            data: {
              url: imageUrl,
              altText: title,
            },
          });
        } else {
          await tx.listingImage.create({
            data: {
              listingId: listing.id,
              url: imageUrl,
              altText: title,
              sortOrder: 0,
            },
          });
        }
      }

      const moderators =
        nextStatus === ListingStatus.PENDING_REVIEW
          ? await tx.user.findMany({
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
            })
          : [];

      await createNotifications(
        [
          {
            userId: seller.id,
            title: "Listing đã cập nhật",
            message:
              nextStatus === ListingStatus.PENDING_REVIEW
                ? `Tin bán "${title}" đã chuyển về chờ duyệt.`
                : `Tin bán "${title}" đã được lưu.`,
            type: NotificationType.MARKETPLACE,
            href: `/seller/listings/${listing.id}/edit`,
          },
          ...moderators.map((moderator) => ({
            userId: moderator.id,
            title: "Listing cần duyệt lại",
            message: `Seller ${seller.name} vừa chỉnh sửa tin "${title}".`,
            type: NotificationType.MARKETPLACE,
            href: "/admin#marketplace",
          })),
        ],
        tx,
      );

      await recordAuditLog(
        {
          actorId: seller.id,
          action: "SELLER_LISTING_UPDATE",
          entityType: "LISTING",
          entityId: listing.id,
          metadata: {
            previousStatus: listing.status,
            nextStatus,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });

    revalidatePath("/seller");
    revalidatePath("/seller/listings");
    revalidatePath(`/seller/listings/${listing.id}/edit`);
    revalidatePath("/marketplace");

    return {
      success: true,
      message:
        nextStatus === ListingStatus.PENDING_REVIEW
          ? "Đã lưu listing và chuyển về trạng thái chờ duyệt."
          : "Đã lưu listing.",
    };
  } catch (error: unknown) {
    return handleSellerError(error, "Không thể cập nhật listing.");
  }
}

export async function setSellerListingVisibility(
  listingId: string,
  nextVisibility: "HIDE" | "SHOW",
): Promise<SellerActionResult> {
  try {
    const seller = await requireSellerFromDb();
    const cleanListingId = listingId.trim();
    const listing = await prisma.listing.findFirst({
      where: {
        id: cleanListingId,
        sellerId: seller.id,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    if (!listing) {
      return {
        success: false,
        message: "Không tìm thấy listing thuộc tài khoản người bán.",
        reason: "NOT_FOUND",
      };
    }

    const nextStatus = nextVisibility === "HIDE" ? ListingStatus.HIDDEN : ListingStatus.PENDING_REVIEW;

    await prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: {
          id: listing.id,
        },
        data: {
          status: nextStatus,
          hiddenAt: nextStatus === ListingStatus.HIDDEN ? new Date() : null,
          rejectionReason: nextStatus === ListingStatus.PENDING_REVIEW ? null : undefined,
          moderationNote: nextStatus === ListingStatus.PENDING_REVIEW ? null : undefined,
        },
      });

      await createNotification(
        {
          userId: seller.id,
          title: nextStatus === ListingStatus.HIDDEN ? "Listing đã được ẩn" : "Listing đã gửi duyệt lại",
          message:
            nextStatus === ListingStatus.HIDDEN
              ? `Tin bán "${listing.title}" đã được ẩn khỏi marketplace.`
              : `Tin bán "${listing.title}" đang chờ admin duyệt lại.`,
          type: NotificationType.MARKETPLACE,
          href: `/seller/listings/${listing.id}/edit`,
        },
        tx,
      );

      await recordAuditLog(
        {
          actorId: seller.id,
          action: nextStatus === ListingStatus.HIDDEN ? "SELLER_LISTING_HIDE" : "SELLER_LISTING_SHOW_REQUEST",
          entityType: "LISTING",
          entityId: listing.id,
          metadata: {
            previousStatus: listing.status,
            nextStatus,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });

    revalidatePath("/seller/listings");
    revalidatePath(`/seller/listings/${listing.id}/edit`);
    revalidatePath("/marketplace");

    return {
      success: true,
      message: nextStatus === ListingStatus.HIDDEN ? "Đã ẩn listing." : "Đã gửi listing duyệt lại.",
    };
  } catch (error: unknown) {
    return handleSellerError(error, "Không thể cập nhật hiển thị listing.");
  }
}

export async function getSellerOrdersData(filters: { q?: string; status?: string } = {}): Promise<SellerOrdersData> {
  const gate = await getSellerGateData();

  if (gate.status !== "SELLER" || !gate.user) {
    return {
      gate,
      orders: [],
      filters: {
        q: filters.q ?? "",
        status: filters.status ?? "ALL",
      },
    };
  }

  return {
    gate,
    orders: await loadSellerOrders(gate.user.id, filters, 80),
    filters: {
      q: filters.q ?? "",
      status: filters.status ?? "ALL",
    },
  };
}

export async function getSellerOrderDetailData(orderId: string): Promise<SellerOrderDetailData> {
  const gate = await getSellerGateData();

  if (gate.status !== "SELLER" || !gate.user) {
    return {
      gate,
      order: null,
    };
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId.trim(),
      ...nonCartOrderWhere,
      items: {
        some: {
          listing: {
            is: {
              sellerId: gate.user.id,
            },
          },
        },
      },
    },
    include: {
      buyer: {
        select: {
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          book: {
            select: {
              title: true,
            },
          },
          listing: {
            select: {
              title: true,
              sellerId: true,
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

  if (!order) {
    return {
      gate,
      order: null,
    };
  }

  const sellerIds = new Set(order.items.map((item) => item.listing?.sellerId).filter(Boolean) as string[]);

  return {
    gate,
    order: {
      ...serializeSellerOrder(order, gate.user.id),
      shipping: {
        fullName: order.shippingFullName,
        phone: order.shippingPhone,
        province: order.shippingProvince,
        district: order.shippingDistrict,
        ward: order.shippingWard,
        addressLine: order.shippingAddressLine,
        note: order.shippingNote,
      },
      timeline: order.timelineEvents.map((event) => ({
        id: event.id,
        status: event.status,
        note: event.note,
        actorName: event.actor?.name ?? null,
        createdAt: event.createdAt,
      })),
      allowedNextStatuses: sellerIds.size > 1 ? [] : getAllowedOrderNextStatuses(order.status, "SELLER"),
    },
  };
}

export async function updateSellerOrderStatus(
  orderId: string,
  nextStatusValue: string,
  note: string,
): Promise<SellerActionResult> {
  try {
    const seller = await requireSellerFromDb();
    const cleanOrderId = orderId.trim();
    const nextStatus = parseOrderStatusFilter(nextStatusValue);

    if (!nextStatus) {
      return {
        success: false,
        message: "Trạng thái đơn hàng không hợp lệ.",
        reason: "VALIDATION_ERROR",
      };
    }

    const order = await prisma.order.findFirst({
      where: {
        id: cleanOrderId,
        ...nonCartOrderWhere,
        items: {
          some: {
            listing: {
              is: {
                sellerId: seller.id,
              },
            },
          },
        },
      },
      include: {
        buyer: {
          select: {
            id: true,
          },
        },
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
        message: "Không tìm thấy đơn hàng thuộc listing của bạn.",
        reason: "NOT_FOUND",
      };
    }

    const sellerIds = new Set(order.items.map((item) => item.listing?.sellerId).filter(Boolean) as string[]);
    if (sellerIds.size > 1) {
      return {
        success: false,
        message: "Đơn này có nhiều seller. Demo Phase 4 yêu cầu admin xử lý để tránh ảnh hưởng seller khác.",
        reason: "VALIDATION_ERROR",
      };
    }

    const transition = checkOrderTransition(order.status, nextStatus, "SELLER");
    if (!transition.allowed) {
      return {
        success: false,
        message: transition.message,
        reason: "VALIDATION_ERROR",
      };
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: order.status, paymentMethod: { not: null } },
        data: {
          status: nextStatus,
        },
      });
      if (claimed.count !== 1) {
        throw new Error("ORDER_STATUS_CONFLICT");
      }

      await grantEbookEntitlementsForOrder(tx, order.id);

      await tx.orderTimelineEvent.create({
        data: {
          orderId: order.id,
          actorId: seller.id,
          status: nextStatus,
          note: cleanText(note, 240) || `Seller cập nhật đơn sang ${nextStatus}.`,
          metadata: {
            source: "seller_dashboard",
          },
        },
      });

      await createNotifications(
        [
          {
            userId: order.buyer.id,
            title: "Đơn hàng đã cập nhật",
            message: `Seller đã chuyển đơn ${order.id} sang ${nextStatus}.`,
            type: NotificationType.ORDER,
            href: `/orders/${order.id}`,
          },
          {
            userId: seller.id,
            title: "Bạn đã cập nhật đơn hàng",
            message: `Đơn ${order.id} đã chuyển sang ${nextStatus}.`,
            type: NotificationType.ORDER,
            href: `/seller/orders/${order.id}`,
          },
        ],
        tx,
      );

      await recordAuditLog(
        {
          actorId: seller.id,
          action: "SELLER_ORDER_STATUS_UPDATE",
          entityType: "ORDER",
          entityId: order.id,
          metadata: {
            previousStatus: order.status,
            nextStatus,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });

    revalidatePath("/seller");
    revalidatePath("/seller/orders");
    revalidatePath(`/seller/orders/${order.id}`);
    revalidatePath(`/orders/${order.id}`);
    revalidatePath("/notifications");

    return {
      success: true,
      message: "Đã cập nhật trạng thái đơn hàng.",
    };
  } catch (error: unknown) {
    return handleSellerError(error, "Không thể cập nhật trạng thái đơn hàng.");
  }
}

export async function getSellerRevenueData(): Promise<SellerRevenueData> {
  const gate = await getSellerGateData();

  if (gate.status !== "SELLER" || !gate.user) {
    return {
      gate,
      totalCompletedRevenue: 0,
      monthRevenue: 0,
      sevenDayRevenue: 0,
      completedOrderCount: 0,
      cancelledOrderCount: 0,
      topListings: [],
      recentTransactions: [],
    };
  }

  const sellerId = gate.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
  const completedItems = await prisma.orderItem.findMany({
    where: {
      listing: {
        is: {
          sellerId,
        },
      },
      order: {
        status: OrderStatus.COMPLETED,
      },
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
        },
      },
      order: {
        select: {
          id: true,
          createdAt: true,
        },
      },
    },
  });
  const completedOrderIds = new Set(completedItems.map((item) => item.order.id));
  const monthRevenue = completedItems
    .filter((item) => item.order.createdAt >= monthStart)
    .reduce((total, item) => total + decimalToNumber(item.totalPrice), 0);
  const sevenDayRevenue = completedItems
    .filter((item) => item.order.createdAt >= sevenDaysAgo)
    .reduce((total, item) => total + decimalToNumber(item.totalPrice), 0);
  const totalCompletedRevenue = completedItems.reduce((total, item) => total + decimalToNumber(item.totalPrice), 0);
  const topListingMap = new Map<string, { listingId: string; title: string; quantity: number; revenue: number }>();

  for (const item of completedItems) {
    const listingId = item.listing?.id ?? "BOOKVERSE";
    const current = topListingMap.get(listingId) ?? {
      listingId,
      title: item.listing?.title ?? "BookVerse",
      quantity: 0,
      revenue: 0,
    };
    current.quantity += item.quantity;
    current.revenue += decimalToNumber(item.totalPrice);
    topListingMap.set(listingId, current);
  }

  const [cancelledOrderCount, recentTransactions] = await Promise.all([
    prisma.order.count({
      where: {
        status: OrderStatus.CANCELLED,
        items: {
          some: {
            listing: {
              is: {
                sellerId,
              },
            },
          },
        },
      },
    }),
    loadSellerOrders(sellerId, {}, 10),
  ]);

  return {
    gate,
    totalCompletedRevenue,
    monthRevenue,
    sevenDayRevenue,
    completedOrderCount: completedOrderIds.size,
    cancelledOrderCount,
    topListings: Array.from(topListingMap.values())
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 8),
    recentTransactions,
  };
}

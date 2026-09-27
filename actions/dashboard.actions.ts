"use server";

import {
  BookStatus,
  CoverReviewStatus,
  EditionType,
  FeedbackValue,
  ListingCondition,
  ListingStatus,
  NotificationType,
  OrderStatus,
  PostStatus,
  Prisma,
  ReactionType,
  TargetType,
  UserRole,
} from "@prisma/client";
import { grantEbookEntitlementsForOrder } from "@/lib/ebook-entitlement";
import prisma from "@/lib/prisma";
import { refreshRecommendationsForUser } from "@/actions/recommendation.actions";
import { recordAuditLog } from "@/lib/audit";
import { generateBookEmbedding } from "@/lib/book-embeddings";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import { createNotification, createNotifications } from "@/lib/notifications";
import {
  cancelOrderWithRestock,
  OrderCancellationError,
} from "@/lib/order-cancellation-service";
import { checkOrderTransition, getAllowedOrderNextStatuses } from "@/lib/order-workflow";
import { CATALOG_STORE_USER_ID } from "@/lib/catalog-listing-sync";
import {
  PermissionError,
  requireAdminUser,
  requireModeratorUser,
} from "@/lib/permissions";
import { loadSellerQualityScores } from "@/lib/seller-quality-data";

type DecimalLike = {
  toNumber: () => number;
};

export interface DashboardMetric {
  label: string;
  value: number;
}

export interface AdminActionResult {
  success: boolean;
  message: string;
}

export interface AdminCenterFilters {
  q?: string;
  role?: string;
  userStatus?: string;
  bookStatus?: string;
  listingStatus?: string;
  orderStatus?: string;
  buyerId?: string;
  page?: number;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  isLocked: boolean;
  lockReason: string | null;
  createdAt: Date;
  lastActiveAt: Date | null;
  persona: string | null;
  preferredGenres: string[];
  counts: {
    listings: number;
    orders: number;
    posts: number;
    recommendations: number;
  };
  recentActivity: Array<{
    actionType: string;
    bookTitle: string;
    createdAt: Date;
  }>;
}

export interface AdminBookItem {
  id: string;
  title: string;
  author: string;
  categoryId: string;
  category: string;
  price: number;
  pages: number | null;
  publishYear: number | null;
  description: string | null;
  status: BookStatus;
  coverPath: string | null;
  isEbook: boolean;
  isPubliclyVisible: boolean;
  languageCode: string | null;
  hasCover: boolean;
  hasDescription: boolean;
  hasEmbedding: boolean;
  createdAt: Date;
  stock: number;
  listingsCount: number;
  ordersCount: number;
}

export interface AdminCategoryOption {
  id: string;
  name: string;
}

export interface AdminListingItem {
  id: string;
  title: string;
  status: ListingStatus;
  condition: string;
  price: number;
  reportCount: number;
  rejectionReason: string | null;
  seller: {
    id: string;
    name: string;
    email: string | null;
    listingCount: number;
    sellerQualityScore: number;
    highQuality: boolean;
    formulaVersion: string;
  };
  createdAt: Date;
}

export interface AdminOrderProductItem {
  id: string;
  bookId: string;
  title: string;
  authorName: string;
  coverPath: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sellerName: string;
}

export interface AdminOrderItem {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: string | null;
  checkoutKey?: string | null;
  buyer: {
    id: string;
    name: string;
    email: string | null;
  };
  shippingInfo?: {
    fullName: string | null;
    phone: string | null;
    address: string | null;
    note: string | null;
  };
  items: AdminOrderProductItem[];
  allowedNextStatuses: OrderStatus[];
  sellers: string[];
  itemCount: number;
  createdAt: Date;
}

export interface AdminReportedPostItem {
  id: string;
  title: string;
  status: PostStatus;
  authorName: string;
  reportCount: number;
  moderationReason: string | null;
  createdAt: Date;
}

export interface AdminReportedCommentItem {
  id: string;
  postTitle: string;
  authorName: string;
  content: string;
  status: PostStatus;
  reportCount: number;
  createdAt: Date;
}

export interface AdminAiData {
  totalRecommendations: number;
  totalDailyRecommendations: number;
  totalEvidence: number;
  totalRecommendationFeedback: number;
  totalChatbotSessions: number;
  totalChatbotMessages: number;
  totalChatbotFeedback: number;
  lowRatedChatbotFeedback: Array<{
    id: string;
    value: FeedbackValue;
    note: string | null;
    message: string | null;
    userName: string | null;
    createdAt: Date;
  }>;
}

export interface AdminAuditItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string | null;
  createdAt: Date;
}

export interface AdminBuyerOption {
  id: string;
  name: string;
  email: string | null;
  orderCount: number;
}

export interface AdminCenterData {
  metrics: DashboardMetric[];
  users: AdminUserItem[];
  books: AdminBookItem[];
  categories: AdminCategoryOption[];
  listings: AdminListingItem[];
  orders: AdminOrderItem[];
  buyers: AdminBuyerOption[];
  reportedPosts: AdminReportedPostItem[];
  reportedComments: AdminReportedCommentItem[];
  ai: AdminAiData;
  auditLogs: AdminAuditItem[];
  pagination: {
    page: number;
    pageSize: number;
    usersTotal: number;
    booksTotal: number;
    listingsTotal: number;
    ordersTotal: number;
  };
}

const pageSize = 5;

const emptyAdminCenterData: AdminCenterData = {
  metrics: [],
  users: [],
  books: [],
  categories: [],
  listings: [],
  orders: [],
  buyers: [],
  reportedPosts: [],
  reportedComments: [],
  ai: {
    totalRecommendations: 0,
    totalDailyRecommendations: 0,
    totalEvidence: 0,
    totalRecommendationFeedback: 0,
    totalChatbotSessions: 0,
    totalChatbotMessages: 0,
    totalChatbotFeedback: 0,
    lowRatedChatbotFeedback: [],
  },
  auditLogs: [],
  pagination: {
    page: 1,
    pageSize,
    usersTotal: 0,
    booksTotal: 0,
    listingsTotal: 0,
    ordersTotal: 0,
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

function toSafePage(value?: number): number {
  if (!value || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function parseRole(value?: string): UserRole | undefined {
  const cleanValue = value?.trim().toUpperCase();

  if (!cleanValue || cleanValue === "ALL") {
    return undefined;
  }

  if (cleanValue in UserRole) {
    return UserRole[cleanValue as keyof typeof UserRole];
  }

  return undefined;
}

function parseEnumValue<T extends Record<string, string>>(enumObject: T, value?: string): T[keyof T] | undefined {
  const cleanValue = value?.trim().toUpperCase();

  if (!cleanValue || cleanValue === "ALL") {
    return undefined;
  }

  if (cleanValue in enumObject) {
    return enumObject[cleanValue as keyof T];
  }

  return undefined;
}

function normalizeReason(value: string, fallback: string): string {
  const reason = value.trim();

  return reason || fallback;
}

function handleAdminError(error: unknown, fallbackMessage: string): AdminActionResult {
  if (error instanceof PermissionError) {
    return {
      success: false,
      message: error.message,
    };
  }

  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  console.error(`[admin] ${message}`);

  return {
    success: false,
    message: fallbackMessage,
  };
}

function buildUserWhere(filters: AdminCenterFilters): Prisma.UserWhereInput {
  const query = filters.q?.trim();
  const role = parseRole(filters.role);
  const where: Prisma.UserWhereInput = {};

  if (role) {
    where.role = role;
  }

  if (filters.userStatus === "locked") {
    where.isLocked = true;
  }

  if (filters.userStatus === "active") {
    where.isLocked = false;
  }

  if (query) {
    where.OR = [
      {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: query,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
}

function buildBookWhere(filters: AdminCenterFilters): Prisma.BookWhereInput {
  const query = filters.q?.trim();
  const status = parseEnumValue(BookStatus, filters.bookStatus);
  const where: Prisma.BookWhereInput = {};

  if (status) {
    where.status = status;
  } else {
    where.status = { not: BookStatus.ARCHIVED };
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
        authorName: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        category: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  return where;
}

function buildListingWhere(filters: AdminCenterFilters): Prisma.ListingWhereInput {
  const query = filters.q?.trim();
  const status = parseEnumValue(ListingStatus, filters.listingStatus);
  const conditions: Prisma.ListingWhereInput[] = [];

  if (status) {
    conditions.push({ status });
  } else if (!filters.listingStatus || filters.listingStatus === "EXCEPTIONS") {
    // Mặc định chỉ đưa ra hàng đợi ngoại lệ. Tin đầy đủ đã được tự duyệt
    // và không cần admin can thiệp vào giao dịch C2C.
    conditions.push({
      OR: [
        {
          status: ListingStatus.PENDING_REVIEW,
          moderationNote: { not: null },
        },
        { reportCount: { gt: 0 } },
      ],
    });
  }

  if (query) {
    conditions.push({
      OR: [
        {
          title: {
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
          seller: {
            is: {
              email: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

function buildOrderWhere(filters: AdminCenterFilters): Prisma.OrderWhereInput {
  const query = filters.q?.trim();
  const status = parseEnumValue(OrderStatus, filters.orderStatus);
  const where: Prisma.OrderWhereInput = {
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

  if (status) {
    where.status = status;
  }

  const buyerId = filters.buyerId?.trim();
  if (buyerId && buyerId !== "ALL") {
    where.buyerId = buyerId;
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
                seller: {
                  is: {
                    name: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
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

async function getReportedComments(): Promise<AdminReportedCommentItem[]> {
  const commentReports = await prisma.reaction.groupBy({
    by: ["targetId"],
    where: {
      targetType: TargetType.COMMENT,
      type: ReactionType.REPORT,
    },
    _count: {
      targetId: true,
    },
    orderBy: {
      _count: {
        targetId: "desc",
      },
    },
    take: 8,
  });

  const commentIds = commentReports.map((item) => item.targetId);
  if (commentIds.length === 0) {
    return [];
  }

  const comments = await prisma.comment.findMany({
    where: {
      id: {
        in: commentIds,
      },
    },
    include: {
      author: {
        select: {
          name: true,
        },
      },
      post: {
        select: {
          title: true,
        },
      },
    },
  });
  const reportCountByCommentId = new Map(commentReports.map((item) => [item.targetId, item._count.targetId]));

  return comments.map((comment) => ({
    id: comment.id,
    postTitle: comment.post.title,
    authorName: comment.author.name,
    content: comment.content,
    status: comment.status,
    reportCount: reportCountByCommentId.get(comment.id) ?? 0,
    createdAt: comment.createdAt,
  }));
}

export async function getAdminCenterData(filters: AdminCenterFilters = {}): Promise<AdminCenterData> {
  try {
    await requireModeratorUser();

    const page = toSafePage(filters.page);
    const skip = (page - 1) * pageSize;
    const userWhere = buildUserWhere(filters);
    const bookWhere = buildBookWhere(filters);
    const listingWhere = buildListingWhere(filters);
    const orderWhere = buildOrderWhere(filters);

    const [
      totalUsers,
      totalLockedUsers,
      totalBooks,
      totalHiddenBooks,
      totalListings,
      pendingListingsCount,
      totalOrders,
      totalReports,
      totalRecommendations,
      totalDailyRecommendations,
      totalEvidence,
      totalRecommendationFeedback,
      totalChatbotSessions,
      totalChatbotMessages,
      totalChatbotFeedback,
      usersTotal,
      booksTotal,
      listingsTotal,
      ordersTotal,
      users,
      books,
      listings,
      orders,
      reportedPosts,
      reportedComments,
      lowRatedChatbotFeedback,
      auditLogs,
      allCategories,
      allUsersForBuyers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isLocked: true } }),
      prisma.book.count({ where: { status: { not: BookStatus.ARCHIVED } } }),
      prisma.book.count({ where: { status: BookStatus.HIDDEN } }),
      prisma.listing.count({ where: { status: { not: ListingStatus.ARCHIVED } } }),
      prisma.listing.count({
        where: {
          OR: [
            {
              status: ListingStatus.PENDING_REVIEW,
              moderationNote: { not: null },
            },
            { reportCount: { gt: 0 } },
          ],
        },
      }),
      prisma.order.count({
        where: {
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
        },
      }),
      prisma.reaction.count({ where: { type: ReactionType.REPORT } }),
      prisma.recommendation.count(),
      prisma.dailyRecommendation.count(),
      prisma.recommendationEvidence.count(),
      prisma.recommendationFeedback.count(),
      prisma.chatbotSession.count(),
      prisma.chatbotMessage.count(),
      prisma.chatbotFeedback.count(),
      prisma.user.count({ where: userWhere }),
      prisma.book.count({ where: bookWhere }),
      prisma.listing.count({ where: listingWhere }),
      prisma.order.count({ where: orderWhere }),
      prisma.user.findMany({
        where: userWhere,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSize,
        include: {
          profile: {
            select: {
              persona: true,
              preferredGenres: true,
            },
          },
          _count: {
            select: {
              listings: true,
              orders: true,
              posts: true,
              recommendations: true,
            },
          },
          interactionEvents: {
            orderBy: {
              createdAt: "desc",
            },
            take: 3,
            include: {
              book: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      }),
      prisma.book.findMany({
        where: bookWhere,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSize,
        include: {
          category: {
            select: {
              name: true,
            },
          },
          embedding: {
            select: {
              id: true,
            },
          },
          editions: {
            select: {
              editionType: true,
              stock: true,
            },
          },
          listings: {
            where: {
              status: { in: [ListingStatus.APPROVED, ListingStatus.SOLD] },
            },
            select: {
              id: true,
              sellerId: true,
              stock: true,
              status: true,
            },
          },
          _count: {
            select: {
              listings: true,
              orderItems: true,
            },
          },
        },
      }),
      prisma.listing.findMany({
        where: listingWhere,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSize,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              _count: {
                select: {
                  listings: true,
                },
              },
            },
          },
        },
      }),
      prisma.order.findMany({
        where: orderWhere,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSize,
        include: {
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              book: {
                select: {
                  id: true,
                  title: true,
                  coverPath: true,
                  authorName: true,
                },
              },
              listing: {
                include: {
                  seller: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.post.findMany({
        where: {
          reportCount: {
            gt: 0,
          },
          status: {
            not: PostStatus.REMOVED,
          },
        },
        orderBy: {
          reportCount: "desc",
        },
        take: 8,
        include: {
          author: {
            select: {
              name: true,
            },
          },
        },
      }),
      getReportedComments(),
      prisma.chatbotFeedback.findMany({
        where: {
          value: {
            in: [FeedbackValue.NOT_HELPFUL, FeedbackValue.IRRELEVANT],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        include: {
          user: {
            select: {
              name: true,
            },
          },
          message: {
            select: {
              content: true,
            },
          },
        },
      }),
      prisma.auditLog.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        include: {
          actor: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.category.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: {
              orders: {
                where: {
                  NOT: {
                    AND: [{ status: OrderStatus.PENDING }, { paymentMethod: null }],
                  },
                },
              },
            },
          },
        },
        orderBy: [
          { orders: { _count: "desc" } },
          { name: "asc" },
        ],
      }),
    ]);
    const sellerQualityScores = await loadSellerQualityScores(listings.map((listing) => listing.seller.id));

    return {
      metrics: [
        { label: "Người dùng", value: totalUsers },
        { label: "Tài khoản bị khóa", value: totalLockedUsers },
        { label: "Sách", value: totalBooks },
        { label: "Sách ẩn/lưu trữ", value: totalHiddenBooks },
        { label: "Listing", value: totalListings },
        { label: "Tin bán cần kiểm tra", value: pendingListingsCount },
        { label: "Đơn hàng", value: totalOrders },
        { label: "Report", value: totalReports },
      ],
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isLocked: user.isLocked,
        lockReason: user.lockReason,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt,
        persona: user.profile?.persona ?? null,
        preferredGenres: user.profile?.preferredGenres ?? [],
        counts: {
          listings: user._count.listings,
          orders: user._count.orders,
          posts: user._count.posts,
          recommendations: user._count.recommendations,
        },
        recentActivity: user.interactionEvents.map((event) => ({
          actionType: event.actionType,
          bookTitle: getVietnameseBookTitle(event.book.id, event.book.title),
          createdAt: event.createdAt,
        })),
      })),
      books: books.map((book) => {
        const catalogListing = book.listings.find((l) => l.sellerId === CATALOG_STORE_USER_ID);
        const paperStock = catalogListing
          ? catalogListing.stock
          : book.editions
              .filter((e) => e.editionType === EditionType.PAPER_NEW)
              .reduce((sum, e) => sum + e.stock, 0);

        return {
          id: book.id,
          title: getVietnameseBookTitle(book.id, book.title),
          author: book.authorName,
          categoryId: book.categoryId,
          category: book.category.name,
          price: decimalToNumber(book.price),
          pages: book.pages,
          publishYear: book.publishYear,
          description: book.description,
          status: book.status,
          coverPath: normalizeBookCoverUrl(book.coverPath),
          isEbook: book.isEbook,
          isPubliclyVisible: book.isPubliclyVisible,
          languageCode: book.languageCode,
          hasCover: Boolean(book.coverPath),
          hasDescription: Boolean(book.description?.trim()),
          hasEmbedding: Boolean(book.embedding),
          createdAt: book.createdAt,
          stock: paperStock,
          listingsCount: book._count.listings,
          ordersCount: book._count.orderItems,
        };
      }),
      categories: allCategories.map((c) => ({ id: c.id, name: c.name })),
      listings: listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        status: listing.status,
        condition: listing.condition,
        price: decimalToNumber(listing.price),
        reportCount: listing.reportCount,
        rejectionReason: listing.rejectionReason,
        seller: (() => {
          const quality = sellerQualityScores.get(listing.seller.id);
          if (!quality) {
            throw new Error(`Không tính được điểm chất lượng cho seller ${listing.seller.id}.`);
          }

          return {
            id: listing.seller.id,
            name: listing.seller.name,
            email: listing.seller.email,
            listingCount: listing.seller._count.listings,
            sellerQualityScore: quality.score,
            highQuality: quality.isHighQuality,
            formulaVersion: quality.formulaVersion,
          };
        })(),
        createdAt: listing.createdAt,
      })),
      orders: orders.map((order) => {
        const allowedNextStatuses = getAllowedOrderNextStatuses(order.status, "ADMIN");
        return {
          id: order.id,
          status: order.status,
          totalAmount: decimalToNumber(order.totalAmount),
          paymentMethod: order.paymentMethod,
          checkoutKey: order.checkoutKey,
          buyer: order.buyer,
          shippingInfo: {
            fullName: order.shippingFullName,
            phone: order.shippingPhone,
            address: [order.shippingAddressLine, order.shippingWard, order.shippingDistrict, order.shippingProvince]
              .filter(Boolean)
              .join(", "),
            note: order.shippingNote,
          },
          items: order.items.map((item) => ({
            id: item.id,
            bookId: item.bookId,
            title: getVietnameseBookTitle(item.bookId, item.book?.title ?? item.listing?.title ?? "Sách"),
            authorName: item.book?.authorName ?? "",
            coverPath: normalizeBookCoverUrl(item.book?.coverPath),
            quantity: item.quantity,
            unitPrice: decimalToNumber(item.unitPrice),
            totalPrice: decimalToNumber(item.totalPrice),
            sellerName: item.listing?.seller.name ?? "Gian hàng BookVerse",
          })),
          allowedNextStatuses,
          sellers: Array.from(new Set(order.items.map((item) => item.listing?.seller.name).filter(Boolean) as string[])),
          itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
          createdAt: order.createdAt,
        };
      }),
      buyers: allUsersForBuyers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        orderCount: u._count.orders,
      })),
      reportedPosts: reportedPosts.map((post) => ({
        id: post.id,
        title: post.title,
        status: post.status,
        authorName: post.author.name,
        reportCount: post.reportCount,
        moderationReason: post.moderationReason,
        createdAt: post.createdAt,
      })),
      reportedComments,
      ai: {
        totalRecommendations,
        totalDailyRecommendations,
        totalEvidence,
        totalRecommendationFeedback,
        totalChatbotSessions,
        totalChatbotMessages,
        totalChatbotFeedback,
        lowRatedChatbotFeedback: lowRatedChatbotFeedback.map((feedback) => ({
          id: feedback.id,
          value: feedback.value,
          note: feedback.note,
          message: feedback.message?.content ?? null,
          userName: feedback.user?.name ?? null,
          createdAt: feedback.createdAt,
        })),
      },
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actorName: log.actor?.name ?? null,
        createdAt: log.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        usersTotal,
        booksTotal,
        listingsTotal,
        ordersTotal,
      },
    };
  } catch (error: unknown) {
    if (error instanceof PermissionError) {
      return emptyAdminCenterData;
    }

    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getAdminCenterData] ${message}`);
    return emptyAdminCenterData;
  }
}

export async function updateUserRole(userId: string, role: string): Promise<AdminActionResult> {
  try {
    const actor = await requireAdminUser();
    const targetRole = parseRole(role);
    const cleanUserId = userId.trim();

    if (!targetRole) {
      return { success: false, message: "Vai trò không hợp lệ." };
    }

    if (cleanUserId === actor.id && targetRole !== UserRole.ADMIN) {
      return { success: false, message: "Admin không thể tự hạ quyền chính mình." };
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id: cleanUserId,
        },
        data: {
          role: targetRole,
        },
        select: {
          id: true,
          name: true,
        },
      });

      await recordAuditLog(
        {
          actorId: actor.id,
          action: "ADMIN_USER_ROLE_UPDATE",
          entityType: "USER",
          entityId: user.id,
          metadata: {
            role: targetRole,
          },
        },
        tx,
      );
    });

    return { success: true, message: "Đã cập nhật vai trò người dùng." };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể cập nhật vai trò người dùng.");
  }
}

export async function toggleUserLock(
  userId: string,
  shouldLock: boolean,
  reason: string,
): Promise<AdminActionResult> {
  try {
    const actor = await requireAdminUser();
    const cleanUserId = userId.trim();

    if (cleanUserId === actor.id) {
      return { success: false, message: "Admin không thể tự khóa tài khoản chính mình." };
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id: cleanUserId,
        },
        data: {
          isLocked: shouldLock,
          lockedAt: shouldLock ? new Date() : null,
          lockReason: shouldLock ? normalizeReason(reason, "Khóa bởi quản trị viên.") : null,
        },
        select: {
          id: true,
          name: true,
        },
      });

      await createNotification(
        {
          userId: user.id,
          title: shouldLock ? "Tài khoản đã bị khóa" : "Tài khoản đã được mở khóa",
          message: shouldLock
            ? "Tài khoản của bạn đã bị khóa bởi quản trị viên."
            : "Tài khoản của bạn đã được mở khóa.",
          type: NotificationType.SECURITY,
          href: "/profile",
        },
        tx,
      );

      await recordAuditLog(
        {
          actorId: actor.id,
          action: shouldLock ? "ADMIN_USER_LOCK" : "ADMIN_USER_UNLOCK",
          entityType: "USER",
          entityId: user.id,
          metadata: {
            reason,
          },
        },
        tx,
      );
    });

    return { success: true, message: shouldLock ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản." };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể cập nhật trạng thái tài khoản.");
  }
}

export async function adminCreateUser(formData: FormData): Promise<AdminActionResult> {
  try {
    const actor = await requireAdminUser();
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const rawPassword = String(formData.get("password") ?? "").trim() || "123456";
    const roleInput = String(formData.get("role") ?? "BUYER").toUpperCase();
    const role = (Object.values(UserRole).includes(roleInput as UserRole)
      ? roleInput
      : UserRole.BUYER) as UserRole;

    if (!name || name.length < 2) {
      return { success: false, message: "Họ và tên phải có ít nhất 2 ký tự." };
    }
    if (!email || !email.includes("@")) {
      return { success: false, message: "Email không hợp lệ." };
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return { success: false, message: `Email "${email}" đã tồn tại trên hệ thống.` };
    }

    const { default: bcrypt } = await import("bcrypt");
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const userId = `USER-${crypto.randomUUID()}`;

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          email,
          name,
          password: passwordHash,
          role,
          lastActiveAt: new Date(),
        },
      });

      await tx.profile.create({
        data: {
          userId,
          bio: "Thành viên BookVerse",
        },
      });

      await recordAuditLog(
        {
          actorId: actor.id,
          action: "ADMIN_USER_CREATE",
          entityType: "USER",
          entityId: userId,
          metadata: { name, email, role },
        },
        tx,
      );
    });

    return { success: true, message: `Đã tạo tài khoản "${name}" (${email}) thành công!` };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể tạo tài khoản người dùng.");
  }
}

export async function adminUpdateUser(formData: FormData): Promise<AdminActionResult> {
  try {
    const actor = await requireAdminUser();
    const userId = String(formData.get("userId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const roleInput = String(formData.get("role") ?? "").toUpperCase();

    if (!userId) return { success: false, message: "Thiếu mã tài khoản." };
    if (!name || name.length < 2) return { success: false, message: "Họ và tên không hợp lệ." };
    if (!email || !email.includes("@")) return { success: false, message: "Email không hợp lệ." };

    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
      select: { id: true },
    });
    if (existing) {
      return { success: false, message: `Email "${email}" đã thuộc về tài khoản khác.` };
    }

    const role = Object.values(UserRole).includes(roleInput as UserRole)
      ? (roleInput as UserRole)
      : undefined;

    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        ...(role ? { role } : {}),
      },
    });

    await recordAuditLog({
      actorId: actor.id,
      action: "ADMIN_USER_UPDATE",
      entityType: "USER",
      entityId: userId,
      metadata: { name, email, role },
    });

    return { success: true, message: `Đã cập nhật thông tin tài khoản "${name}".` };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể cập nhật người dùng.");
  }
}

export async function adminResetPassword(formData: FormData): Promise<AdminActionResult> {
  try {
    const actor = await requireAdminUser();
    const userId = String(formData.get("userId") ?? "").trim();
    const rawPassword = String(formData.get("newPassword") ?? "").trim() || "123456";

    if (!userId) return { success: false, message: "Thiếu mã tài khoản." };
    if (rawPassword.length < 6) return { success: false, message: "Mật khẩu phải từ 6 ký tự trở lên." };

    const { default: bcrypt } = await import("bcrypt");
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
      select: { id: true, name: true, email: true },
    });

    await recordAuditLog({
      actorId: actor.id,
      action: "ADMIN_USER_RESET_PASSWORD",
      entityType: "USER",
      entityId: userId,
      metadata: { targetEmail: user.email },
    });

    return {
      success: true,
      message: `Đã đặt lại mật khẩu cho tài khoản "${user.name}" thành: "${rawPassword}"`,
    };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể đặt lại mật khẩu.");
  }
}

export async function adminDeleteUser(formData: FormData): Promise<AdminActionResult> {
  try {
    const actor = await requireModeratorUser();
    const userId = String(formData.get("userId") ?? "").trim();

    if (!userId) return { success: false, message: "Thiếu mã tài khoản." };
    if (userId === actor.id) {
      return { success: false, message: "Quản trị viên không thể tự xóa tài khoản của chính mình." };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) return { success: false, message: "Tài khoản không tồn tại." };

    await prisma.$transaction(async (tx) => {
      // 1. Telemetry, consent & interactions
      await tx.userResearchConsent.deleteMany({ where: { userId } });
      await tx.userInteractionLog.deleteMany({ where: { userId } });
      await tx.interactionEvent.deleteMany({ where: { userId } });
      await tx.interaction.deleteMany({ where: { userId } });

      // 2. Reading sessions, progress, bookmarks, highlights, entitlements, favorites
      await tx.readingSession.deleteMany({ where: { userId } });
      await tx.readingProgress.deleteMany({ where: { userId } });
      await tx.bookmark.deleteMany({ where: { userId } });
      await tx.highlight.deleteMany({ where: { userId } });
      await tx.readingEntitlement.deleteMany({ where: { userId } });
      await tx.favoriteBook.deleteMany({ where: { userId } });

      // 3. Recommendations
      await tx.recommendationTelemetryEvent.deleteMany({ where: { userId } });
      await tx.recommendationFeedback.deleteMany({ where: { userId } });
      await tx.recommendationRequest.deleteMany({ where: { userId } });
      await tx.recommendationEvidence.deleteMany({ where: { recommendation: { userId } } });
      await tx.recommendation.deleteMany({ where: { userId } });
      await tx.dailyRecommendation.deleteMany({ where: { userId } });

      // 4. Chatbot sessions & messages
      await tx.chatbotFeedback.deleteMany({ where: { userId } });
      await tx.chatbotMessage.deleteMany({ where: { session: { userId } } });
      await tx.chatbotSession.deleteMany({ where: { userId } });

      // 5. Community: reactions, reviews, comments, posts
      await tx.reaction.deleteMany({ where: { userId } });
      await tx.review.deleteMany({ where: { userId } });
      await tx.comment.deleteMany({ where: { authorId: userId } });
      const userPosts = await tx.post.findMany({ where: { authorId: userId }, select: { id: true } });
      const postIds = userPosts.map((p) => p.id);
      if (postIds.length > 0) {
        await tx.comment.deleteMany({ where: { postId: { in: postIds } } });
        await tx.post.deleteMany({ where: { id: { in: postIds } } });
      }

      // 6. Marketplace messages & conversations
      await tx.marketplaceMessage.deleteMany({ where: { senderId: userId } });
      const userConversations = await tx.marketplaceConversation.findMany({
        where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
        select: { id: true },
      });
      const convIds = userConversations.map((c) => c.id);
      if (convIds.length > 0) {
        await tx.marketplaceMessage.deleteMany({ where: { conversationId: { in: convIds } } });
        await tx.marketplaceConversation.deleteMany({ where: { id: { in: convIds } } });
      }

      // 7. Marketplace listings
      const userListings = await tx.listing.findMany({ where: { sellerId: userId }, select: { id: true } });
      const listingIds = userListings.map((l) => l.id);
      if (listingIds.length > 0) {
        await tx.listingImage.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.orderItem.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.listing.deleteMany({ where: { id: { in: listingIds } } });
      }
      await tx.sellerAiScore.deleteMany({ where: { sellerId: userId } });

      // 8. Orders (as buyer)
      const userOrders = await tx.order.findMany({ where: { buyerId: userId }, select: { id: true } });
      const orderIds = userOrders.map((o) => o.id);
      if (orderIds.length > 0) {
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.orderTimelineEvent.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      await tx.orderTimelineEvent.deleteMany({ where: { actorId: userId } });

      // 9. Account, profile, subscriptions, addresses
      await tx.shippingAddress.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.profile.deleteMany({ where: { userId } });
      await tx.subscription.deleteMany({ where: { userId } });
      await tx.membershipPayment.deleteMany({ where: { userId } });

      // 10. Audit logs (update actor to null if any)
      await tx.auditLog.updateMany({ where: { actorId: userId }, data: { actorId: null } });

      // 11. Finally delete the User record
      await tx.user.delete({ where: { id: userId } });

      await recordAuditLog(
        {
          actorId: actor.id,
          action: "ADMIN_USER_DELETE",
          entityType: "USER",
          entityId: userId,
          metadata: { deletedEmail: user.email, deletedName: user.name },
        },
        tx,
      );
    });

    return { success: true, message: `Đã xóa vĩnh viễn tài khoản "${user.name}" (${user.email ?? ""}).` };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể xóa tài khoản người dùng.");
  }
}

export async function updateBookStatus(
  bookId: string,
  status: string,
  reason: string,
): Promise<AdminActionResult> {
  try {
    const actor = await requireModeratorUser();
    const targetStatus = parseEnumValue(BookStatus, status);

    if (!targetStatus) {
      return { success: false, message: "Trạng thái sách không hợp lệ." };
    }

    await prisma.$transaction(async (tx) => {
      const book = await tx.book.update({
        where: {
          id: bookId.trim(),
        },
        data: {
          status: targetStatus,
          deletedAt: targetStatus === BookStatus.ARCHIVED ? new Date() : null,
        },
        select: {
          id: true,
        },
      });

      await recordAuditLog(
        {
          actorId: actor.id,
          action: "ADMIN_BOOK_STATUS_UPDATE",
          entityType: "BOOK",
          entityId: book.id,
          metadata: {
            status: targetStatus,
            reason,
          },
        },
        tx,
      );
    });

    return { success: true, message: "Đã cập nhật trạng thái sách." };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể cập nhật trạng thái sách.");
  }
}

export async function adminCreateBook(formData: FormData): Promise<AdminActionResult> {
  try {
    const actor = await requireModeratorUser();
    const title = String(formData.get("title") ?? "").trim();
    const authorName = String(formData.get("authorName") ?? "").trim();
    const categoryId = String(formData.get("categoryId") ?? "").trim();
    const priceRaw = parseFloat(String(formData.get("price") ?? "0"));
    const price = isNaN(priceRaw) || priceRaw < 0 ? 0 : priceRaw;
    const description = String(formData.get("description") ?? "").trim();
    const pagesRaw = parseInt(String(formData.get("pages") ?? "0"), 10);
    const pages = isNaN(pagesRaw) || pagesRaw <= 0 ? null : pagesRaw;
    const publishYearRaw = parseInt(String(formData.get("publishYear") ?? "0"), 10);
    const publishYear = isNaN(publishYearRaw) || publishYearRaw <= 0 ? null : publishYearRaw;
    const coverPath = String(formData.get("coverPath") ?? "").trim() || null;
    const isEbook = formData.get("isEbook") === "on" || formData.get("isEbook") === "true";
    const statusRaw = String(formData.get("status") ?? "ACTIVE");
    const status = parseEnumValue(BookStatus, statusRaw) ?? BookStatus.ACTIVE;
    const languageCode = String(formData.get("languageCode") ?? "vi").trim() || "vi";

    if (!title) {
      return { success: false, message: "Tiêu đề sách không được để trống." };
    }
    if (!authorName) {
      return { success: false, message: "Tên tác giả không được để trống." };
    }
    if (!categoryId) {
      return { success: false, message: "Vui lòng chọn thể loại cho sách." };
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true },
    });
    if (!category) {
      return { success: false, message: "Thể loại sách không tồn tại." };
    }

    // Generate slug
    const baseSlug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sach";
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.book.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const id = "bk_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const newBook = await prisma.book.create({
      data: {
        id,
        title,
        slug,
        authorName,
        categoryId,
        price: new Prisma.Decimal(price),
        description: description || null,
        pages,
        publishYear,
        coverPath,
        isEbook,
        status,
        languageCode,
        isPubliclyVisible: status === BookStatus.ACTIVE,
        coverReviewStatus: CoverReviewStatus.VERIFIED_LOCAL,
      },
      select: { id: true, title: true },
    });

    const stockRaw = parseInt(String(formData.get("stock") ?? "10"), 10);
    const stock = isNaN(stockRaw) || stockRaw < 0 ? 0 : stockRaw;
    if (stock >= 0) {
      await prisma.bookEdition.create({
        data: {
          bookId: newBook.id,
          editionType: EditionType.PAPER_NEW,
          price: new Prisma.Decimal(price),
          stock,
          publishYear,
        },
      });

      // Tạo tin bán chính hãng từ Gian hàng BookVerse để sách có thể mua được ngay
      await prisma.listing.upsert({
        where: { id: `BV-LISTING-${newBook.id}` },
        create: {
          id: `BV-LISTING-${newBook.id}`,
          sellerId: CATALOG_STORE_USER_ID,
          bookId: newBook.id,
          title: newBook.title,
          description: `${newBook.title} của ${authorName}. Bản in sách giấy chính hãng phân phối bởi Gian hàng BookVerse.`,
          condition: ListingCondition.NEW,
          price: new Prisma.Decimal(price || 150000),
          status: stock > 0 ? ListingStatus.APPROVED : ListingStatus.SOLD,
          stock,
          hasCover: Boolean(coverPath),
          moderationNote: "Bản in chính thức tạo bởi Quản trị viên BookVerse",
          reviewedAt: new Date(),
        },
        update: {
          stock,
          price: new Prisma.Decimal(price || 150000),
          status: stock > 0 ? ListingStatus.APPROVED : ListingStatus.SOLD,
          soldAt: stock > 0 ? null : new Date(),
        },
      });
    }

    await recordAuditLog({
      actorId: actor.id,
      action: "ADMIN_BOOK_CREATE",
      entityType: "BOOK",
      entityId: newBook.id,
      metadata: { title, authorName, categoryId, price, stock },
    });

    return { success: true, message: `Đã thêm sách mới "${newBook.title}" vào hệ thống thành công.` };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể tạo sách mới.");
  }
}

export async function adminUpdateBook(formData: FormData): Promise<AdminActionResult> {
  try {
    const actor = await requireModeratorUser();
    const bookId = String(formData.get("bookId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const authorName = String(formData.get("authorName") ?? "").trim();
    const categoryId = String(formData.get("categoryId") ?? "").trim();
    const priceRaw = parseFloat(String(formData.get("price") ?? "0"));
    const price = isNaN(priceRaw) || priceRaw < 0 ? 0 : priceRaw;
    const description = String(formData.get("description") ?? "").trim();
    const pagesRaw = parseInt(String(formData.get("pages") ?? "0"), 10);
    const pages = isNaN(pagesRaw) || pagesRaw <= 0 ? null : pagesRaw;
    const publishYearRaw = parseInt(String(formData.get("publishYear") ?? "0"), 10);
    const publishYear = isNaN(publishYearRaw) || publishYearRaw <= 0 ? null : publishYearRaw;
    const coverPath = String(formData.get("coverPath") ?? "").trim() || null;
    const isEbook = formData.get("isEbook") === "on" || formData.get("isEbook") === "true";
    const statusRaw = String(formData.get("status") ?? "ACTIVE");
    const status = parseEnumValue(BookStatus, statusRaw) ?? BookStatus.ACTIVE;
    const languageCode = String(formData.get("languageCode") ?? "vi").trim() || "vi";

    if (!bookId) {
      return { success: false, message: "Thiếu mã định danh sách." };
    }
    if (!title) {
      return { success: false, message: "Tiêu đề sách không được để trống." };
    }
    if (!authorName) {
      return { success: false, message: "Tên tác giả không được để trống." };
    }

    const existingBook = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, title: true },
    });
    if (!existingBook) {
      return { success: false, message: "Không tìm thấy cuốn sách này." };
    }

    const updated = await prisma.book.update({
      where: { id: bookId },
      data: {
        title,
        authorName,
        ...(categoryId ? { categoryId } : {}),
        price: new Prisma.Decimal(price),
        description: description || null,
        pages,
        publishYear,
        coverPath,
        isEbook,
        status,
        languageCode,
        isPubliclyVisible: status === BookStatus.ACTIVE,
      },
      select: { id: true, title: true },
    });

    await recordAuditLog({
      actorId: actor.id,
      action: "ADMIN_BOOK_UPDATE",
      entityType: "BOOK",
      entityId: updated.id,
      metadata: { title, authorName, categoryId, price, status },
    });

    const stockRaw = formData.get("stock");
    if (stockRaw !== null) {
      const stockParsed = parseInt(String(stockRaw), 10);
      const stock = isNaN(stockParsed) || stockParsed < 0 ? 0 : stockParsed;
      const existingPaper = await prisma.bookEdition.findFirst({
        where: { bookId, editionType: EditionType.PAPER_NEW },
      });
      if (existingPaper) {
        await prisma.bookEdition.update({
          where: { id: existingPaper.id },
          data: { stock, price: new Prisma.Decimal(price) },
        });
      } else {
        await prisma.bookEdition.create({
          data: {
            bookId,
            editionType: EditionType.PAPER_NEW,
            price: new Prisma.Decimal(price),
            stock,
            publishYear,
          },
        });
      }

      // Cập nhật tồn kho tin bán chính hãng của Gian hàng BookVerse
      const catalogListing = await prisma.listing.findFirst({
        where: {
          bookId,
          sellerId: CATALOG_STORE_USER_ID,
        },
      });
      if (catalogListing) {
        await prisma.listing.update({
          where: { id: catalogListing.id },
          data: {
            stock,
            price: new Prisma.Decimal(price),
            status: stock > 0 ? ListingStatus.APPROVED : ListingStatus.SOLD,
            soldAt: stock > 0 ? null : new Date(),
          },
        });
      }
    }

    return { success: true, message: `Đã cập nhật thông tin sách "${updated.title}" thành công.` };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể cập nhật sách.");
  }
}

export async function adminDeleteBook(bookId: string): Promise<AdminActionResult> {
  try {
    const actor = await requireModeratorUser();
    const cleanId = bookId.trim();
    const existing = await prisma.book.findUnique({
      where: { id: cleanId },
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            orderItems: true,
            readingEntitlements: true,
            listings: true,
          },
        },
      },
    });

    if (!existing) {
      return { success: false, message: "Không tìm thấy sách để xóa." };
    }

    // Nếu sách đã phát sinh đơn mua hoặc quyền đọc, lưu trữ an toàn thay vì xóa cứng
    if (existing._count.orderItems > 0 || existing._count.readingEntitlements > 0) {
      await prisma.book.update({
        where: { id: cleanId },
        data: {
          status: BookStatus.ARCHIVED,
          deletedAt: new Date(),
          isPubliclyVisible: false,
        },
      });

      await recordAuditLog({
        actorId: actor.id,
        action: "ADMIN_BOOK_ARCHIVE",
        entityType: "BOOK",
        entityId: cleanId,
        metadata: { title: existing.title, reason: "Sách có lịch sử giao dịch/quyền đọc, chuyển sang lưu trữ ẩn an toàn." },
      });

      return {
        success: true,
        message: `Sách "${existing.title}" đã phát sinh lịch sử giao dịch nên được chuyển sang trạng thái "Lưu trữ / Ẩn" để bảo vệ toàn vẹn dữ liệu.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.userInteractionLog.updateMany({ where: { bookId: cleanId }, data: { bookId: null } });
      await tx.bookChunk.deleteMany({ where: { bookId: cleanId } });
      await tx.bookEmbedding.deleteMany({ where: { bookId: cleanId } });
      await tx.interactionEvent.deleteMany({ where: { bookId: cleanId } });
      await tx.favoriteBook.deleteMany({ where: { bookId: cleanId } });
      await tx.bookmark.deleteMany({ where: { bookId: cleanId } });
      await tx.highlight.deleteMany({ where: { bookId: cleanId } });
      await tx.readingProgress.deleteMany({ where: { bookId: cleanId } });
      await tx.readingSession.deleteMany({ where: { bookId: cleanId } });
      await tx.review.deleteMany({ where: { bookId: cleanId } });
      await tx.book.delete({ where: { id: cleanId } });

      await recordAuditLog(
        {
          actorId: actor.id,
          action: "ADMIN_BOOK_DELETE",
          entityType: "BOOK",
          entityId: cleanId,
          metadata: { title: existing.title },
        },
        tx,
      );
    });

    return { success: true, message: `Đã xóa vĩnh viễn cuốn sách "${existing.title}".` };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể xóa sách.");
  }
}

export async function regenerateBookEmbedding(bookId: string): Promise<AdminActionResult> {
  try {
    const actor = await requireModeratorUser();
    const cleanBookId = bookId.trim();
    const book = await prisma.book.findUnique({
      where: {
        id: cleanBookId,
      },
      select: {
        id: true,
      },
    });

    if (!book) {
      return { success: false, message: "Không tìm thấy sách." };
    }

    const result = await generateBookEmbedding(book.id);

    await recordAuditLog({
      actorId: actor.id,
      action: "ADMIN_BOOK_EMBEDDING_REGENERATED",
      entityType: "BOOK",
      entityId: book.id,
      metadata: {
        status: "completed",
        provider: result.provider,
        model: result.model,
        dimensions: result.dimensions,
        contentLength: result.contentLength,
      },
    });

    return {
      success: true,
      message: `Đã tạo lại embedding cho sách bằng ${result.provider}/${result.model}.`,
    };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể tạo lại embedding.");
  }
}

export async function moderateListing(
  listingId: string,
  status: ListingStatus,
  reason = "",
): Promise<AdminActionResult> {
  try {
    const actor = await requireModeratorUser();
    const allowedStatuses: ListingStatus[] = [
      ListingStatus.APPROVED,
      ListingStatus.REJECTED,
      ListingStatus.HIDDEN,
      ListingStatus.ARCHIVED,
    ];

    if (!allowedStatuses.includes(status)) {
      return { success: false, message: "Trạng thái tin bán sách không hợp lệ để kiểm duyệt." };
    }

    await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.update({
        where: {
          id: listingId.trim(),
        },
        data: {
          status,
          rejectionReason: status === ListingStatus.REJECTED ? normalizeReason(reason, "tin bán sách không đạt yêu cầu.") : null,
          moderationNote: reason.trim() || null,
          reviewedAt: new Date(),
          hiddenAt: status === ListingStatus.HIDDEN ? new Date() : null,
        },
        select: {
          id: true,
          title: true,
          sellerId: true,
        },
      });

      await createNotification(
        {
          userId: listing.sellerId,
          title:
            status === ListingStatus.APPROVED
              ? "tin bán sách đã được duyệt"
              : status === ListingStatus.REJECTED
                ? "tin bán sách bị từ chối"
                : "tin bán sách đã bị ẩn",
          message:
            status === ListingStatus.APPROVED
              ? `Tin bán "${listing.title}" đã được duyệt.`
              : `Tin bán "${listing.title}" cần xử lý: ${normalizeReason(reason, "Không có lý do cụ thể.")}`,
          type: NotificationType.MARKETPLACE,
          href: `/seller/listings/${listing.id}/edit`,
        },
        tx,
      );

      await recordAuditLog(
        {
          actorId: actor.id,
          action: "ADMIN_LISTING_MODERATE",
          entityType: "LISTING",
          entityId: listing.id,
          metadata: {
            status,
            reason,
          },
        },
        tx,
      );
    });

    return { success: true, message: "Đã cập nhật trạng thái tin bán sách." };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể cập nhật tin bán sách.");
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  note: string,
): Promise<AdminActionResult> {
  try {
    const actor = await requireModeratorUser();
    const targetStatus = parseEnumValue(OrderStatus, status);

    if (!targetStatus) {
      return { success: false, message: "Trạng thái đơn hàng không hợp lệ." };
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId.trim(),
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

    if (!order || (order.status === OrderStatus.PENDING && !order.paymentMethod)) {
      return { success: false, message: "Không tìm thấy order đã thanh toán." };
    }

    const actorType = actor.role === UserRole.ADMIN ? "ADMIN" : "MODERATOR";
    const transition = checkOrderTransition(order.status, targetStatus, actorType);
    if (!transition.allowed) {
      return { success: false, message: transition.message };
    }

    if (targetStatus === OrderStatus.CANCELLED) {
      const receipt = await cancelOrderWithRestock({
        orderId: order.id,
        actorId: actor.id,
        actor: actorType,
        note,
        source: "admin",
      });
      return {
        success: true,
        message: `Đã hủy đơn và hoàn ${receipt.restoredQuantity} sản phẩm vào tồn kho.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: order.status, paymentMethod: { not: null } },
        data: {
          status: targetStatus,
        },
      });
      if (claimed.count !== 1) {
        throw new Error("ORDER_STATUS_CONFLICT");
      }

      await grantEbookEntitlementsForOrder(tx, order.id);

      await tx.orderTimelineEvent.create({
        data: {
          orderId: order.id,
          actorId: actor.id,
          status: targetStatus,
          note: note.trim() || null,
          metadata: {
            source: "admin",
          },
        },
      });

      const sellerIds = Array.from(
        new Set(order.items.map((item) => item.listing?.sellerId).filter(Boolean) as string[]),
      );
      await createNotifications(
        [
          {
            userId: order.buyer.id,
            title: "Đơn hàng đã cập nhật",
            message: `Đơn ${order.id} đã chuyển sang trạng thái ${targetStatus}.`,
            type: NotificationType.ORDER,
            href: `/orders/${order.id}`,
          },
          ...sellerIds.map((sellerId) => ({
            userId: sellerId,
            title: "Đơn hàng seller đã cập nhật",
            message: `Đơn ${order.id} có sản phẩm của bạn đã chuyển sang trạng thái ${targetStatus}.`,
            type: NotificationType.ORDER,
            href: `/seller/orders/${order.id}`,
          })),
        ],
        tx,
      );

      await recordAuditLog(
        {
          actorId: actor.id,
          action: "ADMIN_ORDER_STATUS_UPDATE",
          entityType: "ORDER",
          entityId: order.id,
          metadata: {
            previousStatus: order.status,
            nextStatus: targetStatus,
            actorRole: actor.role,
            note,
          },
        },
        tx,
      );
    });

    return { success: true, message: "Đã cập nhật trạng thái đơn hàng." };
  } catch (error: unknown) {
    if (error instanceof OrderCancellationError) {
      return { success: false, message: error.publicMessage };
    }
    return handleAdminError(error, "Không thể cập nhật trạng thái đơn hàng.");
  }
}

export async function moderatePost(
  postId: string,
  status: PostStatus,
  reason = "",
): Promise<AdminActionResult> {
  try {
    const actor = await requireModeratorUser();

    await prisma.$transaction(async (tx) => {
      const post = await tx.post.update({
        where: {
          id: postId.trim(),
        },
        data: {
          status,
          reportCount: status === PostStatus.PUBLISHED ? 0 : undefined,
          moderationReason: reason.trim() || null,
          moderatedAt: new Date(),
        },
        select: {
          id: true,
          authorId: true,
          title: true,
        },
      });

      await createNotification(
        {
          userId: post.authorId,
          title: "Bài viết đã được kiểm duyệt",
          message: `Bài "${post.title}" đã chuyển sang trạng thái ${status}.`,
          type: NotificationType.COMMUNITY,
          href: `/community/${post.id}`,
        },
        tx,
      );

      await recordAuditLog(
        {
          actorId: actor.id,
          action: "ADMIN_POST_MODERATE",
          entityType: "POST",
          entityId: post.id,
          metadata: {
            status,
            reason,
          },
        },
        tx,
      );
    });

    return { success: true, message: "Đã cập nhật bài viết." };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể cập nhật bài viết.");
  }
}

export async function moderateComment(
  commentId: string,
  status: PostStatus,
  reason = "",
): Promise<AdminActionResult> {
  try {
    const actor = await requireModeratorUser();

    await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.update({
        where: {
          id: commentId.trim(),
        },
        data: {
          status,
          moderationReason: reason.trim() || null,
          moderatedAt: new Date(),
        },
        select: {
          id: true,
          authorId: true,
          postId: true,
        },
      });

      await createNotification(
        {
          userId: comment.authorId,
          title: "Bình luận đã được kiểm duyệt",
          message: `Bình luận của bạn đã chuyển sang trạng thái ${status}.`,
          type: NotificationType.COMMUNITY,
          href: `/community/${comment.postId}`,
        },
        tx,
      );

      await recordAuditLog(
        {
          actorId: actor.id,
          action: "ADMIN_COMMENT_MODERATE",
          entityType: "COMMENT",
          entityId: comment.id,
          metadata: {
            status,
            reason,
          },
        },
        tx,
      );
    });

    return { success: true, message: "Đã cập nhật bình luận." };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể cập nhật bình luận.");
  }
}

export async function rerunRecommendationForUser(userId: string): Promise<AdminActionResult> {
  try {
    const actor = await requireModeratorUser();
    const cleanUserId = userId.trim();
    const user = await prisma.user.findUnique({
      where: {
        id: cleanUserId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return { success: false, message: "Không tìm thấy user." };
    }

    const refreshResult = await refreshRecommendationsForUser(user.id);

    await prisma.$transaction(async (tx) => {
      await createNotification(
        {
          userId: user.id,
          title: "AI Recommendation đã được làm mới",
          message: `Admin đã chạy lại gợi ý cá nhân hóa và cập nhật ${refreshResult.count} đề xuất.`,
          type: NotificationType.AI,
          href: "/profile",
        },
        tx,
      );

      await recordAuditLog(
        {
          actorId: actor.id,
          action: "ADMIN_RECOMMENDATION_RERUN_REQUEST",
          entityType: "USER",
          entityId: user.id,
          metadata: {
            status: "completed",
            algorithm: refreshResult.algorithm,
            recommendationCount: refreshResult.count,
          },
        },
        tx,
      );
    });

    return {
      success: true,
      message: `Đã chạy lại recommendation và lưu ${refreshResult.count} gợi ý cho user.`,
    };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể chạy lại recommendation.");
  }
}

// Giữ tên cũ để các trang cũ vẫn build, dữ liệu trả về được lấy từ admin center mới.
export async function getDashboardStats() {
  const data = await getAdminCenterData();

  return {
    metrics: data.metrics,
    topBooks: [],
    topCategories: [],
    pendingListings: data.listings
      .filter((listing) => listing.status === ListingStatus.PENDING_REVIEW)
      .map((listing) => ({
        id: listing.id,
        title: listing.title,
        sellerName: listing.seller.name,
        price: listing.price,
        createdAt: listing.createdAt,
      })),
    reportedPosts: data.reportedPosts.map((post) => ({
      id: post.id,
      title: post.title,
      authorName: post.authorName,
      reportCount: post.reportCount,
      createdAt: post.createdAt,
    })),
  };
}

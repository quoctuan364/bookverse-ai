"use server";

import {
  BookStatus,
  FeedbackValue,
  ListingStatus,
  NotificationType,
  OrderStatus,
  PostStatus,
  Prisma,
  ReactionType,
  TargetType,
  UserRole,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { refreshRecommendationsForUser } from "@/actions/recommendation.actions";
import { recordAuditLog } from "@/lib/audit";
import { generateBookEmbedding } from "@/lib/book-embeddings";
import { createNotification, createNotifications } from "@/lib/notifications";
import { checkOrderTransition } from "@/lib/order-workflow";
import {
  PermissionError,
  requireAdminUser,
  requireModeratorUser,
} from "@/lib/permissions";

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
  category: string;
  status: BookStatus;
  coverPath: string | null;
  isEbook: boolean;
  hasCover: boolean;
  hasDescription: boolean;
  hasEmbedding: boolean;
  createdAt: Date;
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
    sellerScore: number | null;
    trusted: boolean;
  };
  createdAt: Date;
}

export interface AdminOrderItem {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: string | null;
  buyer: {
    id: string;
    name: string;
    email: string | null;
  };
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

export interface AdminCenterData {
  metrics: DashboardMetric[];
  users: AdminUserItem[];
  books: AdminBookItem[];
  listings: AdminListingItem[];
  orders: AdminOrderItem[];
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

const pageSize = 8;

const emptyAdminCenterData: AdminCenterData = {
  metrics: [],
  users: [],
  books: [],
  listings: [],
  orders: [],
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

function normalizeCoverPath(coverPath: string | null): string | null {
  if (!coverPath) {
    return null;
  }

  if (coverPath.startsWith("/") || coverPath.startsWith("http")) {
    return coverPath;
  }

  return `/${coverPath}`;
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
  const where: Prisma.ListingWhereInput = {};

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
    ];
  }

  return where;
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
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isLocked: true } }),
      prisma.book.count(),
      prisma.book.count({ where: { status: { in: [BookStatus.HIDDEN, BookStatus.ARCHIVED] } } }),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: ListingStatus.PENDING_REVIEW } }),
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
              sellerAiScore: true,
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
    ]);

    return {
      metrics: [
        { label: "Người dùng", value: totalUsers },
        { label: "Tài khoản bị khóa", value: totalLockedUsers },
        { label: "Sách", value: totalBooks },
        { label: "Sách ẩn/lưu trữ", value: totalHiddenBooks },
        { label: "Listing", value: totalListings },
        { label: "Listing chờ duyệt", value: pendingListingsCount },
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
        counts: {
          listings: user._count.listings,
          orders: user._count.orders,
          posts: user._count.posts,
          recommendations: user._count.recommendations,
        },
        recentActivity: user.interactionEvents.map((event) => ({
          actionType: event.actionType,
          bookTitle: event.book.title,
          createdAt: event.createdAt,
        })),
      })),
      books: books.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.authorName,
        category: book.category.name,
        status: book.status,
        coverPath: normalizeCoverPath(book.coverPath),
        isEbook: book.isEbook,
        hasCover: Boolean(book.coverPath),
        hasDescription: Boolean(book.description?.trim()),
        hasEmbedding: Boolean(book.embedding),
        createdAt: book.createdAt,
      })),
      listings: listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        status: listing.status,
        condition: listing.condition,
        price: decimalToNumber(listing.price),
        reportCount: listing.reportCount,
        rejectionReason: listing.rejectionReason,
        seller: {
          id: listing.seller.id,
          name: listing.seller.name,
          email: listing.seller.email,
          listingCount: listing.seller._count.listings,
          sellerScore: listing.seller.sellerAiScore?.score ?? null,
          trusted: listing.seller.sellerAiScore?.trusted ?? false,
        },
        createdAt: listing.createdAt,
      })),
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        totalAmount: decimalToNumber(order.totalAmount),
        paymentMethod: order.paymentMethod,
        buyer: order.buyer,
        sellers: Array.from(new Set(order.items.map((item) => item.listing?.seller.name).filter(Boolean) as string[])),
        itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
        createdAt: order.createdAt,
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
      return { success: false, message: "Trạng thái listing không hợp lệ để kiểm duyệt." };
    }

    await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.update({
        where: {
          id: listingId.trim(),
        },
        data: {
          status,
          rejectionReason: status === ListingStatus.REJECTED ? normalizeReason(reason, "Listing không đạt yêu cầu.") : null,
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
              ? "Listing đã được duyệt"
              : status === ListingStatus.REJECTED
                ? "Listing bị từ chối"
                : "Listing đã bị ẩn",
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

    return { success: true, message: "Đã cập nhật trạng thái listing." };
  } catch (error: unknown) {
    return handleAdminError(error, "Không thể cập nhật listing.");
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
      return { success: false, message: "Không tìm thấy order đã checkout." };
    }

    const actorType = actor.role === UserRole.ADMIN ? "ADMIN" : "MODERATOR";
    const transition = checkOrderTransition(order.status, targetStatus, actorType);
    if (!transition.allowed) {
      return { success: false, message: transition.message };
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: targetStatus,
        },
      });

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

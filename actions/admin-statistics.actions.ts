"use server";

import { ListingStatus, OrderStatus } from "@prisma/client";
import { requireModeratorUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getVietnameseBookTitle } from "@/lib/book-display-title";

export interface CategoryViewStat {
  category: string;
  views: number;
  books: number;
}

export interface InventoryStat {
  status: string;
  label: string;
  count: number;
  totalStock: number;
  percent: number;
}

export interface TopViewedBook {
  id: string;
  title: string;
  author: string;
  category: string;
  views: number;
}

export interface OrderStatusStat {
  status: string;
  label: string;
  count: number;
  percent: number;
}

export interface DailyRegistration {
  date: string;
  label: string;
  newUsers: number;
}

export interface DailyActivityStat {
  date: string;
  label: string;
  views: number;
  sessions: number;
}

export interface BookReadStat {
  date: string;
  label: string;
  sessions: number;
}

export interface InteractionTypeStat {
  type: string;
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface AdminStatisticsData {
  categoryViews: CategoryViewStat[];
  inventory: InventoryStat[];
  topViewedBooks: TopViewedBook[];
  orderStatus: OrderStatusStat[];
  registrations: DailyRegistration[];
  dailyActivity: DailyActivityStat[];
  readSessions: BookReadStat[];
  interactionBreakdown: InteractionTypeStat[];
  summary: {
    totalInteractions30d: number;
    totalViews30d: number;
    totalReadingSessions30d: number;
    totalReadSessions7d: number;
    totalNewUsers30d: number;
    totalOrders30d: number;
    totalRevenue30d: number;
    trackedViewers30d: number;
    activeReaders30d: number;
    consentingUsers: number;
    totalActiveListings: number;
    totalInventoryUnits: number;
    catalogStoreStockUnits?: number;
    catalogStoreTitles?: number;
    lowStockListings: number;
    generatedAt: Date;
  };
}

const INTERACTION_LABELS: Record<string, { label: string; color: string }> = {
  READ: { label: "Đọc sách trực tuyến", color: "#1A5C57" },
  VIEW: { label: "Xem chi tiết sách", color: "#2E8B84" },
  SEARCH: { label: "Tìm kiếm sách & tác giả", color: "#3B82F6" },
  PURCHASE: { label: "Giao dịch mua sách", color: "#D4AF37" },
  CART_ADD: { label: "Thêm vào giỏ hàng", color: "#F59E0B" },
  BOOKMARK: { label: "Đánh dấu trang đọc", color: "#10B981" },
  HIGHLIGHT: { label: "Ghi chú & Tô sáng", color: "#8B5CF6" },
  REVIEW: { label: "Đánh giá & Bình luận", color: "#EC4899" },
  LIKE: { label: "Yêu thích sách", color: "#EF4444" },
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Đang hiển thị",
  PENDING_REVIEW: "Chưa công khai",
  DRAFT: "Bản nháp",
  REJECTED: "Không hợp lệ",
  HIDDEN: "Ẩn / Tạm dừng",
  SOLD: "Đã bán hết",
  ARCHIVED: "Đã lưu trữ",
};

const ORDER_LABELS: Record<string, string> = {
  PAID: "Đã thanh toán",
  PENDING: "Chờ thanh toán",
  CANCELLED: "Đã hủy đơn",
  REFUNDED: "Đã hoàn tiền",
  SHIPPED: "Đang vận chuyển",
  COMPLETED: "Hoàn tất đơn hàng",
};

interface NormalizedInteraction {
  type: string;
  bookId: string | null;
  userId: string | null;
  anonymousId: string | null;
  createdAt: Date;
}

function normalizeEventType(action: string): string {
  switch (action) {
    case "BOOK_VIEW":
    case "VIEW":
      return "VIEW";
    case "READ":
    case "READING_START":
    case "READING_PROGRESS":
    case "READING_PAUSE":
    case "READING_COMPLETE":
      return "READ";
    case "SEARCH_QUERY":
      return "SEARCH";
    case "ADD_TO_CART":
      return "CART_ADD";
    case "PURCHASE_CONFIRM":
      return "PURCHASE";
    case "BOOKMARK_ADD":
    case "BOOKMARK_CREATE":
    case "BOOKMARK_REMOVE":
      return "BOOKMARK";
    case "READING_HIGHLIGHT":
    case "READING_HIGHLIGHT_REMOVE":
      return "HIGHLIGHT";
    case "REVIEW_CREATE":
    case "REVIEW_SUBMIT":
      return "REVIEW";
    case "FAVORITE_ADD":
    case "FAVORITE_REMOVE":
      return "LIKE";
    default:
      return action;
  }
}

/**
 * Hệ thống đang duy trì ba bảng telemetry để tương thích dữ liệu cũ.
 * Một hành vi có thể được ghi đồng thời vào nhiều bảng, nên phải hợp nhất
 * theo người dùng, sách, loại sự kiện và giây phát sinh trước khi thống kê.
 */
function deduplicateInteractions(items: NormalizedInteraction[]): NormalizedInteraction[] {
  const unique = new Map<string, NormalizedInteraction>();

  for (const item of items) {
    const actor = item.userId ?? item.anonymousId ?? "anonymous";
    const secondBucket = Math.floor(item.createdAt.getTime() / 1_000);
    const key = [item.type, actor, item.bookId ?? "no-book", secondBucket].join("|");
    if (!unique.has(key)) unique.set(key, item);
  }

  return Array.from(unique.values());
}

function dateLabel(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(value);
}

function utcDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function getAdminStatistics(): Promise<AdminStatisticsData> {
  await requireModeratorUser();

  const now = new Date();
  const start30d = new Date(now);
  start30d.setUTCDate(start30d.getUTCDate() - 29);
  start30d.setUTCHours(0, 0, 0, 0);

  const start7d = new Date(now);
  start7d.setUTCDate(start7d.getUTCDate() - 6);
  start7d.setUTCHours(0, 0, 0, 0);

  // Truy vấn song song dữ liệu CHÍNH XÁC trong 30 ngày qua
  const [
    interactionEvents30d,
    interactions30d,
    userLogs30d,
    readingSessions30d,
    newUsers30d,
    orders30d,
    listingStatusStats,
    activeInventory,
    lowStockListings,
    consentingUsers,
    catalogStoreInventory,
  ] = await Promise.all([
    // 0. Sự kiện tương tác thời gian thực từ InteractionEvent (do tracking thực tế ghi lại)
    prisma.interactionEvent.findMany({
      where: { createdAt: { gte: start30d } },
      select: { actionType: true, bookId: true, userId: true, createdAt: true },
    }),

    // 1. Tương tác trong 30 ngày từ bảng Interaction
    prisma.interaction.findMany({
      where: { createdAt: { gte: start30d } },
      select: { type: true, bookId: true, userId: true, createdAt: true },
    }),

    // 2. Log nghiên cứu có consent. Có thể trùng với hai bảng trên và sẽ được khử trùng.
    prisma.userInteractionLog.findMany({
      where: {
        createdAt: { gte: start30d },
      },
      select: { eventType: true, bookId: true, userId: true, anonymousId: true, createdAt: true },
    }),

    // 3. Phiên đọc trong 30 ngày từ ReadingSession
    prisma.readingSession.findMany({
      where: { createdAt: { gte: start30d } },
      select: { id: true, bookId: true, userId: true, createdAt: true, timeSpent: true },
    }),

    // 4. Tài khoản mới đăng ký trong 30 ngày
    prisma.user.findMany({
      where: { createdAt: { gte: start30d } },
      select: { id: true, createdAt: true },
    }),

    // 5. Đơn hàng phát sinh trong 30 ngày
    prisma.order.findMany({
      where: { createdAt: { gte: start30d } },
      select: { status: true, totalAmount: true, createdAt: true },
    }),

    // 6. Thống kê tin Chợ sách C2C do người dùng thực đăng bán còn tồn kho
    prisma.listing.groupBy({
      by: ["status"],
      where: {
        stock: { gt: 0 },
        NOT: { seller: { is: { email: { endsWith: "@bookverse.local" } } } },
      },
      _count: { id: true },
      _sum: { stock: true },
    }),

    // 7. Tin đăng Chợ sách C2C APPROVED đang còn hàng (Người dùng thực đăng bán)
    prisma.listing.aggregate({
      where: {
        status: ListingStatus.APPROVED,
        stock: { gt: 0 },
        NOT: { seller: { is: { email: { endsWith: "@bookverse.local" } } } },
      },
      _count: { id: true },
      _sum: { stock: true },
    }),

    // 8. Tin đăng Chợ sách sắp hết hàng (stock <= 2)
    prisma.listing.count({
      where: {
        status: ListingStatus.APPROVED,
        stock: { gt: 0, lte: 2 },
        NOT: { seller: { is: { email: { endsWith: "@bookverse.local" } } } },
      },
    }),

    // 9. Người dùng đã cấp consent
    prisma.userResearchConsent.count({
      where: { consented: true, revokedAt: null },
    }),

    // 10. Tồn kho sách giấy chính thức trong kho BookVerse (Catalog Store)
    prisma.listing.aggregate({
      where: {
        status: ListingStatus.APPROVED,
        stock: { gt: 0 },
        seller: { is: { email: { endsWith: "@bookverse.local" } } },
      },
      _count: { id: true },
      _sum: { stock: true },
    }),
  ]);

  const interactions = deduplicateInteractions([
    ...interactionEvents30d.map((event) => ({
      type: normalizeEventType(event.actionType),
      bookId: event.bookId,
      userId: event.userId,
      anonymousId: null,
      createdAt: event.createdAt,
    })),
    ...interactions30d.map((event) => ({
      type: normalizeEventType(event.type),
      bookId: event.bookId,
      userId: event.userId,
      anonymousId: null,
      createdAt: event.createdAt,
    })),
    ...userLogs30d.map((event) => ({
      type: normalizeEventType(event.eventType),
      bookId: event.bookId,
      userId: event.userId,
      anonymousId: event.anonymousId,
      createdAt: event.createdAt,
    })),
  ]);

  // Phân bổ loại tương tác thật sau khi khử bản ghi trùng giữa các nguồn.
  const typeMap = new Map<string, number>();
  for (const interaction of interactions) {
    typeMap.set(interaction.type, (typeMap.get(interaction.type) ?? 0) + 1);
  }

  const totalInteractions30d = Array.from(typeMap.values()).reduce((sum, v) => sum + v, 0);

  const interactionBreakdown: InteractionTypeStat[] = Array.from(typeMap.entries())
    .map(([type, count]) => {
      const meta = INTERACTION_LABELS[type] ?? { label: type, color: "#6B7280" };
      const percent = totalInteractions30d > 0
        ? Number(((count / totalInteractions30d) * 100).toFixed(1))
        : 0;
      return {
        type,
        label: meta.label,
        count,
        percent,
        color: meta.color,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Chỉ dùng VIEW cho bảng sách/chủ đề truy cập nhiều nhất; không trộn phiên đọc hay bookmark.
  const viewEvents = interactions.filter((interaction) => interaction.type === "VIEW");
  const bookViewCount = new Map<string, number>();
  for (const event of viewEvents) {
    if (event.bookId) {
      bookViewCount.set(event.bookId, (bookViewCount.get(event.bookId) ?? 0) + 1);
    }
  }

  const sortedBookViews = Array.from(bookViewCount.entries()).sort((a, b) => b[1] - a[1]);

  const books = await prisma.book.findMany({
    // Lấy metadata của toàn bộ sách có lượt xem để thống kê chủ đề không bị thiếu.
    where: { id: { in: sortedBookViews.map(([id]) => id) } },
    select: {
      id: true,
      title: true,
      authorName: true,
      category: { select: { name: true } },
    },
  });

  const bookMap = new Map(books.map((b) => [b.id, b]));

  const topViewedBooks: TopViewedBook[] = sortedBookViews.slice(0, 10).map(([bookId, views]) => {
    const book = bookMap.get(bookId);
    return {
      id: bookId,
      title: book ? getVietnameseBookTitle(book.id, book.title) : `Sách #${bookId}`,
      author: book?.authorName ?? "—",
      category: book?.category?.name ?? "Tổng hợp",
      views,
    };
  });

  // Lượt xem theo thể loại trong 30 ngày
  const categoryCountMap = new Map<string, { views: number; books: Set<string> }>();
  for (const [bookId, count] of bookViewCount.entries()) {
    const book = bookMap.get(bookId);
    const catName = book?.category?.name ? book.category.name.split("—")[0].trim() : "Khác";
    const existing = categoryCountMap.get(catName) ?? { views: 0, books: new Set<string>() };
    existing.views += count;
    existing.books.add(bookId);
    categoryCountMap.set(catName, existing);
  }

  const categoryViews: CategoryViewStat[] = Array.from(categoryCountMap.entries())
    .map(([category, val]) => ({
      category,
      views: val.views,
      books: val.books.size,
    }))
    .sort((a, b) => b.views - a.views);

  // Tồn kho chợ sách cũ (Snapshot trạng thái hiện tại)
  const totalListingCount = listingStatusStats.reduce((sum, row) => sum + row._count.id, 0);
  const inventory: InventoryStat[] = listingStatusStats.map((row) => ({
    status: row.status,
    label: STATUS_LABELS[row.status] ?? row.status,
    count: row._count.id,
    totalStock: row._sum.stock ?? 0,
    percent: totalListingCount > 0 ? Number(((row._count.id / totalListingCount) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.count - a.count);

  // Thống kê đơn hàng trong 30 ngày
  const orderCountMap = new Map<string, number>();
  for (const o of orders30d) {
    orderCountMap.set(o.status, (orderCountMap.get(o.status) ?? 0) + 1);
  }
  const totalOrders30d = orders30d.length;
  const orderStatus: OrderStatusStat[] = Array.from(orderCountMap.entries()).map(
    ([status, count]) => ({
      status,
      label: ORDER_LABELS[status] ?? status,
      count,
      percent: totalOrders30d > 0 ? Number(((count / totalOrders30d) * 100).toFixed(1)) : 0,
    }),
  );

  // Thống kê chuỗi 30 ngày (Day-by-Day Activity)
  const dailyActivityMap = new Map<string, { views: number; sessions: number; newUsers: number }>();
  for (let offset = 0; offset < 30; offset++) {
    const d = new Date(start30d);
    d.setUTCDate(d.getUTCDate() + offset);
    dailyActivityMap.set(utcDateKey(d), { views: 0, sessions: 0, newUsers: 0 });
  }

  for (const event of viewEvents) {
    const key = utcDateKey(event.createdAt);
    const existing = dailyActivityMap.get(key);
    if (existing) existing.views += 1;
  }
  for (const s of readingSessions30d) {
    const key = utcDateKey(s.createdAt);
    const existing = dailyActivityMap.get(key);
    if (existing) existing.sessions += 1;
  }
  for (const u of newUsers30d) {
    const key = utcDateKey(u.createdAt);
    const existing = dailyActivityMap.get(key);
    if (existing) existing.newUsers += 1;
  }

  const dailyActivity: DailyActivityStat[] = [];
  const registrations: DailyRegistration[] = [];

  for (const [key, val] of dailyActivityMap.entries()) {
    const d = new Date(key + "T00:00:00Z");
    const label = dateLabel(d);
    dailyActivity.push({
      date: key,
      label,
      views: val.views,
      sessions: val.sessions,
    });
    registrations.push({
      date: key,
      label,
      newUsers: val.newUsers,
    });
  }

  // Phiên đọc 7 ngày gần nhất
  const readSessions7d = readingSessions30d.filter((s) => s.createdAt >= start7d);
  const session7dMap = new Map<string, number>();
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(start7d);
    d.setUTCDate(d.getUTCDate() + offset);
    session7dMap.set(utcDateKey(d), 0);
  }
  for (const session of readSessions7d) {
    const key = utcDateKey(session.createdAt);
    if (session7dMap.has(key)) {
      session7dMap.set(key, (session7dMap.get(key) ?? 0) + 1);
    }
  }
  const readSessions: BookReadStat[] = Array.from(session7dMap.entries()).map(([key, count]) => ({
    date: key,
    label: dateLabel(new Date(key + "T00:00:00Z")),
    sessions: count,
  }));

  // Người dùng duy nhất có lượt xem sách trong 30 ngày.
  const viewerIds = new Set<string>();
  for (const event of viewEvents) if (event.userId) viewerIds.add(event.userId);

  const readerIds = new Set<string>();
  for (const s of readingSessions30d) if (s.userId) readerIds.add(s.userId);

  const totalRevenue30d = orders30d
    .filter((o) => o.status === OrderStatus.PAID)
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  return {
    categoryViews,
    inventory,
    topViewedBooks,
    orderStatus,
    registrations,
    dailyActivity,
    readSessions,
    interactionBreakdown,
    summary: {
      totalInteractions30d,
      totalViews30d: (typeMap.get("VIEW") ?? 0),
      totalReadingSessions30d: readingSessions30d.length,
      totalReadSessions7d: readSessions7d.length,
      totalNewUsers30d: newUsers30d.length,
      totalOrders30d,
      totalRevenue30d,
      trackedViewers30d: viewerIds.size,
      activeReaders30d: readerIds.size,
      consentingUsers,
      totalActiveListings: activeInventory._count.id,
      totalInventoryUnits: activeInventory._sum.stock ?? 0,
      catalogStoreStockUnits: catalogStoreInventory._sum.stock ?? 0,
      catalogStoreTitles: catalogStoreInventory._count.id,
      lowStockListings,
      generatedAt: now,
    },
  };
}

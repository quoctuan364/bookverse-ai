import { createReadStream, existsSync } from "node:fs";
import path from "node:path";

import bcrypt from "bcrypt";
import {
  BookFormat,
  InteractionType,
  ListingCondition,
  ListingStatus,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PostStatus,
  Prisma,
  PrismaClient,
  TargetType,
  UserRole
} from "@prisma/client";
import csv from "csv-parser";
import { DEMO_ACCOUNT_EMAILS } from "../lib/demo-accounts";

type RawCsvRow = Record<string, string>;
type BookSeedInfo = {
  price: number;
  coverPath: string | null;
};

const prisma = new PrismaClient();
const DEMO_PASSWORD = "123456";
const color = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m"
};

const demoDataDir = process.env.DEMO_DATA_DIR
  ? path.resolve(process.env.DEMO_DATA_DIR)
  : path.resolve(process.cwd(), "data", "demo");

function demoUserEmail(userId: string): string {
  return (
    DEMO_ACCOUNT_EMAILS[userId as keyof typeof DEMO_ACCOUNT_EMAILS] ??
    `${userId.toLowerCase()}@bookverse.local`
  );
}

function ok(message: string): void {
  console.log(`${color.green}[OK] ${message}${color.reset}`);
}

function warn(message: string): void {
  console.log(`${color.yellow}[WARN] ${message}${color.reset}`);
}

function fail(message: string): void {
  console.log(`${color.red}[ERR] ${message}${color.reset}`);
}

function normalizeRow(row: unknown): RawCsvRow {
  if (!row || typeof row !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/^\uFEFF/, "").trim(),
      String(value ?? "").trim()
    ])
  );
}

function required(row: RawCsvRow, key: string): string {
  const value = row[key];
  if (!value) {
    throw new Error(`CSV thiếu cột bắt buộc: ${key}`);
  }
  return value;
}

function optional(row: RawCsvRow, key: string): string | null {
  const value = row[key];
  return value ? value : null;
}

function toInt(value: string | null, fallback = 0): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toNumber(value: string | null, fallback = 0): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toBoolean(value: string | null): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

function toDate(value: string | null): Date {
  if (!value) {
    return new Date();
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function splitList(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "item";
}

async function readCsv(fileName: string): Promise<RawCsvRow[]> {
  const filePath = path.join(demoDataDir, fileName);

  if (!existsSync(filePath)) {
    warn(`Bỏ qua ${fileName} vì không tìm thấy file.`);
    return [];
  }

  return new Promise<RawCsvRow[]>((resolve, reject) => {
    const rows: RawCsvRow[] = [];

    createReadStream(filePath)
      .pipe(csv())
      .on("data", (row: unknown) => rows.push(normalizeRow(row)))
      .on("error", reject)
      .on("end", () => resolve(rows));
  });
}

function mapBookFormat(value: string | null): BookFormat {
  switch (value?.toLowerCase()) {
    case "paper":
      return BookFormat.PAPER;
    case "both":
      return BookFormat.BOTH;
    default:
      return BookFormat.EBOOK;
  }
}

function mapUserRole(value: string | null, isSeller: boolean): UserRole {
  if (isSeller) {
    return UserRole.SELLER;
  }

  switch (value?.toLowerCase()) {
    case "seller":
      return UserRole.SELLER;
    case "moderator":
      return UserRole.MODERATOR;
    case "admin":
      return UserRole.ADMIN;
    default:
      return UserRole.BUYER;
  }
}

function mapListingCondition(value: string | null): ListingCondition {
  switch (value?.toLowerCase()) {
    case "new":
      return ListingCondition.NEW;
    case "like_new":
      return ListingCondition.LIKE_NEW;
    case "used_fair":
      return ListingCondition.FAIR;
    case "used_poor":
      return ListingCondition.POOR;
    case "ebook":
    case "digital":
      return ListingCondition.DIGITAL;
    default:
      return ListingCondition.GOOD;
  }
}

function mapListingStatus(value: string | null): ListingStatus {
  switch (value?.toLowerCase()) {
    case "approved":
      return ListingStatus.APPROVED;
    case "rejected":
      return ListingStatus.REJECTED;
    case "sold":
      return ListingStatus.SOLD;
    case "archived":
      return ListingStatus.ARCHIVED;
    case "draft":
      return ListingStatus.DRAFT;
    default:
      return ListingStatus.PENDING_REVIEW;
  }
}

function mapOrderStatus(value: string | null): OrderStatus {
  switch (value?.toLowerCase()) {
    case "paid":
      return OrderStatus.PAID;
    case "paid_demo":
      return OrderStatus.PAID_DEMO;
    case "shipped":
      return OrderStatus.SHIPPED;
    case "completed":
      return OrderStatus.COMPLETED;
    case "cancelled":
      return OrderStatus.CANCELLED;
    case "refunded":
      return OrderStatus.REFUNDED;
    default:
      return OrderStatus.PENDING;
  }
}

function mapPostStatus(value: string | null): PostStatus {
  switch (value?.toLowerCase()) {
    case "draft":
      return PostStatus.DRAFT;
    case "hidden":
    case "pending_review":
    case "archived":
      return PostStatus.HIDDEN;
    case "removed":
      return PostStatus.REMOVED;
    default:
      return PostStatus.PUBLISHED;
  }
}

function mapInteractionType(value: string | null): InteractionType {
  switch (value?.toLowerCase()) {
    case "read":
      return InteractionType.READ;
    case "cart_add":
      return InteractionType.CART_ADD;
    case "purchase":
      return InteractionType.PURCHASE;
    case "like":
      return InteractionType.LIKE;
    case "rate":
      return InteractionType.RATE;
    case "search":
      return InteractionType.SEARCH;
    case "bookmark":
      return InteractionType.BOOKMARK;
    case "highlight":
      return InteractionType.HIGHLIGHT;
    case "review":
      return InteractionType.REVIEW;
    default:
      return InteractionType.VIEW;
  }
}

async function ensureBookTag(tagName: string): Promise<{ slug: string }> {
  const slug = slugify(tagName);

  await prisma.bookTag.upsert({
    where: { slug },
    update: { name: tagName },
    create: {
      id: `TAG-${slug}`,
      name: tagName,
      slug
    }
  });

  return { slug };
}

function buildDemoShipping(userId: string): {
  shippingSnapshot: Prisma.InputJsonObject;
  shippingFullName: string;
  shippingPhone: string;
  shippingProvince: string;
  shippingDistrict: string;
  shippingWard: string;
  shippingAddressLine: string;
  shippingNote: string;
} {
  const numericSeed = Array.from(userId).reduce((total, character) => total + character.charCodeAt(0), 0);
  const phoneSuffix = String(100000 + (numericSeed % 899999));
  const shippingFullName = `Người nhận ${userId}`;
  const shippingPhone = `09${phoneSuffix}`;
  const shippingProvince = "TP. Hồ Chí Minh";
  const shippingDistrict = `Quận ${1 + (numericSeed % 12)}`;
  const shippingWard = `Phường ${1 + (numericSeed % 20)}`;
  const shippingAddressLine = `${12 + (numericSeed % 88)} Đường BookVerse`;
  const shippingNote = "Dữ liệu demo từ seed.";

  return {
    shippingSnapshot: {
      addressId: `ADDR-${userId}-DEFAULT`,
      fullName: shippingFullName,
      phone: shippingPhone,
      province: shippingProvince,
      district: shippingDistrict,
      ward: shippingWard,
      addressLine: shippingAddressLine,
      note: shippingNote,
    },
    shippingFullName,
    shippingPhone,
    shippingProvince,
    shippingDistrict,
    shippingWard,
    shippingAddressLine,
    shippingNote,
  };
}

async function importCategoriesAndBooks(
  bookRows: RawCsvRow[]
): Promise<Map<string, BookSeedInfo>> {
  const categoryIds = new Map<string, string>();
  const bookInfoById = new Map<string, BookSeedInfo>();
  const genres = [...new Set(bookRows.map((row) => required(row, "genre")))];

  for (const genre of genres) {
    const slug = slugify(genre);
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name: genre },
      create: {
        id: `CAT-${slug}`,
        name: genre,
        slug,
        description: `Danh mục sách ${genre}`
      }
    });

    categoryIds.set(genre, category.id);
  }

  ok(`Đã import ${genres.length} category.`);

  for (const row of bookRows) {
    const bookId = required(row, "book_id");
    const title = required(row, "title");
    const genre = required(row, "genre");
    const categoryId = categoryIds.get(genre);
    const price = toNumber(optional(row, "price"));
    const coverPath = optional(row, "cover_path");

    if (!categoryId) {
      throw new Error(`Không tìm thấy category cho sách ${bookId}`);
    }

    const tagConnections: { slug: string }[] = [];
    for (const tag of splitList(optional(row, "tags"))) {
      tagConnections.push(await ensureBookTag(tag));
    }

    await prisma.book.upsert({
      where: { id: bookId },
      update: {
        title,
        slug: `${slugify(title)}-${bookId.toLowerCase()}`,
        authorName: required(row, "author"),
        description: optional(row, "description"),
        level: optional(row, "level"),
        format: mapBookFormat(optional(row, "format")),
        price,
        rating: toNumber(optional(row, "rating")),
        pages: optional(row, "pages") ? toInt(optional(row, "pages")) : null,
        publishYear: optional(row, "publish_year")
          ? toInt(optional(row, "publish_year"))
          : null,
        isEbook: toBoolean(optional(row, "is_ebook")),
        // Đây là catalog synthetic dành riêng cho demo học thuật.
        isPubliclyVisible: true,
        coverPath,
        categoryId,
        tags: {
          set: tagConnections
        }
      },
      create: {
        id: bookId,
        title,
        slug: `${slugify(title)}-${bookId.toLowerCase()}`,
        authorName: required(row, "author"),
        description: optional(row, "description"),
        level: optional(row, "level"),
        format: mapBookFormat(optional(row, "format")),
        price,
        rating: toNumber(optional(row, "rating")),
        pages: optional(row, "pages") ? toInt(optional(row, "pages")) : null,
        publishYear: optional(row, "publish_year")
          ? toInt(optional(row, "publish_year"))
          : null,
        isEbook: toBoolean(optional(row, "is_ebook")),
        // Không thay CSV nguồn; chỉ bật bản ghi đã seed trong database demo.
        isPubliclyVisible: true,
        coverPath,
        categoryId,
        tags: {
          connect: tagConnections
        }
      }
    });

    bookInfoById.set(bookId, { price, coverPath });
  }

  ok(`Đã import ${bookRows.length} book và tag.`);
  return bookInfoById;
}

async function importUsers(userRows: RawCsvRow[], sellerIds: Set<string>): Promise<void> {
  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const row of userRows) {
    const userId = required(row, "user_id");
    const role = mapUserRole(optional(row, "role"), sellerIds.has(userId));

    await prisma.user.upsert({
      where: { id: userId },
      update: {
        name: required(row, "name"),
        email: demoUserEmail(userId),
        password: demoPasswordHash,
        role,
        profile: {
          upsert: {
            update: {
              persona: optional(row, "persona"),
              preferredGenres: splitList(optional(row, "preferred_genres")),
              level: optional(row, "level"),
              budget: optional(row, "budget") ? toNumber(optional(row, "budget")) : null,
              dailyReadingGoalMinutes: 30,
              dailyReadingGoalPages: 20
            },
            create: {
              persona: optional(row, "persona"),
              preferredGenres: splitList(optional(row, "preferred_genres")),
              level: optional(row, "level"),
              budget: optional(row, "budget") ? toNumber(optional(row, "budget")) : null,
              dailyReadingGoalMinutes: 30,
              dailyReadingGoalPages: 20
            }
          }
        }
      },
      create: {
        id: userId,
        name: required(row, "name"),
        email: demoUserEmail(userId),
        password: demoPasswordHash,
        role,
        profile: {
          create: {
            persona: optional(row, "persona"),
            preferredGenres: splitList(optional(row, "preferred_genres")),
            level: optional(row, "level"),
            budget: optional(row, "budget") ? toNumber(optional(row, "budget")) : null,
            dailyReadingGoalMinutes: 30,
            dailyReadingGoalPages: 20
          }
        }
      }
    });
  }

  ok(`Đã import ${userRows.length} user và profile.`);
}

async function importListings(
  listingRows: RawCsvRow[],
  bookInfoById: Map<string, BookSeedInfo>
): Promise<void> {
  for (const row of listingRows) {
    const listingId = required(row, "listing_id");
    const bookId = required(row, "book_id");
    const title = required(row, "title");
    const hasCover = toBoolean(optional(row, "has_cover"));

    await prisma.listing.upsert({
      where: { id: listingId },
      update: {
        sellerId: required(row, "seller_id"),
        bookId,
        title,
        description: optional(row, "description"),
        condition: mapListingCondition(optional(row, "condition")),
        price: toNumber(optional(row, "price")),
        status: mapListingStatus(optional(row, "status")),
        tags: splitList(optional(row, "tags")),
        hasCover,
        targetAudience: optional(row, "target_audience"),
        views: toInt(optional(row, "views")),
        cartAdds: toInt(optional(row, "cart_adds")),
        purchases: toInt(optional(row, "purchases")),
        createdAt: toDate(optional(row, "created_at"))
      },
      create: {
        id: listingId,
        sellerId: required(row, "seller_id"),
        bookId,
        title,
        description: optional(row, "description"),
        condition: mapListingCondition(optional(row, "condition")),
        price: toNumber(optional(row, "price")),
        status: mapListingStatus(optional(row, "status")),
        tags: splitList(optional(row, "tags")),
        hasCover,
        targetAudience: optional(row, "target_audience"),
        views: toInt(optional(row, "views")),
        cartAdds: toInt(optional(row, "cart_adds")),
        purchases: toInt(optional(row, "purchases")),
        createdAt: toDate(optional(row, "created_at"))
      }
    });

    const coverPath = bookInfoById.get(bookId)?.coverPath;
    if (hasCover && coverPath) {
      await prisma.listingImage.upsert({
        where: { id: `IMG-${listingId}-0` },
        update: {
          url: coverPath,
          altText: title,
          sortOrder: 0
        },
        create: {
          id: `IMG-${listingId}-0`,
          listingId,
          url: coverPath,
          altText: title,
          sortOrder: 0
        }
      });
    }
  }

  ok(`Đã import ${listingRows.length} listing marketplace.`);
}

async function importOrders(
  orderRows: RawCsvRow[],
  bookInfoById: Map<string, BookSeedInfo>
): Promise<void> {
  for (const row of orderRows) {
    const orderId = required(row, "order_id");
    const bookId = required(row, "book_id");
    const quantity = toInt(optional(row, "quantity"), 1);
    const totalAmount = toNumber(optional(row, "total_amount"));
    const unitPrice = quantity > 0 ? totalAmount / quantity : totalAmount;
    const shipping = buildDemoShipping(required(row, "user_id"));

    await prisma.order.upsert({
      where: { id: orderId },
      update: {
        buyerId: required(row, "user_id"),
        totalAmount,
        status: mapOrderStatus(optional(row, "status")),
        paymentMethod: PaymentMethod.COD,
        ...shipping,
        createdAt: toDate(optional(row, "created_at"))
      },
      create: {
        id: orderId,
        buyerId: required(row, "user_id"),
        totalAmount,
        status: mapOrderStatus(optional(row, "status")),
        paymentMethod: PaymentMethod.COD,
        ...shipping,
        createdAt: toDate(optional(row, "created_at"))
      }
    });

    await prisma.orderItem.upsert({
      where: { id: `OI-${orderId}-${bookId}` },
      update: {
        quantity,
        unitPrice,
        totalPrice: totalAmount
      },
      create: {
        id: `OI-${orderId}-${bookId}`,
        orderId,
        bookId,
        quantity,
        unitPrice: bookInfoById.get(bookId)?.price ?? unitPrice,
        totalPrice: totalAmount
      }
    });
  }

  ok(`Đã import ${orderRows.length} order và order item.`);
}

async function importPosts(postRows: RawCsvRow[]): Promise<void> {
  for (const row of postRows) {
    const postId = required(row, "post_id");

    await prisma.post.upsert({
      where: { id: postId },
      update: {
        authorId: required(row, "user_id"),
        bookId: optional(row, "book_id"),
        title: required(row, "title"),
        content: required(row, "content"),
        tags: splitList(optional(row, "tags")),
        reactionCount: toInt(optional(row, "reactions")),
        commentCount: toInt(optional(row, "comments")),
        reportCount: toInt(optional(row, "reports")),
        status: mapPostStatus(optional(row, "status")),
        createdAt: toDate(optional(row, "created_at"))
      },
      create: {
        id: postId,
        authorId: required(row, "user_id"),
        bookId: optional(row, "book_id"),
        title: required(row, "title"),
        content: required(row, "content"),
        tags: splitList(optional(row, "tags")),
        reactionCount: toInt(optional(row, "reactions")),
        commentCount: toInt(optional(row, "comments")),
        reportCount: toInt(optional(row, "reports")),
        status: mapPostStatus(optional(row, "status")),
        createdAt: toDate(optional(row, "created_at"))
      }
    });
  }

  ok(`Đã import ${postRows.length} bài viết community.`);
}

async function importInteractions(interactionRows: RawCsvRow[]): Promise<void> {
  for (const row of interactionRows) {
    const eventId = required(row, "event_id");
    const bookId = optional(row, "book_id");
    const query = optional(row, "query");
    const targetType = bookId ? TargetType.BOOK : TargetType.SEARCH_QUERY;
    const targetId = bookId ?? query ?? eventId;
    const metadata = query
      ? ({ query } satisfies Prisma.InputJsonObject)
      : Prisma.JsonNull;

    await prisma.interaction.upsert({
      where: { id: eventId },
      update: {
        userId: required(row, "user_id"),
        type: mapInteractionType(optional(row, "event_type")),
        targetType,
        targetId,
        bookId,
        query,
        minutesRead: toInt(optional(row, "minutes_read")),
        progressPercent: toNumber(optional(row, "progress_percent")),
        metadata,
        createdAt: toDate(optional(row, "event_time"))
      },
      create: {
        id: eventId,
        userId: required(row, "user_id"),
        type: mapInteractionType(optional(row, "event_type")),
        targetType,
        targetId,
        bookId,
        query,
        minutesRead: toInt(optional(row, "minutes_read")),
        progressPercent: toNumber(optional(row, "progress_percent")),
        metadata,
        createdAt: toDate(optional(row, "event_time"))
      }
    });
  }

  ok(`Đã import ${interactionRows.length} interaction hành vi.`);
}

async function importReviews(reviewRows: RawCsvRow[]): Promise<void> {
  for (const row of reviewRows) {
    const reviewId = required(row, "review_id");
    const bookId = required(row, "book_id");
    const userId = required(row, "user_id");
    const rating = toInt(optional(row, "rating"));
    const reviewText = optional(row, "review_text");
    const createdAt = toDate(optional(row, "created_at"));
    const metadata = reviewText
      ? ({ reviewText } satisfies Prisma.InputJsonObject)
      : Prisma.JsonNull;

    await prisma.review.upsert({
      where: { id: reviewId },
      update: {
        userId,
        bookId,
        rating,
        reviewText,
        createdAt
      },
      create: {
        id: reviewId,
        userId,
        bookId,
        rating,
        reviewText,
        createdAt
      }
    });

    await prisma.interaction.upsert({
      where: { id: `IR-${reviewId}` },
      update: {
        userId,
        type: InteractionType.RATE,
        targetType: TargetType.BOOK,
        targetId: bookId,
        bookId,
        value: rating,
        metadata,
        createdAt
      },
      create: {
        id: `IR-${reviewId}`,
        userId,
        type: InteractionType.RATE,
        targetType: TargetType.BOOK,
        targetId: bookId,
        bookId,
        value: rating,
        metadata,
        createdAt
      }
    });
  }

  ok(`Đã import ${reviewRows.length} review và interaction RATE.`);
}

async function importReadingProgress(progressRows: RawCsvRow[]): Promise<void> {
  for (const row of progressRows) {
    const userId = required(row, "user_id");
    const bookId = required(row, "book_id");
    const currentPage = toInt(optional(row, "current_page"));
    const progressPercent = toNumber(optional(row, "progress_percent"));
    const totalMinutes = toInt(optional(row, "total_minutes"));
    const lastReadAt = optional(row, "last_read_at")
      ? toDate(optional(row, "last_read_at"))
      : null;
    const metadata = { currentPage } satisfies Prisma.InputJsonObject;

    await prisma.readingProgress.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId
        }
      },
      update: {
        currentPage,
        progressPercent,
        totalMinutes,
        lastReadAt
      },
      create: {
        userId,
        bookId,
        currentPage,
        progressPercent,
        totalMinutes,
        lastReadAt
      }
    });

    await prisma.interaction.upsert({
      where: { id: `RP-${userId}-${bookId}` },
      update: {
        userId,
        type: InteractionType.READ,
        targetType: TargetType.BOOK,
        targetId: bookId,
        bookId,
        minutesRead: totalMinutes,
        progressPercent,
        metadata,
        createdAt: lastReadAt ?? new Date()
      },
      create: {
        id: `RP-${userId}-${bookId}`,
        userId,
        type: InteractionType.READ,
        targetType: TargetType.BOOK,
        targetId: bookId,
        bookId,
        minutesRead: totalMinutes,
        progressPercent,
        metadata,
        createdAt: lastReadAt ?? new Date()
      }
    });
  }

  ok(`Đã import ${progressRows.length} reading progress và interaction READ.`);
}

async function ensurePhase2DemoData(): Promise<void> {
  const [users, books] = await Promise.all([
    prisma.user.findMany({
      orderBy: {
        createdAt: "asc"
      },
      take: 8
    }),
    prisma.book.findMany({
      orderBy: {
        createdAt: "asc"
      },
      take: 8
    })
  ]);

  for (const user of users) {
    const shipping = buildDemoShipping(user.id);
    await prisma.shippingAddress.upsert({
      where: {
        id: `ADDR-${user.id}-DEFAULT`
      },
      update: {
        fullName: user.name,
        phone: shipping.shippingPhone,
        province: shipping.shippingProvince,
        district: shipping.shippingDistrict,
        ward: shipping.shippingWard,
        addressLine: shipping.shippingAddressLine,
        note: "Địa chỉ mặc định dùng cho demo checkout.",
        isDefault: true
      },
      create: {
        id: `ADDR-${user.id}-DEFAULT`,
        userId: user.id,
        fullName: user.name,
        phone: shipping.shippingPhone,
        province: shipping.shippingProvince,
        district: shipping.shippingDistrict,
        ward: shipping.shippingWard,
        addressLine: shipping.shippingAddressLine,
        note: "Địa chỉ mặc định dùng cho demo checkout.",
        isDefault: true
      }
    });

    await prisma.notification.upsert({
      where: {
        id: `NTF-${user.id}-PHASE2`
      },
      update: {
        title: "Profile Phase 2 đã sẵn sàng",
        message: "Bạn có thể cập nhật hồ sơ, thêm địa chỉ và checkout với snapshot giao hàng.",
        type: NotificationType.SYSTEM,
        href: "/profile"
      },
      create: {
        id: `NTF-${user.id}-PHASE2`,
        userId: user.id,
        title: "Profile Phase 2 đã sẵn sàng",
        message: "Bạn có thể cập nhật hồ sơ, thêm địa chỉ và checkout với snapshot giao hàng.",
        type: NotificationType.SYSTEM,
        href: "/profile"
      }
    });
  }

  for (const [index, book] of books.entries()) {
    const user = users[index % Math.max(users.length, 1)];
    if (!user) {
      continue;
    }

    await prisma.favoriteBook.upsert({
      where: {
        userId_bookId: {
          userId: user.id,
          bookId: book.id
        }
      },
      update: {},
      create: {
        id: `FAV-${user.id}-${book.id}`,
        userId: user.id,
        bookId: book.id
      }
    });
  }

  ok("Đã bổ sung dữ liệu demo Phase 2: shipping address, favorite và notification.");
}

async function ensurePhase3SellerDemoData(): Promise<void> {
  const [seller, buyer, books] = await Promise.all([
    prisma.user.findFirst({
      where: {
        role: UserRole.SELLER
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true,
        name: true
      }
    }),
    prisma.user.findFirst({
      where: {
        role: UserRole.BUYER
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true,
        name: true
      }
    }),
    prisma.book.findMany({
      orderBy: {
        createdAt: "asc"
      },
      take: 4,
      select: {
        id: true,
        title: true,
        coverPath: true
      }
    })
  ]);

  if (!seller || !buyer || books.length < 3) {
    warn("Bỏ qua dữ liệu demo Phase 3 vì thiếu seller, buyer hoặc book.");
    return;
  }

  const listingSeeds = [
    {
      id: `PH3-LIST-${seller.id}-APPROVED`,
      book: books[0],
      title: `Seller demo - ${books[0].title}`,
      description:
        "Sách demo cho Seller Dashboard, còn mới, không rách trang, phù hợp để kiểm tra luồng duyệt listing và mua hàng.",
      price: 128000,
      status: ListingStatus.APPROVED,
      condition: ListingCondition.LIKE_NEW,
      reportCount: 0,
      views: 42,
      cartAdds: 9,
      purchases: 3,
      targetAudience: "Sinh viên và người cần sách tham khảo nhanh",
      rejectionReason: null,
      moderationNote: "Listing demo đã duyệt."
    },
    {
      id: `PH3-LIST-${seller.id}-PENDING`,
      book: books[1],
      title: `Chờ duyệt - ${books[1].title}`,
      description:
        "Listing demo đang chờ admin duyệt, dùng để kiểm tra trạng thái pending trong Seller Dashboard và Admin Center.",
      price: 99000,
      status: ListingStatus.PENDING_REVIEW,
      condition: ListingCondition.GOOD,
      reportCount: 0,
      views: 12,
      cartAdds: 2,
      purchases: 0,
      targetAudience: "Độc giả muốn mua sách cũ giá tốt",
      rejectionReason: null,
      moderationNote: null
    },
    {
      id: `PH3-LIST-${seller.id}-HIDDEN`,
      book: books[2],
      title: `Đã ẩn - ${books[2].title}`,
      description:
        "Listing demo đã bị seller ẩn khỏi marketplace, có thể gửi duyệt lại từ trang chỉnh sửa listing.",
      price: 76000,
      status: ListingStatus.HIDDEN,
      condition: ListingCondition.FAIR,
      reportCount: 1,
      views: 21,
      cartAdds: 1,
      purchases: 0,
      targetAudience: "Người đọc chấp nhận sách đã qua sử dụng",
      rejectionReason: null,
      moderationNote: "Seller tự ẩn để kiểm tra flow."
    },
    {
      id: `PH3-LIST-${seller.id}-REJECTED`,
      book: books[3] ?? books[0],
      title: `Bị từ chối - ${(books[3] ?? books[0]).title}`,
      description:
        "Listing demo bị từ chối để seller nhìn thấy lý do kiểm duyệt và chỉnh sửa rồi gửi lại.",
      price: 54000,
      status: ListingStatus.REJECTED,
      condition: ListingCondition.POOR,
      reportCount: 0,
      views: 8,
      cartAdds: 0,
      purchases: 0,
      targetAudience: "Demo kiểm duyệt marketplace",
      rejectionReason: "Ảnh tình trạng sách chưa đủ rõ.",
      moderationNote: "Cần bổ sung ảnh thật trước khi duyệt."
    }
  ];

  for (const listing of listingSeeds) {
    await prisma.listing.upsert({
      where: {
        id: listing.id
      },
      update: {
        sellerId: seller.id,
        bookId: listing.book.id,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        condition: listing.condition,
        status: listing.status,
        reportCount: listing.reportCount,
        views: listing.views,
        cartAdds: listing.cartAdds,
        purchases: listing.purchases,
        hasCover: Boolean(listing.book.coverPath),
        targetAudience: listing.targetAudience,
        rejectionReason: listing.rejectionReason,
        moderationNote: listing.moderationNote,
        reviewedAt:
          listing.status === ListingStatus.APPROVED || listing.status === ListingStatus.REJECTED ? new Date() : null,
        hiddenAt: listing.status === ListingStatus.HIDDEN ? new Date() : null
      },
      create: {
        id: listing.id,
        sellerId: seller.id,
        bookId: listing.book.id,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        condition: listing.condition,
        status: listing.status,
        reportCount: listing.reportCount,
        views: listing.views,
        cartAdds: listing.cartAdds,
        purchases: listing.purchases,
        hasCover: Boolean(listing.book.coverPath),
        targetAudience: listing.targetAudience,
        rejectionReason: listing.rejectionReason,
        moderationNote: listing.moderationNote,
        reviewedAt:
          listing.status === ListingStatus.APPROVED || listing.status === ListingStatus.REJECTED ? new Date() : null,
        hiddenAt: listing.status === ListingStatus.HIDDEN ? new Date() : null
      }
    });

    if (listing.book.coverPath) {
      await prisma.listingImage.upsert({
        where: {
          id: `PH3-IMG-${listing.id}`
        },
        update: {
          url: listing.book.coverPath,
          altText: listing.title,
          sortOrder: 0
        },
        create: {
          id: `PH3-IMG-${listing.id}`,
          listingId: listing.id,
          url: listing.book.coverPath,
          altText: listing.title,
          sortOrder: 0
        }
      });
    }
  }

  const orderSeeds = [
    {
      id: `PH4-ORDER-${seller.id}-PENDING`,
      listing: listingSeeds[0],
      status: OrderStatus.PENDING,
      paymentMethod: PaymentMethod.COD,
      quantity: 1,
      note: "Đơn COD đang PENDING để buyer demo hủy hoặc admin xác nhận PAID."
    },
    {
      id: `PH4-ORDER-${seller.id}-PAID`,
      listing: listingSeeds[0],
      status: OrderStatus.PAID,
      paymentMethod: PaymentMethod.BANK_TRANSFER_DEMO,
      quantity: 1,
      note: "Đơn PAID demo để seller chuyển sang SHIPPED."
    },
    {
      id: `PH3-ORDER-${seller.id}-PAID`,
      listing: listingSeeds[0],
      status: OrderStatus.PAID_DEMO,
      paymentMethod: PaymentMethod.WALLET_DEMO,
      quantity: 1,
      note: "Buyer đã thanh toán demo, seller có thể chuyển sang đang giao."
    },
    {
      id: `PH3-ORDER-${seller.id}-SHIPPED`,
      listing: listingSeeds[0],
      status: OrderStatus.SHIPPED,
      paymentMethod: PaymentMethod.COD,
      quantity: 1,
      note: "Seller đã giao hàng, có thể hoàn tất đơn."
    },
    {
      id: `PH3-ORDER-${seller.id}-COMPLETED`,
      listing: listingSeeds[0],
      status: OrderStatus.COMPLETED,
      paymentMethod: PaymentMethod.BANK_TRANSFER_DEMO,
      quantity: 2,
      note: "Đơn completed demo để tính doanh thu."
    },
    {
      id: `PH3-ORDER-${seller.id}-CANCELLED`,
      listing: listingSeeds[0],
      status: OrderStatus.CANCELLED,
      paymentMethod: PaymentMethod.COD,
      quantity: 1,
      note: "Đơn cancelled demo để ảnh hưởng seller score."
    }
  ];

  for (const [index, order] of orderSeeds.entries()) {
    const totalAmount = order.listing.price * order.quantity;
    const shipping = buildDemoShipping(buyer.id);

    await prisma.order.upsert({
      where: {
        id: order.id
      },
      update: {
        buyerId: buyer.id,
        status: order.status,
        paymentMethod: order.paymentMethod,
        totalAmount,
        ...shipping,
        createdAt: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000)
      },
      create: {
        id: order.id,
        buyerId: buyer.id,
        status: order.status,
        paymentMethod: order.paymentMethod,
        totalAmount,
        ...shipping,
        createdAt: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000)
      }
    });

    await prisma.orderItem.upsert({
      where: {
        id: `PH3-OI-${order.id}`
      },
      update: {
        bookId: order.listing.book.id,
        listingId: order.listing.id,
        quantity: order.quantity,
        unitPrice: order.listing.price,
        totalPrice: totalAmount
      },
      create: {
        id: `PH3-OI-${order.id}`,
        orderId: order.id,
        bookId: order.listing.book.id,
        listingId: order.listing.id,
        quantity: order.quantity,
        unitPrice: order.listing.price,
        totalPrice: totalAmount
      }
    });

    await prisma.orderTimelineEvent.upsert({
      where: {
        id: `PH3-TL-${order.id}-${order.status}`
      },
      update: {
        actorId: seller.id,
        status: order.status,
        note: order.note
      },
      create: {
        id: `PH3-TL-${order.id}-${order.status}`,
        orderId: order.id,
        actorId: seller.id,
        status: order.status,
        note: order.note,
        metadata: {
          source: "phase3_seed"
        }
      }
    });
  }

  const notifications = [
    {
      id: `NTF-${seller.id}-PHASE3-LISTING`,
      title: "Seller Dashboard Phase 3 đã sẵn sàng",
      message: "Bạn có listing demo ở các trạng thái approved, pending, hidden và rejected.",
      type: NotificationType.MARKETPLACE,
      href: "/seller/listings"
    },
    {
      id: `NTF-${seller.id}-PHASE3-ORDER`,
      title: "Đơn demo cần seller xử lý",
      message: "Mở Seller Orders để chuyển đơn PAID_DEMO sang SHIPPED.",
      type: NotificationType.ORDER,
      href: `/seller/orders/PH3-ORDER-${seller.id}-PAID`
    }
  ];

  for (const notification of notifications) {
    await prisma.notification.upsert({
      where: {
        id: notification.id
      },
      update: {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        href: notification.href
      },
      create: {
        id: notification.id,
        userId: seller.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        href: notification.href
      }
    });
  }

  ok("Đã bổ sung dữ liệu demo Phase 3: seller listing, order, timeline và notification.");
}

async function main(): Promise<void> {
  if (!existsSync(demoDataDir)) {
    throw new Error(`Không tìm thấy thư mục dữ liệu demo: ${demoDataDir}`);
  }

  console.log(`Đọc CSV từ: ${demoDataDir}`);

  const bookRows = await readCsv("books.csv");
  const userRows = await readCsv("users.csv");
  const listingRows = await readCsv("listings.csv");
  const orderRows = await readCsv("orders.csv");
  const postRows = await readCsv("community_posts.csv");
  const interactionRows = await readCsv("interactions.csv");
  const reviewRows = await readCsv("reviews.csv");
  const progressRows = await readCsv("reading_progress.csv");

  const sellerIds = new Set(listingRows.map((row) => required(row, "seller_id")));

  const bookInfoById = await importCategoriesAndBooks(bookRows);
  await importUsers(userRows, sellerIds);
  await importListings(listingRows, bookInfoById);
  await importOrders(orderRows, bookInfoById);
  await importPosts(postRows);
  await importInteractions(interactionRows);
  await importReviews(reviewRows);
  await importReadingProgress(progressRows);
  await ensurePhase2DemoData();
  await ensurePhase3SellerDemoData();

  ok("Seed dữ liệu BookVerse AI hoàn tất.");
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    fail(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


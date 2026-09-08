import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
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
  ReactionType,
  RecommendationEvidenceType,
  TargetType,
  UserRole,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  loadCategoryMapping,
  type LoadedCategoryMapping,
} from "@/lib/category-mapping-file";
import { assertSafeDatabase } from "@/lib/database-safety";
import { buildReadOnlyDryRunPlan, type DatasetReadRepository } from "@/lib/dataset-dry-run";
import { writeImportReport, type ImportReport } from "@/lib/dataset-import-report";
import {
  resolvePublishedYear,
  resolveRatingAverage,
  validateDataset,
  type DatasetValidationResult,
} from "@/lib/dataset-validation";

const DEFAULT_SOURCE_PATH = path.resolve(
  process.cwd(),
  "data",
  "json",
  "bookverse_ultra_seed_2200.json",
);
const DEMO_PASSWORD = "123456";
const BATCH_SIZE = 1_000;

interface SeedCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_id?: number | null;
  level?: number | null;
}

interface SeedTag {
  id: number;
  name: string;
  slug: string;
}

interface SeedAuthor {
  id: number;
  name: string;
}

interface SeedBook {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category_id: number;
  published_year?: number | string | null;
  publication_year?: number | string | null;
  page_count: number | null;
  price: number;
  ebook_price: number | null;
  format: string;
  reading_level: string | null;
  cover_url: string | null;
  rating_avg?: number | string | null;
  rating_average?: number | string | null;
  created_at: string;
}

interface SeedBookAuthor {
  book_id: number;
  author_id: number;
  role: string;
}

interface SeedBookTag {
  book_id: number;
  tag_id: number;
}

interface SeedEbook {
  id?: number;
  book_id: number;
}

interface SeedBookFile {
  id: number;
  ebook_id: number;
  file_url: string;
  json_url: string | null;
}

interface SeedUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface SeedProfile {
  user_id: number;
  bio: string | null;
  reading_goal: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_language: string | null;
}

interface SeedUserInterest {
  user_id: number;
  category_id: number;
  weight?: number;
  interest_score?: number;
}

interface SeedListing {
  id: number;
  book_id: number;
  seller_id: number;
  title?: string;
  description?: string | null;
  condition: string;
  price: number;
  status: string;
  view_count: number;
  cart_count: number;
  purchase_count: number;
  stock: number;
  created_at: string;
}

interface SeedOrder {
  id: number;
  buyer_id: number;
  status: string;
  total_amount: number;
  created_at: string;
}

interface SeedOrderItem {
  id: number;
  order_id: number;
  listing_id: number;
  book_id: number;
  quantity: number;
  unit_price: number;
  line_total?: number | null;
}

interface SeedReview {
  id: number;
  book_id: number;
  user_id: number;
  rating: number;
  title: string | null;
  content: string | null;
  created_at: string;
}

interface SeedReadingProgress {
  id: number;
  user_id: number;
  book_id: number;
  current_page: number;
  progress_percent?: number;
  percent_complete?: number;
  total_reading_minutes?: number;
  total_read_minutes?: number;
  updated_at?: string;
  last_read_at?: string;
}

interface SeedReadingSession {
  id: number;
  user_id: number;
  book_id: number;
  start_page: number;
  end_page: number;
  duration_minutes: number;
  created_at: string;
}

interface SeedBookmark {
  id: number;
  user_id: number;
  book_id: number;
  page: number;
  created_at: string;
}

interface SeedHighlight {
  id: number;
  user_id: number;
  book_id: number;
  page: number;
  content?: string;
  text?: string;
  note?: string | null;
  color: string | null;
  created_at: string;
}

interface SeedPost {
  id: number;
  user_id: number;
  book_id: number | null;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

interface SeedComment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  status: string;
  created_at: string;
}

interface SeedReaction {
  id: number;
  user_id: number;
  target_type: string;
  target_id: number;
  reaction_type?: string;
  reaction?: string;
  created_at: string;
}

interface SeedReport {
  target_type: string;
  target_id: number;
}

interface SeedInteractionEvent {
  id: number;
  user_id: number;
  book_id: number | null;
  event_type: string;
  metadata?: Prisma.InputJsonValue | null;
  metadata_json?: Prisma.InputJsonValue | null;
  created_at: string;
}

interface SeedRecommendation {
  id: number;
  user_id: number;
  book_id: number;
  rank: number;
  score: number;
  strategy?: string;
  algorithm?: string;
  reason: string | null;
  clicked?: boolean;
  created_at: string;
}

interface SeedRecommendationEvidence {
  id: number;
  recommendation_id: number;
  evidence_type: string;
  evidence_text?: string;
  description?: string;
  weight: number;
}

interface SeedDataset {
  meta: {
    name: string;
    version?: string;
    generated_at: string;
  };
  categories: SeedCategory[];
  tags: SeedTag[];
  authors: SeedAuthor[];
  books: SeedBook[];
  book_authors: SeedBookAuthor[];
  book_tags: SeedBookTag[];
  ebooks: SeedEbook[];
  book_files: SeedBookFile[];
  users: SeedUser[];
  profiles: SeedProfile[];
  user_interests: SeedUserInterest[];
  listings: SeedListing[];
  orders: SeedOrder[];
  order_items: SeedOrderItem[];
  reviews: SeedReview[];
  reading_progress: SeedReadingProgress[];
  reading_sessions: SeedReadingSession[];
  bookmarks: SeedBookmark[];
  highlights: SeedHighlight[];
  community_posts: SeedPost[];
  comments: SeedComment[];
  reactions: SeedReaction[];
  reports: SeedReport[];
  interaction_events: SeedInteractionEvent[];
  daily_recommendations: SeedRecommendation[];
  recommendation_evidence: SeedRecommendationEvidence[];
}

type CountResult = {
  count: number;
};

function id(prefix: string, value: number, width: number): string {
  return `${prefix}${String(value).padStart(width, "0")}`;
}

function categoryId(value: number): string {
  return id("C", value, 3);
}

function tagId(value: number): string {
  return id("T", value, 3);
}

function bookId(value: number): string {
  return id("B", value, 4);
}

function userId(value: number): string {
  return id("U", value, 4);
}

function listingId(value: number): string {
  return id("L", value, 5);
}

function orderId(value: number): string {
  return id("O", value, 5);
}

function orderItemId(value: number): string {
  return id("OI", value, 6);
}

function reviewId(value: number): string {
  return id("RV", value, 6);
}

function progressId(value: number): string {
  return id("RP", value, 6);
}

function sessionId(value: number): string {
  return id("RS", value, 6);
}

function bookmarkId(value: number): string {
  return id("BM", value, 6);
}

function highlightId(value: number): string {
  return id("HL", value, 6);
}

function postId(value: number): string {
  return id("P", value, 6);
}

function commentId(value: number): string {
  return id("CM", value, 6);
}

function reactionId(value: number): string {
  return id("R", value, 6);
}

function interactionEventId(value: number): string {
  return id("IE", value, 7);
}

function interactionId(value: number): string {
  return id("INT", value, 7);
}

function recommendationId(value: number): string {
  return id("REC", value, 6);
}

function evidenceId(value: number): string {
  return id("EVD", value, 7);
}

function toDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toNullableJson(value: Prisma.InputJsonValue | null): Prisma.InputJsonValue {
  return value ?? {};
}

function toMetadataObject(value: Prisma.InputJsonValue | null | undefined): Prisma.InputJsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Prisma.InputJsonObject)
    : {};
}

function buildDemoShipping(seedUserId: string): {
  shippingSnapshot: Prisma.InputJsonObject;
  shippingFullName: string;
  shippingPhone: string;
  shippingProvince: string;
  shippingDistrict: string;
  shippingWard: string;
  shippingAddressLine: string;
  shippingNote: string;
} {
  const numericSeed = Array.from(seedUserId).reduce((total, character) => total + character.charCodeAt(0), 0);
  const shippingFullName = `Người nhận ${seedUserId}`;
  const shippingPhone = `09${String(100000 + (numericSeed % 899999))}`;
  const shippingProvince = "TP. Hồ Chí Minh";
  const shippingDistrict = `Quận ${1 + (numericSeed % 12)}`;
  const shippingWard = `Phường ${1 + (numericSeed % 20)}`;
  const shippingAddressLine = `${12 + (numericSeed % 88)} Đường BookVerse`;
  const shippingNote = "Dữ liệu demo từ seed 2200.";

  return {
    shippingSnapshot: {
      addressId: `ADDR-${seedUserId}-DEFAULT`,
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

function mapUserRole(role: string): UserRole {
  switch (role) {
    case "SELLER":
      return UserRole.SELLER;
    case "ADMIN":
      return UserRole.ADMIN;
    case "MODERATOR":
      return UserRole.MODERATOR;
    default:
      return UserRole.BUYER;
  }
}

function mapBookFormat(format: string, hasEbook: boolean): BookFormat {
  if (format === "EBOOK") {
    return BookFormat.EBOOK;
  }

  if (hasEbook) {
    return BookFormat.BOTH;
  }

  return BookFormat.PAPER;
}

function mapListingCondition(condition: string): ListingCondition {
  switch (condition) {
    case "NEW":
      return ListingCondition.NEW;
    case "LIKE_NEW":
      return ListingCondition.LIKE_NEW;
    case "GOOD":
      return ListingCondition.GOOD;
    case "ACCEPTABLE":
      return ListingCondition.FAIR;
    case "EBOOK":
      return ListingCondition.DIGITAL;
    default:
      return ListingCondition.GOOD;
  }
}

function mapListingStatus(status: string): ListingStatus {
  switch (status) {
    case "APPROVED":
      return ListingStatus.APPROVED;
    case "REJECTED":
      return ListingStatus.REJECTED;
    case "PENDING":
      return ListingStatus.PENDING_REVIEW;
    default:
      return ListingStatus.PENDING_REVIEW;
  }
}

function mapOrderStatus(status: string): OrderStatus {
  switch (status) {
    case "PAID":
      return OrderStatus.PAID;
    case "CANCELLED":
      return OrderStatus.CANCELLED;
    case "REFUNDED":
      return OrderStatus.REFUNDED;
    default:
      return OrderStatus.PENDING;
  }
}

function mapPostStatus(status: string): PostStatus {
  return status === "APPROVED" ? PostStatus.PUBLISHED : PostStatus.HIDDEN;
}

function mapReactionType(type: string): ReactionType {
  switch (type) {
    case "LOVE":
      return ReactionType.LOVE;
    case "INSIGHTFUL":
      return ReactionType.INSIGHTFUL;
    case "THANKS":
      return ReactionType.SAVE;
    default:
      return ReactionType.LIKE;
  }
}

function mapActionType(type: string): string {
  switch (type) {
    case "VIEW_BOOK":
      return "VIEW";
    case "READ_PROGRESS":
    case "READ_START":
      return "READ";
    case "RECOMMENDATION_CLICK":
      return "RECOMMENDATION_CLICK";
    default:
      return type;
  }
}

function mapInteractionType(type: string): InteractionType | null {
  switch (mapActionType(type)) {
    case "VIEW":
      return InteractionType.VIEW;
    case "CART_ADD":
      return InteractionType.CART_ADD;
    case "PURCHASE":
      return InteractionType.PURCHASE;
    case "BOOKMARK":
      return InteractionType.BOOKMARK;
    case "HIGHLIGHT":
      return InteractionType.HIGHLIGHT;
    case "REVIEW":
      return InteractionType.REVIEW;
    case "SEARCH":
      return InteractionType.SEARCH;
    case "READ":
      return InteractionType.READ;
    case "REACTION":
      return InteractionType.LIKE;
    default:
      return null;
  }
}

function mapEvidenceType(type: string): RecommendationEvidenceType {
  switch (type) {
    case "CATEGORY_MATCH":
      return RecommendationEvidenceType.GENRE_MATCH;
    case "TAG_MATCH":
      return RecommendationEvidenceType.TAG_MATCH;
    case "POPULARITY_SIGNAL":
      return RecommendationEvidenceType.TRENDING;
    case "COMMUNITY_SIGNAL":
      return RecommendationEvidenceType.COLLABORATIVE;
    case "PURCHASE_HISTORY":
    case "READING_HISTORY":
      return RecommendationEvidenceType.BEHAVIOR_MATCH;
    default:
      return RecommendationEvidenceType.BEHAVIOR_MATCH;
  }
}

async function createManyInBatches<T>(
  label: string,
  rows: T[],
  insertBatch: (batch: T[]) => Promise<CountResult>,
): Promise<number> {
  let total = 0;

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const result = await insertBatch(batch);
    total += result.count;
  }

  console.log(`[OK] ${label}: ${total.toLocaleString("vi-VN")}/${rows.length.toLocaleString("vi-VN")}`);
  return total;
}

async function clearCurrentData(databaseUrl: string | undefined): Promise<void> {
  // Kiểm tra guard ngay trước lệnh destructive, không chỉ ở đầu CLI.
  assertSafeDatabase({
    operation: "destructive",
    databaseUrl,
  });
  console.log("[INFO] Đang dọn dữ liệu cũ trong PostgreSQL...");

  await prisma.recommendationEvidence.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.interactionEvent.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.highlight.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.favoriteBook.deleteMany();
  await prisma.readingSession.deleteMany();
  await prisma.readingProgress.deleteMany();
  await prisma.review.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderTimelineEvent.deleteMany();
  await prisma.order.deleteMany();
  await prisma.listingImage.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.shippingAddress.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.book.deleteMany();
  await prisma.bookTag.deleteMany();
  await prisma.category.deleteMany();

  console.log("[OK] Đã dọn dữ liệu cũ trong database.");
}

function buildBookAuthorMap(dataset: SeedDataset): Map<number, string> {
  const authorById = new Map(dataset.authors.map((author) => [author.id, author.name]));
  const bookToAuthorNames = new Map<number, string[]>();

  for (const item of dataset.book_authors) {
    const authorName = authorById.get(item.author_id);
    if (!authorName) {
      continue;
    }

    const names = bookToAuthorNames.get(item.book_id) ?? [];
    names.push(authorName);
    bookToAuthorNames.set(item.book_id, names);
  }

  return new Map(
    dataset.books.map((book) => [
      book.id,
      [...new Set(bookToAuthorNames.get(book.id) ?? [])].slice(0, 3).join(", ") || "Đang cập nhật",
    ]),
  );
}

function buildBookTagsMap(dataset: SeedDataset): Map<number, string[]> {
  const result = new Map<number, string[]>();

  for (const item of dataset.book_tags) {
    const tags = result.get(item.book_id) ?? [];
    tags.push(tagId(item.tag_id));
    result.set(item.book_id, tags);
  }

  return result;
}

function buildUserPreferredGenres(dataset: SeedDataset): Map<number, string[]> {
  const categoryNameById = new Map(dataset.categories.map((category) => [category.id, category.name]));
  const interestsByUser = new Map<number, SeedUserInterest[]>();

  for (const interest of dataset.user_interests) {
    const interests = interestsByUser.get(interest.user_id) ?? [];
    interests.push(interest);
    interestsByUser.set(interest.user_id, interests);
  }

  const result = new Map<number, string[]>();
  for (const [seedUserId, interests] of interestsByUser.entries()) {
    result.set(
      seedUserId,
      interests
        .sort(
          (left, right) =>
            (right.weight ?? right.interest_score ?? 0) -
            (left.weight ?? left.interest_score ?? 0),
        )
        .slice(0, 5)
        .map((interest) => categoryNameById.get(interest.category_id))
        .filter((name): name is string => Boolean(name)),
    );
  }

  return result;
}

function buildPostCounts(dataset: SeedDataset): Map<number, { comments: number; reactions: number; reports: number }> {
  const result = new Map<number, { comments: number; reactions: number; reports: number }>();

  function ensure(seedPostId: number): { comments: number; reactions: number; reports: number } {
    const current = result.get(seedPostId) ?? { comments: 0, reactions: 0, reports: 0 };
    result.set(seedPostId, current);
    return current;
  }

  for (const comment of dataset.comments) {
    ensure(comment.post_id).comments += 1;
  }

  for (const reaction of dataset.reactions) {
    if (reaction.target_type === "POST") {
      ensure(reaction.target_id).reactions += 1;
    }
  }

  for (const report of dataset.reports) {
    if (report.target_type === "POST") {
      ensure(report.target_id).reports += 1;
    }
  }

  return result;
}

async function importDataset(
  dataset: SeedDataset,
  categoryMapping: LoadedCategoryMapping | null,
): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const ebookBookIds = new Set(dataset.ebooks.map((ebook) => ebook.book_id));
  const authorNameByBookId = buildBookAuthorMap(dataset);
  const tagIdsByBookId = buildBookTagsMap(dataset);
  const preferredGenresByUserId = buildUserPreferredGenres(dataset);
  const postCounts = buildPostCounts(dataset);
  const bookById = new Map(dataset.books.map((book) => [book.id, book]));
  const reviewById = new Map(dataset.reviews.map((review) => [review.id, review]));

  console.log("[INFO] Đang upsert category trước khi nối hierarchy...");
  for (let index = 0; index < dataset.categories.length; index += 100) {
    const batch = dataset.categories.slice(index, index + 100);
    await Promise.all(
      batch.map((category) => {
        const id = categoryId(category.id);
        const mapping = categoryMapping?.entriesById.get(id);
        const data = {
          name: category.name,
          slug: category.slug,
          description: category.description,
          level: mapping?.level ?? category.level ?? null,
          canonicalKey: mapping?.canonicalKey ?? null,
          canonicalName: mapping?.canonicalName ?? null,
        };
        return prisma.category.upsert({
          where: { id },
          create: {
            id,
            ...data,
            parentId: null,
          },
          update: data,
        });
      }),
    );
  }
  console.log("[OK] categories: " + dataset.categories.length + "/" + dataset.categories.length);

  if (!categoryMapping) {
    console.warn("[WARN] Không có category canonical mapping; hierarchy/canonical field để null.");
  } else {
    console.log("[INFO] Đang nối parent category từ derived mapping...");
    for (let index = 0; index < categoryMapping.file.entries.length; index += 100) {
      const batch = categoryMapping.file.entries.slice(index, index + 100);
      await Promise.all(
        batch.map((entry) =>
          prisma.category.update({
            where: { id: entry.categoryId },
            data: {
              parentId: entry.parentId,
              level: entry.level,
              canonicalKey: entry.canonicalKey,
              canonicalName: entry.canonicalName,
            },
          }),
        ),
      );
    }
    console.log(
      "[OK] category hierarchy: " +
        categoryMapping.file.entries.length +
        "/" +
        categoryMapping.file.entries.length,
    );
  }

  await createManyInBatches(
    "book tags",
    dataset.tags.map((tag) => ({
      id: tagId(tag.id),
      name: tag.name,
      slug: tag.slug,
    })),
    (batch) => prisma.bookTag.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "users",
    dataset.users.map((user) => ({
      id: userId(user.id),
      email: user.email,
      password: passwordHash,
      name: user.name,
      role: mapUserRole(user.role),
      createdAt: toDate(user.created_at),
    })),
    (batch) => prisma.user.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "profiles",
    dataset.profiles.map((profile) => ({
      id: id("PF", profile.user_id, 6),
      userId: userId(profile.user_id),
      persona: profile.reading_goal,
      preferredGenres: preferredGenresByUserId.get(profile.user_id) ?? [],
      level: profile.preferred_language ? `Ngôn ngữ: ${profile.preferred_language}` : null,
      budget: profile.budget_max ?? profile.budget_min ?? null,
      bio: profile.bio,
      dailyReadingGoalMinutes: 30,
      dailyReadingGoalPages: 20,
    })),
    (batch) => prisma.profile.createMany({ data: batch, skipDuplicates: true }),
  );

  console.log("[INFO] Đang import " + dataset.books.length + " sách và nối tag...");
  for (let index = 0; index < dataset.books.length; index += 100) {
    const batch = dataset.books.slice(index, index + 100);
    await Promise.all(
      batch.map((book) => {
        const publishedYear = resolvePublishedYear(book as unknown as Record<string, unknown>).value;
        const ratingAverage = resolveRatingAverage(book as unknown as Record<string, unknown>).value;
        const connectedTags = (tagIdsByBookId.get(book.id) ?? []).map((seedTagId) => ({
          id: seedTagId,
        }));
        const bookData = {
            id: bookId(book.id),
            title: book.title,
            slug: book.slug,
            authorName: authorNameByBookId.get(book.id) ?? "Đang cập nhật",
            description: book.description,
            level: book.reading_level,
            format: mapBookFormat(book.format, ebookBookIds.has(book.id)),
            price: book.ebook_price ?? book.price,
            rating: ratingAverage,
            pages: book.page_count,
            publishYear: publishedYear,
            isEbook: ebookBookIds.has(book.id) || book.format === "EBOOK",
            coverPath: book.cover_url,
            categoryId: categoryId(book.category_id),
            createdAt: toDate(book.created_at),
        };

        return prisma.book.upsert({
          where: { id: bookData.id },
          create: {
            ...bookData,
            tags: { connect: connectedTags },
          },
          update: {
            ...bookData,
            tags: { set: connectedTags },
          },
        });
      }),
    );
    console.log(`[OK] books: ${Math.min(index + 100, dataset.books.length)}/${dataset.books.length}`);
  }

  await createManyInBatches(
    "listings",
    dataset.listings.map((listing) => ({
      id: listingId(listing.id),
      sellerId: userId(listing.seller_id),
      bookId: bookId(listing.book_id),
      title: listing.title?.trim() || bookById.get(listing.book_id)?.title || "Sách chưa có tiêu đề",
      description: listing.description ?? bookById.get(listing.book_id)?.description ?? null,
      condition: mapListingCondition(listing.condition),
      price: listing.price,
      status: mapListingStatus(listing.status),
      views: listing.view_count,
      cartAdds: listing.cart_count,
      purchases: listing.purchase_count,
      stock: listing.stock,
      tags: [],
      hasCover: Boolean(bookById.get(listing.book_id)?.cover_url),
      targetAudience: `Độc giả quan tâm ${bookById.get(listing.book_id)?.reading_level ?? "sách"}`,
      createdAt: toDate(listing.created_at),
    })),
    (batch) => prisma.listing.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "listing images",
    dataset.listings
      .map((listing) => {
        const coverPath = bookById.get(listing.book_id)?.cover_url;
        if (!coverPath) {
          return null;
        }

        return {
          id: id("LI", listing.id, 6),
          listingId: listingId(listing.id),
          url: coverPath,
          altText: listing.title,
          sortOrder: 0,
          createdAt: toDate(listing.created_at),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    (batch) => prisma.listingImage.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "orders",
    dataset.orders.map((order) => {
      const shipping = buildDemoShipping(userId(order.buyer_id));

      return {
        id: orderId(order.id),
        buyerId: userId(order.buyer_id),
        status: mapOrderStatus(order.status),
        paymentMethod: PaymentMethod.COD,
        totalAmount: order.total_amount,
        ...shipping,
        createdAt: toDate(order.created_at),
      };
    }),
    (batch) => prisma.order.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "order items",
    dataset.order_items.map((item) => ({
      id: orderItemId(item.id),
      orderId: orderId(item.order_id),
      bookId: bookId(item.book_id),
      listingId: listingId(item.listing_id),
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.line_total ?? item.unit_price * item.quantity,
    })),
    (batch) => prisma.orderItem.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "reviews",
    dataset.reviews.map((review) => ({
      id: reviewId(review.id),
      userId: userId(review.user_id),
      bookId: bookId(review.book_id),
      rating: review.rating,
      reviewText: [review.title, review.content].filter(Boolean).join(" - "),
      createdAt: toDate(review.created_at),
    })),
    (batch) => prisma.review.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "reading progress",
    dataset.reading_progress.map((progress) => ({
      id: progressId(progress.id),
      userId: userId(progress.user_id),
      bookId: bookId(progress.book_id),
      currentPage: progress.current_page,
      progressPercent: progress.progress_percent ?? progress.percent_complete ?? 0,
      totalMinutes: progress.total_reading_minutes ?? progress.total_read_minutes ?? 0,
      lastReadAt: toDate(progress.updated_at ?? progress.last_read_at ?? "1970-01-01T00:00:00Z"),
      updatedAt: toDate(progress.updated_at ?? progress.last_read_at ?? "1970-01-01T00:00:00Z"),
    })),
    (batch) => prisma.readingProgress.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "reading sessions",
    dataset.reading_sessions.map((session) => ({
      id: sessionId(session.id),
      userId: userId(session.user_id),
      bookId: bookId(session.book_id),
      currentPage: session.end_page,
      progressPercent: Math.min(100, Number(((session.end_page / 600) * 100).toFixed(2))),
      timeSpent: session.duration_minutes * 60,
      createdAt: toDate(session.created_at),
    })),
    (batch) => prisma.readingSession.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "bookmarks",
    dataset.bookmarks.map((bookmark) => ({
      id: bookmarkId(bookmark.id),
      userId: userId(bookmark.user_id),
      bookId: bookId(bookmark.book_id),
      pageNumber: bookmark.page,
      createdAt: toDate(bookmark.created_at),
    })),
    (batch) => prisma.bookmark.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "highlights",
    dataset.highlights.map((highlight) => ({
      id: highlightId(highlight.id),
      userId: userId(highlight.user_id),
      bookId: bookId(highlight.book_id),
      pageNumber: highlight.page,
      text: highlight.content ?? highlight.text ?? "",
      note: [highlight.note, highlight.color ? "Màu: " + highlight.color : null]
        .filter(Boolean)
        .join(" - ") || null,
      createdAt: toDate(highlight.created_at),
    })),
    (batch) => prisma.highlight.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "community posts",
    dataset.community_posts.map((post) => {
      const counts = postCounts.get(post.id) ?? { comments: 0, reactions: 0, reports: 0 };
      return {
        id: postId(post.id),
        authorId: userId(post.user_id),
        bookId: post.book_id ? bookId(post.book_id) : null,
        title: post.title,
        content: post.content,
        tags: [],
        reactionCount: counts.reactions,
        commentCount: counts.comments,
        reportCount: counts.reports,
        status: mapPostStatus(post.status),
        createdAt: toDate(post.created_at),
      };
    }),
    (batch) => prisma.post.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "comments",
    dataset.comments.map((comment) => ({
      id: commentId(comment.id),
      postId: postId(comment.post_id),
      authorId: userId(comment.user_id),
      content: comment.content,
      status: mapPostStatus(comment.status),
      createdAt: toDate(comment.created_at),
    })),
    (batch) => prisma.comment.createMany({ data: batch, skipDuplicates: true }),
  );

  const reactionRows = dataset.reactions
    .map((reaction) => {
      const type = mapReactionType(reaction.reaction_type ?? reaction.reaction ?? "LIKE");

      if (reaction.target_type === "POST") {
        return {
          id: reactionId(reaction.id),
          userId: userId(reaction.user_id),
          type,
          targetType: TargetType.POST,
          targetId: postId(reaction.target_id),
          postId: postId(reaction.target_id),
          commentId: null,
          createdAt: toDate(reaction.created_at),
        };
      }

      if (reaction.target_type === "COMMENT") {
        return {
          id: reactionId(reaction.id),
          userId: userId(reaction.user_id),
          type,
          targetType: TargetType.COMMENT,
          targetId: commentId(reaction.target_id),
          postId: null,
          commentId: commentId(reaction.target_id),
          createdAt: toDate(reaction.created_at),
        };
      }

      const review = reviewById.get(reaction.target_id);
      if (!review) {
        return null;
      }

      return {
        id: reactionId(reaction.id),
        userId: userId(reaction.user_id),
        type,
        targetType: TargetType.BOOK,
        targetId: bookId(review.book_id),
        postId: null,
        commentId: null,
        createdAt: toDate(reaction.created_at),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  await createManyInBatches("reactions", reactionRows, (batch) =>
    prisma.reaction.createMany({ data: batch, skipDuplicates: true }),
  );

  const reportReactions = dataset.reports
    .map((report, index) => {
      if (report.target_type === "POST") {
        return {
          id: id("RR", index + 1, 6),
          userId: userId(1 + (index % dataset.users.length)),
          type: ReactionType.REPORT,
          targetType: TargetType.POST,
          targetId: postId(report.target_id),
          postId: postId(report.target_id),
          commentId: null,
          createdAt: new Date(),
        };
      }

      if (report.target_type === "COMMENT") {
        return {
          id: id("RR", index + 1, 6),
          userId: userId(1 + (index % dataset.users.length)),
          type: ReactionType.REPORT,
          targetType: TargetType.COMMENT,
          targetId: commentId(report.target_id),
          postId: null,
          commentId: commentId(report.target_id),
          createdAt: new Date(),
        };
      }

      return null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  await createManyInBatches("report reactions", reportReactions, (batch) =>
    prisma.reaction.createMany({ data: batch, skipDuplicates: true }),
  );

  const eventRows = dataset.interaction_events
    .filter((event) => event.book_id !== null)
    .map((event) => ({
      id: interactionEventId(event.id),
      userId: userId(event.user_id),
      bookId: bookId(Number(event.book_id)),
      actionType: mapActionType(event.event_type),
      metadata: {
        ...toMetadataObject(event.metadata ?? event.metadata_json),
        originalEventType: event.event_type,
      },
      createdAt: toDate(event.created_at),
    }));

  await createManyInBatches("interaction events", eventRows, (batch) =>
    prisma.interactionEvent.createMany({ data: batch, skipDuplicates: true }),
  );

  const interactionRows = dataset.interaction_events
    .map((event) => {
      const type = mapInteractionType(event.event_type);
      if (!type) {
        return null;
      }

      const mappedAction = mapActionType(event.event_type);
      const hasBook = event.book_id !== null;
      return {
        id: interactionId(event.id),
        userId: userId(event.user_id),
        bookId: hasBook ? bookId(Number(event.book_id)) : null,
        type,
        targetType: hasBook ? TargetType.BOOK : TargetType.SEARCH_QUERY,
        targetId: hasBook ? bookId(Number(event.book_id)) : `QUERY-${event.id}`,
        query: mappedAction === "SEARCH" ? "Tìm kiếm sách" : null,
        minutesRead: mappedAction === "READ" ? 5 : 0,
        progressPercent: 0,
        metadata: toNullableJson(event.metadata ?? event.metadata_json ?? null),
        createdAt: toDate(event.created_at),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  await createManyInBatches("legacy interactions", interactionRows, (batch) =>
    prisma.interaction.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "recommendations",
    dataset.daily_recommendations.map((recommendation) => ({
      id: recommendationId(recommendation.id),
      userId: userId(recommendation.user_id),
      targetType: TargetType.BOOK,
      targetId: bookId(recommendation.book_id),
      algorithm: recommendation.strategy ?? recommendation.algorithm ?? "seed_hybrid",
      score: recommendation.score,
      rank: recommendation.rank,
      reason: recommendation.reason,
      clickedAt: recommendation.clicked ? toDate(recommendation.created_at) : null,
      generatedAt: toDate(recommendation.created_at),
      expiresAt: new Date(toDate(recommendation.created_at).getTime() + 7 * 24 * 60 * 60 * 1000),
    })),
    (batch) => prisma.recommendation.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "recommendation evidence",
    dataset.recommendation_evidence.map((evidence) => ({
      id: evidenceId(evidence.id),
      recommendationId: recommendationId(evidence.recommendation_id),
      type: mapEvidenceType(evidence.evidence_type),
      label: evidence.evidence_text ?? evidence.description ?? evidence.evidence_type,
      weight: evidence.weight,
      sourceType: TargetType.BOOK,
      sourceId: null,
      metadata: {
        originalEvidenceType: evidence.evidence_type,
      },
    })),
    (batch) => prisma.recommendationEvidence.createMany({ data: batch, skipDuplicates: true }),
  );

  const phase2Users = dataset.users.slice(0, 24);
  await createManyInBatches(
    "shipping addresses",
    phase2Users.map((user) => {
      const seedUserId = userId(user.id);
      const shipping = buildDemoShipping(seedUserId);

      return {
        id: `ADDR-${seedUserId}-DEFAULT`,
        userId: seedUserId,
        fullName: user.name,
        phone: shipping.shippingPhone,
        province: shipping.shippingProvince,
        district: shipping.shippingDistrict,
        ward: shipping.shippingWard,
        addressLine: shipping.shippingAddressLine,
        note: "Địa chỉ mặc định dùng cho demo checkout.",
        isDefault: true,
      };
    }),
    (batch) => prisma.shippingAddress.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "favorite books",
    phase2Users.flatMap((user, index) =>
      dataset.books.slice(index, index + 2).map((book) => ({
        id: `FAV-${userId(user.id)}-${bookId(book.id)}`,
        userId: userId(user.id),
        bookId: bookId(book.id),
      })),
    ),
    (batch) => prisma.favoriteBook.createMany({ data: batch, skipDuplicates: true }),
  );

  await createManyInBatches(
    "notifications phase 2",
    phase2Users.map((user) => ({
      id: `NTF-${userId(user.id)}-PHASE2`,
      userId: userId(user.id),
      title: "Profile Phase 2 đã sẵn sàng",
      message: "Bạn có thể cập nhật hồ sơ, thêm địa chỉ và checkout với snapshot giao hàng.",
      type: NotificationType.SYSTEM,
      href: "/profile",
    })),
    (batch) => prisma.notification.createMany({ data: batch, skipDuplicates: true }),
  );

  const phase3Seller = dataset.users.find((user) => user.role === "SELLER") ?? dataset.users.find((user) => user.role === "ADMIN");
  const phase3Buyer = dataset.users.find((user) => user.role === "BUYER") ?? dataset.users[0];
  const phase3Books = dataset.books.slice(0, 4);

  if (phase3Seller && phase3Buyer && phase3Books.length >= 3) {
    const sellerKey = userId(phase3Seller.id);
    const buyerKey = userId(phase3Buyer.id);
    const phase3Listings = [
      {
        id: `PH3-LIST-${sellerKey}-APPROVED`,
        sellerId: sellerKey,
        bookId: bookId(phase3Books[0].id),
        title: `Seller demo - ${phase3Books[0].title}`,
        description:
          "Sách demo cho Seller Dashboard, còn mới, không rách trang, phù hợp để kiểm tra luồng duyệt listing và mua hàng.",
        condition: ListingCondition.LIKE_NEW,
        price: 128000,
        status: ListingStatus.APPROVED,
        reportCount: 0,
        views: 42,
        cartAdds: 9,
        purchases: 3,
        tags: [],
        hasCover: Boolean(phase3Books[0].cover_url),
        targetAudience: "Sinh viên và người cần sách tham khảo nhanh",
        rejectionReason: null,
        moderationNote: "Listing demo đã duyệt.",
        reviewedAt: new Date(),
        hiddenAt: null,
      },
      {
        id: `PH3-LIST-${sellerKey}-PENDING`,
        sellerId: sellerKey,
        bookId: bookId(phase3Books[1].id),
        title: `Chờ duyệt - ${phase3Books[1].title}`,
        description:
          "Listing demo đang chờ admin duyệt, dùng để kiểm tra trạng thái pending trong Seller Dashboard và Admin Center.",
        condition: ListingCondition.GOOD,
        price: 99000,
        status: ListingStatus.PENDING_REVIEW,
        reportCount: 0,
        views: 12,
        cartAdds: 2,
        purchases: 0,
        tags: [],
        hasCover: Boolean(phase3Books[1].cover_url),
        targetAudience: "Độc giả muốn mua sách cũ giá tốt",
        rejectionReason: null,
        moderationNote: null,
        reviewedAt: null,
        hiddenAt: null,
      },
      {
        id: `PH3-LIST-${sellerKey}-HIDDEN`,
        sellerId: sellerKey,
        bookId: bookId(phase3Books[2].id),
        title: `Đã ẩn - ${phase3Books[2].title}`,
        description:
          "Listing demo đã bị seller ẩn khỏi marketplace, có thể gửi duyệt lại từ trang chỉnh sửa listing.",
        condition: ListingCondition.FAIR,
        price: 76000,
        status: ListingStatus.HIDDEN,
        reportCount: 1,
        views: 21,
        cartAdds: 1,
        purchases: 0,
        tags: [],
        hasCover: Boolean(phase3Books[2].cover_url),
        targetAudience: "Người đọc chấp nhận sách đã qua sử dụng",
        rejectionReason: null,
        moderationNote: "Seller tự ẩn để kiểm tra flow.",
        reviewedAt: null,
        hiddenAt: new Date(),
      },
      {
        id: `PH3-LIST-${sellerKey}-REJECTED`,
        sellerId: sellerKey,
        bookId: bookId((phase3Books[3] ?? phase3Books[0]).id),
        title: `Bị từ chối - ${(phase3Books[3] ?? phase3Books[0]).title}`,
        description:
          "Listing demo bị từ chối để seller nhìn thấy lý do kiểm duyệt và chỉnh sửa rồi gửi lại.",
        condition: ListingCondition.POOR,
        price: 54000,
        status: ListingStatus.REJECTED,
        reportCount: 0,
        views: 8,
        cartAdds: 0,
        purchases: 0,
        tags: [],
        hasCover: Boolean((phase3Books[3] ?? phase3Books[0]).cover_url),
        targetAudience: "Demo kiểm duyệt marketplace",
        rejectionReason: "Ảnh tình trạng sách chưa đủ rõ.",
        moderationNote: "Cần bổ sung ảnh thật trước khi duyệt.",
        reviewedAt: new Date(),
        hiddenAt: null,
      },
    ];

    await createManyInBatches("phase 3 seller listings", phase3Listings, (batch) =>
      prisma.listing.createMany({ data: batch, skipDuplicates: true }),
    );

    await createManyInBatches(
      "phase 3 listing images",
      phase3Listings
        .map((listing) => {
          const seedBook = phase3Books.find((book) => bookId(book.id) === listing.bookId);
          if (!seedBook?.cover_url) {
            return null;
          }

          return {
            id: `PH3-IMG-${listing.id}`,
            listingId: listing.id,
            url: seedBook.cover_url,
            altText: listing.title,
            sortOrder: 0,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      (batch) => prisma.listingImage.createMany({ data: batch, skipDuplicates: true }),
    );

    const phase3Orders = [
      {
        id: `PH4-ORDER-${sellerKey}-PENDING`,
        listing: phase3Listings[0],
        status: OrderStatus.PENDING,
        paymentMethod: PaymentMethod.COD,
        quantity: 1,
        note: "Đơn COD đang PENDING để buyer demo hủy hoặc admin xác nhận PAID.",
      },
      {
        id: `PH4-ORDER-${sellerKey}-PAID`,
        listing: phase3Listings[0],
        status: OrderStatus.PAID,
        paymentMethod: PaymentMethod.BANK_TRANSFER_DEMO,
        quantity: 1,
        note: "Đơn PAID demo để seller chuyển sang SHIPPED.",
      },
      {
        id: `PH3-ORDER-${sellerKey}-PAID`,
        listing: phase3Listings[0],
        status: OrderStatus.PAID_DEMO,
        paymentMethod: PaymentMethod.WALLET_DEMO,
        quantity: 1,
        note: "Buyer đã thanh toán demo, seller có thể chuyển sang đang giao.",
      },
      {
        id: `PH3-ORDER-${sellerKey}-SHIPPED`,
        listing: phase3Listings[0],
        status: OrderStatus.SHIPPED,
        paymentMethod: PaymentMethod.COD,
        quantity: 1,
        note: "Seller đã giao hàng, có thể hoàn tất đơn.",
      },
      {
        id: `PH3-ORDER-${sellerKey}-COMPLETED`,
        listing: phase3Listings[0],
        status: OrderStatus.COMPLETED,
        paymentMethod: PaymentMethod.BANK_TRANSFER_DEMO,
        quantity: 2,
        note: "Đơn completed demo để tính doanh thu.",
      },
      {
        id: `PH3-ORDER-${sellerKey}-CANCELLED`,
        listing: phase3Listings[0],
        status: OrderStatus.CANCELLED,
        paymentMethod: PaymentMethod.COD,
        quantity: 1,
        note: "Đơn cancelled demo để ảnh hưởng seller score.",
      },
    ];

    await createManyInBatches(
      "phase 3 seller orders",
      phase3Orders.map((order, index) => {
        const shipping = buildDemoShipping(buyerKey);

        return {
          id: order.id,
          buyerId: buyerKey,
          status: order.status,
          paymentMethod: order.paymentMethod,
          totalAmount: order.listing.price * order.quantity,
          ...shipping,
          createdAt: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000),
        };
      }),
      (batch) => prisma.order.createMany({ data: batch, skipDuplicates: true }),
    );

    await createManyInBatches(
      "phase 3 order items",
      phase3Orders.map((order) => ({
        id: `PH3-OI-${order.id}`,
        orderId: order.id,
        bookId: order.listing.bookId,
        listingId: order.listing.id,
        quantity: order.quantity,
        unitPrice: order.listing.price,
        totalPrice: order.listing.price * order.quantity,
      })),
      (batch) => prisma.orderItem.createMany({ data: batch, skipDuplicates: true }),
    );

    await createManyInBatches(
      "phase 3 order timeline",
      phase3Orders.map((order) => ({
        id: `PH3-TL-${order.id}-${order.status}`,
        orderId: order.id,
        actorId: sellerKey,
        status: order.status,
        note: order.note,
        metadata: {
          source: "phase3_seed",
        },
      })),
      (batch) => prisma.orderTimelineEvent.createMany({ data: batch, skipDuplicates: true }),
    );

    await createManyInBatches(
      "notifications phase 3 seller",
      [
        {
          id: `NTF-${sellerKey}-PHASE3-LISTING`,
          userId: sellerKey,
          title: "Seller Dashboard Phase 3 đã sẵn sàng",
          message: "Bạn có listing demo ở các trạng thái approved, pending, hidden và rejected.",
          type: NotificationType.MARKETPLACE,
          href: "/seller/listings",
        },
        {
          id: `NTF-${sellerKey}-PHASE3-ORDER`,
          userId: sellerKey,
          title: "Đơn demo cần seller xử lý",
          message: "Mở Seller Orders để chuyển đơn PAID_DEMO sang SHIPPED.",
          type: NotificationType.ORDER,
          href: `/seller/orders/PH3-ORDER-${sellerKey}-PAID`,
        },
      ],
      (batch) => prisma.notification.createMany({ data: batch, skipDuplicates: true }),
    );
  } else {
    console.log("[WARN] Bỏ qua dữ liệu demo Phase 3 vì thiếu seller, buyer hoặc book.");
  }
}

interface ImportCliOptions {
  mode: "dry-run" | "execute";
  replaceExisting: boolean;
  sourcePath: string;
}

function parseImportCliOptions(args: string[]): ImportCliOptions {
  const dryRun = args.includes("--dry-run");
  const execute = args.includes("--execute");
  const replaceExisting = args.includes("--replace-existing");
  const unknownFlags = args.filter(
    (argument) =>
      argument.startsWith("--") &&
      !["--dry-run", "--execute", "--replace-existing"].includes(argument),
  );

  if (unknownFlags.length > 0) {
    throw new Error("Flag không được hỗ trợ: " + unknownFlags.join(", "));
  }
  if (dryRun === execute) {
    throw new Error("Phải chọn chính xác một mode: --dry-run hoặc --execute.");
  }
  if (replaceExisting && !execute) {
    throw new Error("--replace-existing chỉ hợp lệ khi đi cùng --execute.");
  }

  const sourceArgument = args.find((argument) => !argument.startsWith("--"));
  return {
    mode: dryRun ? "dry-run" : "execute",
    replaceExisting,
    sourcePath: path.resolve(
      process.cwd(),
      sourceArgument ?? process.env.BOOKVERSE_DATASET_PATH ?? DEFAULT_SOURCE_PATH,
    ),
  };
}

async function captureDatabaseCounts(): Promise<Record<string, number>> {
  const [
    categories,
    tags,
    books,
    users,
    listings,
    orders,
    reviews,
    interactions,
    recommendations,
    ebooks,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.bookTag.count(),
    prisma.book.count(),
    prisma.user.count(),
    prisma.listing.count(),
    prisma.order.count(),
    prisma.review.count(),
    prisma.interactionEvent.count(),
    prisma.recommendation.count(),
    prisma.book.count({ where: { isEbook: true } }),
  ]);

  return {
    categories,
    tags,
    books,
    users,
    listings,
    orders,
    reviews,
    interactions,
    recommendations,
    ebooks,
  };
}

function createReadRepository(): DatasetReadRepository {
  return {
    getCounts: captureDatabaseCounts,
    async getExistingBookIds(bookIds) {
      const rows = await prisma.book.findMany({
        where: { id: { in: bookIds } },
        select: { id: true },
      });
      return new Set(rows.map((row) => row.id));
    },
  };
}

function validSeedBookIds(validation: DatasetValidationResult): string[] {
  return validation.records
    .filter((record) => record.status === "VALID" || record.status === "VALID_WITH_WARNINGS")
    .map((record) => record.bookId)
    .filter((value): value is string => Boolean(value))
    .map((value) => bookId(Number(value)));
}

async function loadOptionalCategoryMapping(): Promise<LoadedCategoryMapping | null> {
  try {
    return await loadCategoryMapping();
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "ENOENT") {
      console.warn("[WARN] Chưa có derived category mapping; import sẽ để hierarchy/canonical null.");
      return null;
    }
    throw error;
  }
}

function countPlannedEntities(
  dataset: SeedDataset,
  categoryMapping: LoadedCategoryMapping | null,
): ImportReport["planned"] {
  const mappingEntries = categoryMapping?.file.entries ?? [];
  return {
    create: 0,
    update: 0,
    skip: 0,
    authors: dataset.authors.length,
    categories: dataset.categories.length,
    tags: dataset.tags.length,
    ebooks: dataset.ebooks.length,
    bookFiles: dataset.book_files.length,
    categoryParents: mappingEntries.filter((entry) => entry.parentId !== null).length,
    canonicalMappings: mappingEntries.length,
    unmappedCategories: mappingEntries.filter((entry) => entry.confidence === "UNMAPPED").length,
  };
}

async function safeMain(): Promise<void> {
  const options = parseImportCliOptions(process.argv.slice(2));
  const startedAt = new Date();
  const sourceBuffer = await readFile(options.sourcePath);
  const sourceChecksum = createHash("sha256").update(sourceBuffer).digest("hex");
  const rawDataset = JSON.parse(sourceBuffer.toString("utf-8").replace(/^\uFEFF/, "")) as unknown;
  const validation = validateDataset(rawDataset);
  const dataset = rawDataset as SeedDataset;
  const categoryMapping = await loadOptionalCategoryMapping();
  const databaseTarget = assertSafeDatabase({
    operation: "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });

  try {
    if (options.mode === "execute") {
      assertSafeDatabase({
        operation: "destructive",
        databaseUrl: process.env.DATABASE_URL,
      });
    }

  console.log("[LOAD] " + path.relative(process.cwd(), options.sourcePath));
  console.log("[VALIDATE] Tổng sách: " + validation.total);
  console.log(
    "[ANALYZE] VALID=" +
      validation.valid +
      ", WARNINGS=" +
      validation.warnings +
      ", INVALID=" +
      validation.invalid +
      ", DUPLICATE=" +
      validation.duplicates +
      ", FAILED_RELATION=" +
      validation.failedRelations,
  );
  console.log("[PLAN] Target: " + databaseTarget.maskedUrl);

  const bookIds = validSeedBookIds(validation);
  const readRepository = createReadRepository();
  const dryRunPlan = await buildReadOnlyDryRunPlan(readRepository, bookIds);
  const planned = countPlannedEntities(dataset, categoryMapping);
  planned.create = options.replaceExisting ? bookIds.length : dryRunPlan.willCreate;
  planned.update = options.replaceExisting ? 0 : dryRunPlan.willUpdate;
  planned.skip = validation.invalid + validation.duplicates + validation.failedRelations;

  if (options.mode === "execute" && validation.topLevelErrors.length > 0) {
    throw new Error("Dataset thiếu cấu trúc bắt buộc: " + validation.topLevelErrors.join(" "));
  }
  if (options.mode === "execute" && (validation.invalid > 0 || validation.failedRelations > 0)) {
    throw new Error("Dataset có record INVALID/FAILED_RELATION; execute bị từ chối.");
  }
  if (options.mode === "execute" && validation.duplicates > 0) {
    throw new Error("Dataset có ID sách trùng; execute bị từ chối để không tạo dữ liệu mơ hồ.");
  }

  let tableCountsAfter = dryRunPlan.countsAfter;
  let inserted = 0;
  let updated = 0;

  if (options.mode === "dry-run") {
    console.log("[DRY-RUN] Không gọi delete/create/update/upsert hoặc transaction ghi.");
  } else {
    // Kiểm tra lại ngay trước khi bắt đầu bất kỳ thao tác ghi nào.
    assertSafeDatabase({
      operation: "destructive",
      databaseUrl: process.env.DATABASE_URL,
    });

    if (options.replaceExisting) {
      console.log("[REPLACE] --replace-existing xác nhận database test có thể tái tạo.");
      console.log("[REPLACE] 26 nhóm bảng sẽ bị ảnh hưởng.");
      await clearCurrentData(process.env.DATABASE_URL);
    }

    await importDataset(dataset, categoryMapping);
    tableCountsAfter = await captureDatabaseCounts();
    inserted = options.replaceExisting
      ? tableCountsAfter.books
      : Math.max(0, tableCountsAfter.books - dryRunPlan.countsBefore.books);
    updated = options.replaceExisting ? 0 : planned.update;
  }

  const finishedAt = new Date();
  const report: ImportReport = {
    mode: options.mode === "dry-run" ? "dry-run" : "import",
    sourceFile: path.relative(process.cwd(), options.sourcePath).replace(/\\/g, "/"),
    sourceChecksum,
    categoryMappingChecksum: categoryMapping?.mappingChecksum ?? null,
    databaseName: databaseTarget.databaseName,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    total: validation.total,
    valid: validation.valid,
    warnings: validation.warnings,
    invalid: validation.invalid,
    inserted,
    updated,
    skipped: planned.skip,
    duplicates: validation.duplicates,
    failedRelations: validation.failedRelations,
    planned,
    tableCountsBefore: dryRunPlan.countsBefore,
    tableCountsAfter,
    replaceExisting: options.replaceExisting,
    recordResults: validation.records.map((record) => ({
      recordIndex: record.recordIndex,
      bookId: record.bookId,
      status: record.status,
      publishedYear: record.publishedYear,
      ratingAverage: record.ratingAverage,
      issueCodes: record.issues.map((item) => item.code),
    })),
    errors: validation.issues,
  };
  const reportFiles = await writeImportReport(report);

  console.log("[REPORT] " + path.relative(process.cwd(), reportFiles.reportPath));
  console.log("[REPORT] " + path.relative(process.cwd(), reportFiles.errorsPath));
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        databaseName: report.databaseName,
        total: report.total,
        valid: report.valid,
        warnings: report.warnings,
        invalid: report.invalid,
        duplicates: report.duplicates,
        failedRelations: report.failedRelations,
        inserted: report.inserted,
        updated: report.updated,
        skipped: report.skipped,
        planned: report.planned,
        countsUnchanged:
          options.mode === "dry-run"
            ? JSON.stringify(report.tableCountsBefore) === JSON.stringify(report.tableCountsAfter)
            : undefined,
      },
      null,
      2,
    ),
  );
  } catch (error) {
    const finishedAt = new Date();
    const rawMessage = error instanceof Error ? error.message : "Lỗi không xác định.";
    const safeMessage = rawMessage.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]");
    const failedPlan = countPlannedEntities(dataset, categoryMapping);
    failedPlan.skip = validation.invalid + validation.duplicates + validation.failedRelations;
    const failureReport: ImportReport = {
      mode: options.mode === "dry-run" ? "dry-run" : "import",
      sourceFile: path.relative(process.cwd(), options.sourcePath).replace(/\\/g, "/"),
      sourceChecksum,
      categoryMappingChecksum: categoryMapping?.mappingChecksum ?? null,
      databaseName: databaseTarget.databaseName,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      total: validation.total,
      valid: validation.valid,
      warnings: validation.warnings,
      invalid: validation.invalid + 1,
      inserted: 0,
      updated: 0,
      skipped: failedPlan.skip,
      duplicates: validation.duplicates,
      failedRelations: validation.failedRelations,
      planned: failedPlan,
      tableCountsBefore: {},
      tableCountsAfter: {},
      replaceExisting: options.replaceExisting,
      recordResults: validation.records.map((record) => ({
        recordIndex: record.recordIndex,
        bookId: record.bookId,
        status: record.status,
        publishedYear: record.publishedYear,
        ratingAverage: record.ratingAverage,
        issueCodes: record.issues.map((item) => item.code),
      })),
      errors: [
        ...validation.issues,
        {
          recordIndex: -1,
          field: "import",
          code: "IMPORT_FAILED",
          message: safeMessage,
          severity: "error",
          receivedValue: "[redacted]",
        },
      ],
    };

    try {
      const reportFiles = await writeImportReport(failureReport);
      console.error("[REPORT] " + path.relative(process.cwd(), reportFiles.reportPath));
      console.error("[REPORT] " + path.relative(process.cwd(), reportFiles.errorsPath));
    } catch {
      console.error("[REPORT] Không thể ghi failure report.");
    }
    throw error;
  }
}

safeMain()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

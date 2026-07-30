import crypto from "node:crypto";

import {
  OrderStatus,
  Prisma,
  RecommendationCollectionContext,
  RecommendationDeviceClass,
  RecommendationSurface,
  RecommendationTelemetryType,
} from "@prisma/client";

import { TAXONOMY_VERSION } from "@/lib/interaction-taxonomy";
import prisma from "@/lib/prisma";
import {
  normalizeRecommendationCandidates,
  type RecommendationCandidateSource,
  type RecommendationNormalizationStats,
  type RecommendationTrackingReason,
  type RecommendationTrackingStatus,
} from "@/lib/recommendation-position-policy";
import {
  attributionWindowDays,
  resolveCollectionMetadata,
  selectConversionAttributions,
  type ClientTelemetryEvent,
  type ExposureCandidate,
  type VerifiedConversion,
} from "@/lib/recommendation-telemetry-policy";

const VALID_PURCHASE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PAID_DEMO,
  OrderStatus.SHIPPED,
  OrderStatus.COMPLETED,
];

export interface RecommendationSnapshotItem {
  bookId: string;
  position?: number | null;
  score: number;
  evidence?: string | null;
  source?: RecommendationCandidateSource;
  sourceComponent?: string | null;
  productionOrder?: number;
}

export interface RecommendationTrackingResult {
  requestId: string | null;
  trackingStatus: RecommendationTrackingStatus;
  trackingReason: RecommendationTrackingReason;
  itemCount: number;
  normalization: RecommendationNormalizationStats;
}

interface NormalizedSnapshotPersistenceInput {
  userId: string;
  algorithmVersion: string;
  surface: RecommendationSurface;
  candidateProfile: string;
  filterProfile: string;
  collectionContext: RecommendationCollectionContext;
  pilotId: string | null;
  consentVersion: string | null;
  experimentGroup: string | null;
  items: Array<{
    bookId: string;
    position: number;
    score: number;
    evidence: string | null;
    sourceComponent: string | null;
  }>;
}

export type RecommendationSnapshotPersistence = (
  input: NormalizedSnapshotPersistenceInput,
) => Promise<string>;

export interface RecommendationSnapshotOptions {
  /** Chỉ dùng để unit test nhánh persistence unavailable mà không cần database. */
  persist?: RecommendationSnapshotPersistence;
}

export class RecommendationTelemetryError extends Error {
  constructor(
    public readonly code:
      | "ACCOUNT_NOT_ALLOWED"
      | "REQUEST_NOT_FOUND"
      | "REQUEST_FORBIDDEN"
      | "BOOK_NOT_IN_REQUEST",
    message: string,
  ) {
    super(message);
    this.name = "RecommendationTelemetryError";
  }
}

export function classifyRecommendationPersistenceFailure(
  error: unknown,
): Extract<
  RecommendationTrackingReason,
  "PERSISTENCE_UNAVAILABLE" | "DATABASE_UNAVAILABLE" | "REQUEST_VALIDATION_FAILED"
> {
  const details = error && typeof error === "object" ? (error as { code?: unknown; name?: unknown }) : {};
  const code = typeof details.code === "string" ? details.code : "";
  const name = typeof details.name === "string" ? details.name : "";
  if (["P1001", "P1002", "P1008", "P1017"].includes(code) || name === "PrismaClientInitializationError") {
    return "DATABASE_UNAVAILABLE";
  }
  if (name === "PrismaClientValidationError") return "REQUEST_VALIDATION_FAILED";
  return "PERSISTENCE_UNAVAILABLE";
}

function recommendationPersistenceErrorLabel(error: unknown): string {
  if (!error || typeof error !== "object") return "UNKNOWN";
  const details = error as { code?: unknown; name?: unknown };
  if (typeof details.code === "string" && /^P\d{4}$/.test(details.code)) return details.code;
  if (typeof details.name === "string" && /^Prisma[A-Za-z]+Error$/.test(details.name)) {
    return details.name;
  }
  return "UNKNOWN";
}

async function persistRecommendationSnapshot(input: NormalizedSnapshotPersistenceInput): Promise<string> {
  // Nested create của Prisma đã là một atomic write. Interactive transaction bọc ngoài
  // từng request làm stress concurrency chạm P2028 (transaction hết hạn) không cần thiết.
  const request = await prisma.recommendationRequest.create({
    data: {
      userId: input.userId,
      algorithmVersion: input.algorithmVersion,
      taxonomyVersion: TAXONOMY_VERSION,
      surface: input.surface,
      candidateProfile: input.candidateProfile,
      filterProfile: input.filterProfile,
      collectionContext: input.collectionContext,
      pilotId: input.pilotId,
      consentVersion: input.consentVersion,
      experimentGroup: input.experimentGroup,
      items: {
        create: input.items,
      },
    },
    select: { id: true },
  });
  return request.id;
}

export async function createRecommendationRequestSnapshotResult(input: {
  userId: string;
  algorithmVersion: string;
  surface: RecommendationSurface;
  candidateProfile: string;
  filterProfile: string;
  items: RecommendationSnapshotItem[];
}, options: RecommendationSnapshotOptions = {}): Promise<RecommendationTrackingResult> {
  const normalized = normalizeRecommendationCandidates(
    input.items.map((item, index) => ({
      bookId: item.bookId,
      score: item.score,
      evidence: item.evidence,
      rank: item.position,
      source: item.source ?? "CURRENT",
      productionOrder: item.productionOrder ?? index,
      payload: { sourceComponent: item.sourceComponent ?? item.source ?? null },
    })),
    Math.max(1, input.items.length),
  );
  if (normalized.items.length === 0) {
    return {
      requestId: null,
      trackingStatus: "DEGRADED",
      trackingReason: "REQUEST_VALIDATION_FAILED",
      itemCount: 0,
      normalization: normalized.stats,
    };
  }

  const collectionMetadata = resolveCollectionMetadata(process.env);
  const persistenceInput: NormalizedSnapshotPersistenceInput = {
    userId: input.userId,
    algorithmVersion: input.algorithmVersion,
    surface: input.surface,
    candidateProfile: input.candidateProfile,
    filterProfile: input.filterProfile,
    collectionContext:
      collectionMetadata.collectionContext === "PILOT_CONSENTED"
        ? RecommendationCollectionContext.PILOT_CONSENTED
        : RecommendationCollectionContext.STANDARD_APP,
    pilotId: collectionMetadata.pilotId,
    consentVersion: collectionMetadata.consentVersion,
    experimentGroup: collectionMetadata.experimentGroup,
    items: normalized.items.map((item) => ({
      bookId: item.bookId,
      position: item.position,
      score: item.score,
      evidence: item.evidence?.slice(0, 1_000) ?? null,
      sourceComponent: item.payload.sourceComponent?.slice(0, 80) ?? null,
    })),
  };

  try {
    const requestId = await (options.persist ?? persistRecommendationSnapshot)(persistenceInput);
    return {
      requestId,
      trackingStatus: "TRACKED",
      trackingReason: normalized.reason,
      itemCount: normalized.items.length,
      normalization: normalized.stats,
    };
  } catch (error: unknown) {
    const trackingReason = classifyRecommendationPersistenceFailure(error);
    // Không log raw error vì Prisma có thể chứa SQL hoặc connection string.
    console.error(
      `[recommendation.telemetry] snapshot degraded reason=${trackingReason} code=${recommendationPersistenceErrorLabel(error)} surface=${input.surface}`,
    );
    return {
      requestId: null,
      trackingStatus: "DEGRADED",
      trackingReason,
      itemCount: normalized.items.length,
      normalization: normalized.stats,
    };
  }
}

export async function createRecommendationRequestSnapshot(input: {
  userId: string;
  algorithmVersion: string;
  surface: RecommendationSurface;
  candidateProfile: string;
  filterProfile: string;
  items: RecommendationSnapshotItem[];
}): Promise<string | null> {
  const result = await createRecommendationRequestSnapshotResult(input);
  return result.requestId;
}

function canonicalEventFor(type: ClientTelemetryEvent): string {
  return type === "IMPRESSION" ? "RECOMMENDATION_IMPRESSION" : "RECOMMENDATION_CLICK";
}

export async function recordRecommendationTelemetry(input: {
  currentUserId: string;
  requestId: string;
  bookId: string;
  eventType: ClientTelemetryEvent;
  deviceClass?: RecommendationDeviceClass;
}): Promise<{ eventId: string; duplicate: boolean; occurredAt: Date }> {
  const user = await prisma.user.findUnique({
    where: { id: input.currentUserId },
    select: { isLocked: true },
  });
  if (!user || user.isLocked) {
    throw new RecommendationTelemetryError(
      "ACCOUNT_NOT_ALLOWED",
      "User không tồn tại hoặc đã bị khóa.",
    );
  }
  const request = await prisma.recommendationRequest.findUnique({
    where: { id: input.requestId },
    select: {
      userId: true,
      items: {
        where: { bookId: input.bookId },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!request) {
    throw new RecommendationTelemetryError("REQUEST_NOT_FOUND", "Recommendation request không tồn tại.");
  }
  if (request.userId !== input.currentUserId) {
    throw new RecommendationTelemetryError("REQUEST_FORBIDDEN", "Request không thuộc user hiện tại.");
  }
  const item = request.items[0];
  if (!item) {
    throw new RecommendationTelemetryError("BOOK_NOT_IN_REQUEST", "Book không thuộc recommendation request.");
  }

  const deduplicationKey = `${input.eventType.toLowerCase()}:${input.requestId}:${item.id}`;
  const existing = await prisma.recommendationTelemetryEvent.findUnique({
    where: { deduplicationKey },
    select: { id: true, occurredAt: true },
  });
  if (existing) return { eventId: existing.id, occurredAt: existing.occurredAt, duplicate: true };

  try {
    const event = await prisma.recommendationTelemetryEvent.create({
      data: {
        requestId: input.requestId,
        requestItemId: item.id,
        userId: input.currentUserId,
        type:
          input.eventType === "IMPRESSION"
            ? RecommendationTelemetryType.IMPRESSION
            : RecommendationTelemetryType.CLICK,
        canonicalEvent: canonicalEventFor(input.eventType),
        deduplicationKey,
        deviceClass: input.deviceClass ?? RecommendationDeviceClass.UNKNOWN,
      },
      select: { id: true, occurredAt: true },
    });
    return { eventId: event.id, occurredAt: event.occurredAt, duplicate: false };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.recommendationTelemetryEvent.findUniqueOrThrow({
        where: { deduplicationKey },
        select: { id: true, occurredAt: true },
      });
      return { eventId: raced.id, occurredAt: raced.occurredAt, duplicate: true };
    }
    throw error;
  }
}

export async function syncRecommendationConversionsForUser(
  userId: string,
  now = new Date(),
): Promise<number> {
  const windowDays = attributionWindowDays(process.env.RECOMMENDATION_ATTRIBUTION_WINDOW_DAYS);
  const windowMs = windowDays * 24 * 60 * 60 * 1_000;
  const earliest = new Date(now.getTime() - windowMs);
  const exposureRows = await prisma.recommendationTelemetryEvent.findMany({
    where: {
      userId,
      type: { in: [RecommendationTelemetryType.IMPRESSION, RecommendationTelemetryType.CLICK] },
      occurredAt: { gte: earliest, lte: now },
    },
    select: {
      requestId: true,
      requestItemId: true,
      type: true,
      occurredAt: true,
      deviceClass: true,
      requestItem: { select: { bookId: true } },
    },
  });
  if (exposureRows.length === 0) return 0;

  const exposures: ExposureCandidate[] = exposureRows.map((event) => ({
    requestId: event.requestId,
    requestItemId: event.requestItemId,
    bookId: event.requestItem.bookId,
    type: event.type === RecommendationTelemetryType.CLICK ? "CLICK" : "IMPRESSION",
    occurredAt: event.occurredAt,
    deviceClass: event.deviceClass,
  }));
  const bookIds = [...new Set(exposures.map((event) => event.bookId))];
  const [orderItems, sessions, bookmarks, favorites, reviews] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        bookId: { in: bookIds },
        quantity: { gt: 0 },
        order: { buyerId: userId, status: { in: VALID_PURCHASE_STATUSES }, createdAt: { gte: earliest, lte: now } },
      },
      select: { id: true, bookId: true, order: { select: { createdAt: true } } },
    }),
    prisma.readingSession.findMany({
      where: {
        userId,
        bookId: { in: bookIds },
        createdAt: { gte: earliest, lte: now },
        OR: [{ timeSpent: { gte: 300 } }, { progressPercent: { gte: 50 } }],
      },
      select: { id: true, bookId: true, createdAt: true },
    }),
    prisma.bookmark.findMany({
      where: { userId, bookId: { in: bookIds }, createdAt: { gte: earliest, lte: now } },
      select: { id: true, bookId: true, createdAt: true },
    }),
    prisma.favoriteBook.findMany({
      where: { userId, bookId: { in: bookIds }, createdAt: { gte: earliest, lte: now } },
      select: { id: true, bookId: true, createdAt: true },
    }),
    prisma.review.findMany({
      where: { userId, bookId: { in: bookIds }, rating: { gte: 4 }, createdAt: { gte: earliest, lte: now } },
      select: { id: true, bookId: true, createdAt: true },
    }),
  ]);

  const conversions: VerifiedConversion[] = [
    ...orderItems.map((item) => ({
      bookId: item.bookId,
      sourceType: "ORDER_ITEM",
      sourceId: item.id,
      canonicalEvent: "PURCHASE",
      occurredAt: item.order.createdAt,
    })),
    ...sessions.map((item) => ({
      bookId: item.bookId,
      sourceType: "READING_SESSION",
      sourceId: item.id,
      canonicalEvent: "READING_COMPLETE",
      occurredAt: item.createdAt,
    })),
    ...bookmarks.map((item) => ({
      bookId: item.bookId,
      sourceType: "BOOKMARK",
      sourceId: item.id,
      canonicalEvent: "BOOKMARK_ADD",
      occurredAt: item.createdAt,
    })),
    ...favorites.map((item) => ({
      bookId: item.bookId,
      sourceType: "FAVORITE",
      sourceId: item.id,
      canonicalEvent: "FAVORITE_ADD",
      occurredAt: item.createdAt,
    })),
    ...reviews.map((item) => ({
      bookId: item.bookId,
      sourceType: "REVIEW",
      sourceId: item.id,
      canonicalEvent: "REVIEW_CREATE",
      occurredAt: item.createdAt,
    })),
  ];
  const attributions = selectConversionAttributions(exposures, conversions, windowMs);
  if (attributions.length === 0) return 0;

  const result = await prisma.recommendationTelemetryEvent.createMany({
    data: attributions.map(({ exposure, conversion, anchor }) => ({
      id: crypto.randomUUID(),
      requestId: exposure.requestId,
      requestItemId: exposure.requestItemId,
      userId,
      type: RecommendationTelemetryType.CONVERSION,
      canonicalEvent: "RECOMMENDATION_CONVERSION",
      deduplicationKey: `conversion:${conversion.sourceType}:${conversion.sourceId}`,
      sourceType: conversion.sourceType,
      sourceId: conversion.sourceId,
      attributionAnchor: anchor,
      deviceClass:
        exposure.deviceClass === "DESKTOP"
          ? RecommendationDeviceClass.DESKTOP
          : exposure.deviceClass === "MOBILE"
            ? RecommendationDeviceClass.MOBILE
            : exposure.deviceClass === "TABLET"
              ? RecommendationDeviceClass.TABLET
              : RecommendationDeviceClass.UNKNOWN,
      occurredAt: conversion.occurredAt,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

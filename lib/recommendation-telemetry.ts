import crypto from "node:crypto";

import {
  OrderStatus,
  Prisma,
  RecommendationSurface,
  RecommendationTelemetryType,
} from "@prisma/client";

import { TAXONOMY_VERSION } from "@/lib/interaction-taxonomy";
import prisma from "@/lib/prisma";
import {
  attributionWindowDays,
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
  position: number;
  score: number;
  evidence?: string | null;
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

export async function createRecommendationRequestSnapshot(input: {
  userId: string;
  algorithmVersion: string;
  surface: RecommendationSurface;
  candidateProfile: string;
  filterProfile: string;
  items: RecommendationSnapshotItem[];
}): Promise<string | null> {
  const uniqueBookIds = new Set<string>();
  const items = input.items.filter((item) => {
    if (
      !item.bookId.trim() ||
      uniqueBookIds.has(item.bookId) ||
      !Number.isInteger(item.position) ||
      item.position <= 0 ||
      !Number.isFinite(item.score)
    ) {
      return false;
    }
    uniqueBookIds.add(item.bookId);
    return true;
  });
  if (items.length === 0) return null;

  const request = await prisma.recommendationRequest.create({
    data: {
      userId: input.userId,
      algorithmVersion: input.algorithmVersion,
      taxonomyVersion: TAXONOMY_VERSION,
      surface: input.surface,
      candidateProfile: input.candidateProfile,
      filterProfile: input.filterProfile,
      items: {
        create: items.map((item) => ({
          bookId: item.bookId,
          position: item.position,
          score: item.score,
          evidence: item.evidence?.slice(0, 1_000) ?? null,
        })),
      },
    },
    select: { id: true },
  });
  return request.id;
}

function canonicalEventFor(type: ClientTelemetryEvent): string {
  return type === "IMPRESSION" ? "RECOMMENDATION_IMPRESSION" : "RECOMMENDATION_CLICK";
}

export async function recordRecommendationTelemetry(input: {
  currentUserId: string;
  requestId: string;
  bookId: string;
  eventType: ClientTelemetryEvent;
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
      occurredAt: conversion.occurredAt,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

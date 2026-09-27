"use server";

import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { CURRENT_CONSENT_VERSION } from "@/lib/research-interactions";

const BENCHMARK_MIN_INTERACTIONS = 3;
const PILOT_MIN_USERS = 30;
const PILOT_MIN_IMPRESSIONS = 500;
const PILOT_MIN_OUTCOMES = 50;
const PILOT_MIN_DAYS = 28;

export interface ResearchDataStats {
  consentedUsers: number;
  revokedOrDeclined: number;
  totalInteractions: number;
  interactionsByType: Record<string, number>;
  impressions: number;
  clicks: number;
  ctr: { value: number | null; available: boolean; reason?: string };
  eligibleForBenchmark: number;
  collectionPeriod: {
    earliest: string | null;
    latest: string | null;
    daysCollected: number;
  };
  dataReadiness: {
    status: "BLOCKED_BY_DATA" | "READY_FOR_ASSESSMENT";
    current: {
      users: number;
      impressions: number;
      outcomes: number;
      days: number;
    };
    thresholds: {
      minUsers: number;
      minImpressions: number;
      minOutcomes: number;
      minDays: number;
    };
  };
  missingDataRate: {
    recordsWithoutUserId: number;
    recordsWithoutBookId: number;
    total: number;
  };
}

export async function getResearchDataStats(): Promise<ResearchDataStats | null> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return null;
    }

    const [
      consentedCount,
      revokedCount,
      interactionsByType,
      userCounts,
      earliest,
      latest,
      missingUserId,
      missingBookId,
      totalCount,
    ] = await Promise.all([
      prisma.userResearchConsent.count({
        where: { consentVersion: CURRENT_CONSENT_VERSION, consented: true, revokedAt: null },
      }),
      prisma.userResearchConsent.count({
        where: { consentVersion: CURRENT_CONSENT_VERSION, consented: false },
      }),
      prisma.userInteractionLog.groupBy({
        by: ["eventType"],
        _count: { id: true },
        where: { consentVersion: CURRENT_CONSENT_VERSION },
      }),
      prisma.userInteractionLog.groupBy({
        by: ["userId"],
        _count: { id: true },
        where: { consentVersion: CURRENT_CONSENT_VERSION, userId: { not: null } },
      }),
      prisma.userInteractionLog.findFirst({
        where: { consentVersion: CURRENT_CONSENT_VERSION },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.userInteractionLog.findFirst({
        where: { consentVersion: CURRENT_CONSENT_VERSION },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.userInteractionLog.count({
        where: { consentVersion: CURRENT_CONSENT_VERSION, userId: null },
      }),
      prisma.userInteractionLog.count({
        where: { consentVersion: CURRENT_CONSENT_VERSION, bookId: null },
      }),
      prisma.userInteractionLog.count({
        where: { consentVersion: CURRENT_CONSENT_VERSION },
      }),
    ]);

    const byType = Object.fromEntries(
      interactionsByType.map((row) => [row.eventType, row._count.id]),
    );

    const impressions = byType["IMPRESSION"] ?? 0;
    const clicks = byType["RECOMMENDATION_CLICK"] ?? 0;
    const outcomes =
      (byType["PURCHASE"] ?? 0) + (byType["RATING"] ?? 0) + clicks;

    const ctr =
      impressions > 0 && clicks > 0
        ? { value: clicks / impressions, available: true }
        : { value: null, available: false, reason: "Cần cả impression và click thật" };

    const eligibleForBenchmark = userCounts.filter(
      (row) => row._count.id >= BENCHMARK_MIN_INTERACTIONS,
    ).length;

    const daysCollected =
      earliest?.createdAt && latest?.createdAt
        ? Math.round(
            (latest.createdAt.getTime() - earliest.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

    const dataReadinessStatus =
      consentedCount >= PILOT_MIN_USERS &&
      impressions >= PILOT_MIN_IMPRESSIONS &&
      outcomes >= PILOT_MIN_OUTCOMES &&
      daysCollected >= PILOT_MIN_DAYS
        ? "READY_FOR_ASSESSMENT"
        : "BLOCKED_BY_DATA";

    return {
      consentedUsers: consentedCount,
      revokedOrDeclined: revokedCount,
      totalInteractions: totalCount,
      interactionsByType: byType,
      impressions,
      clicks,
      ctr,
      eligibleForBenchmark,
      collectionPeriod: {
        earliest: earliest?.createdAt?.toISOString() ?? null,
        latest: latest?.createdAt?.toISOString() ?? null,
        daysCollected,
      },
      dataReadiness: {
        status: dataReadinessStatus,
        current: {
          users: consentedCount,
          impressions,
          outcomes,
          days: daysCollected,
        },
        thresholds: {
          minUsers: PILOT_MIN_USERS,
          minImpressions: PILOT_MIN_IMPRESSIONS,
          minOutcomes: PILOT_MIN_OUTCOMES,
          minDays: PILOT_MIN_DAYS,
        },
      },
      missingDataRate: {
        recordsWithoutUserId: missingUserId,
        recordsWithoutBookId: missingBookId,
        total: totalCount,
      },
    };
  } catch {
    return null;
  }
}

export interface RecentTelemetryRecord {
  id: string;
  eventType: string;
  userHash: string;
  bookTitle: string;
  sourcePage: string;
  recommendationModel: string | null;
  createdAt: string;
}

export async function getRecentTelemetryLogs(limit: number = 8): Promise<RecentTelemetryRecord[]> {
  try {
    const logs = await prisma.userInteractionLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        anonymousId: true,
        bookId: true,
        eventType: true,
        sourcePage: true,
        recommendationModel: true,
        createdAt: true,
      },
    });

    const bookIds = Array.from(
      new Set(logs.map((l) => l.bookId).filter((id): id is string => Boolean(id))),
    );

    const books =
      bookIds.length > 0
        ? await prisma.book.findMany({
            where: { id: { in: bookIds } },
            select: { id: true, title: true },
          })
        : [];

    const bookMap = new Map(books.map((b) => [b.id, b.title]));

    return logs.map((log) => {
      const rawUser = log.userId || log.anonymousId || "anon";
      // create short safe hash preview like u_8f3a...
      const hashStr = "usr_" + Array.from(rawUser).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0).toString(16).slice(0, 6);
      return {
        id: log.id,
        eventType: String(log.eventType),
        userHash: hashStr,
        bookTitle: log.bookId ? bookMap.get(log.bookId) || "Sách #" + log.bookId.slice(0, 6) : "Tìm kiếm / Hệ thống",
        sourcePage: log.sourcePage || "catalog",
        recommendationModel: log.recommendationModel || "fastapi_hybrid_v2",
        createdAt: log.createdAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
    });
  } catch {
    return [];
  }
}
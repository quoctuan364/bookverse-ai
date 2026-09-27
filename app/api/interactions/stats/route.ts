/**
 * GET /api/interactions/stats — Thống kê tổng hợp cho admin
 * Yêu cầu quyền ADMIN. Không trả về dữ liệu cá nhân.
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { CURRENT_CONSENT_VERSION } from "@/lib/research-interactions";

// Ngưỡng minimum để đủ điều kiện benchmark (theo INTERACTION_PILOT_PROTOCOL.md)
const BENCHMARK_MIN_INTERACTIONS = 3;
const PILOT_MIN_USERS = 30;
const PILOT_MIN_IMPRESSIONS = 500;
const PILOT_MIN_OUTCOMES = 50;

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Chỉ admin mới có thể xem thống kê này." },
        { status: 403 },
      );
    }

    // Tổng người dùng đã đồng ý
    const consentedCount = await prisma.userResearchConsent.count({
      where: {
        consentVersion: CURRENT_CONSENT_VERSION,
        consented: true,
        revokedAt: null,
      },
    });

    const revokedCount = await prisma.userResearchConsent.count({
      where: {
        consentVersion: CURRENT_CONSENT_VERSION,
        consented: false,
      },
    });

    // Thống kê interaction theo loại
    const interactionsByType = await prisma.userInteractionLog.groupBy({
      by: ["eventType"],
      _count: { id: true },
      where: { consentVersion: CURRENT_CONSENT_VERSION },
    });

    // Tổng impression và click
    const impressionCount =
      interactionsByType.find((row) => row.eventType === "IMPRESSION")?._count
        .id ?? 0;
    const clickCount =
      interactionsByType.find(
        (row) => row.eventType === "RECOMMENDATION_CLICK",
      )?._count.id ?? 0;

    // CTR — chỉ hiển thị khi có cả impression và click thật
    const ctr =
      impressionCount > 0 && clickCount > 0
        ? { value: clickCount / impressionCount, available: true }
        : { value: null, available: false, reason: "Cần cả impression và click thật" };

    // Số người dùng đủ điều kiện benchmark (≥3 interaction)
    const userInteractionCounts = await prisma.userInteractionLog.groupBy({
      by: ["userId"],
      _count: { id: true },
      where: {
        consentVersion: CURRENT_CONSENT_VERSION,
        userId: { not: null },
      },
    });

    const eligibleForBenchmark = userInteractionCounts.filter(
      (row) => row._count.id >= BENCHMARK_MIN_INTERACTIONS,
    ).length;

    // Khoảng thời gian thu thập
    const earliest = await prisma.userInteractionLog.findFirst({
      where: { consentVersion: CURRENT_CONSENT_VERSION },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const latest = await prisma.userInteractionLog.findFirst({
      where: { consentVersion: CURRENT_CONSENT_VERSION },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const totalInteractions = interactionsByType.reduce(
      (sum, row) => sum + row._count.id,
      0,
    );

    // Xác định trạng thái data readiness
    const totalOutcomes =
      (interactionsByType.find((row) => row.eventType === "PURCHASE")?._count.id ?? 0) +
      (interactionsByType.find((row) => row.eventType === "RATING")?._count.id ?? 0) +
      clickCount;

    const collectionDays = earliest?.createdAt && latest?.createdAt
      ? Math.round(
          (latest.createdAt.getTime() - earliest.createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    const dataReadinessStatus = (() => {
      if (consentedCount < PILOT_MIN_USERS) return "BLOCKED_BY_DATA";
      if (impressionCount < PILOT_MIN_IMPRESSIONS) return "BLOCKED_BY_DATA";
      if (totalOutcomes < PILOT_MIN_OUTCOMES) return "BLOCKED_BY_DATA";
      if (collectionDays < 28) return "BLOCKED_BY_DATA";
      return "READY_FOR_ASSESSMENT";
    })();

    return NextResponse.json({
      consentVersion: CURRENT_CONSENT_VERSION,
      consent: {
        consentedUsers: consentedCount,
        revokedOrDeclined: revokedCount,
      },
      interactions: {
        total: totalInteractions,
        byType: Object.fromEntries(
          interactionsByType.map((row) => [row.eventType, row._count.id]),
        ),
      },
      impressionAndClick: {
        impressions: impressionCount,
        clicks: clickCount,
        ctr,
      },
      benchmark: {
        eligibleUsers: eligibleForBenchmark,
        minimumInteractionsRequired: BENCHMARK_MIN_INTERACTIONS,
      },
      collectionPeriod: {
        earliest: earliest?.createdAt?.toISOString() ?? null,
        latest: latest?.createdAt?.toISOString() ?? null,
        daysCollected: collectionDays,
      },
      dataReadiness: {
        status: dataReadinessStatus,
        thresholds: {
          minUsers: PILOT_MIN_USERS,
          minImpressions: PILOT_MIN_IMPRESSIONS,
          minOutcomes: PILOT_MIN_OUTCOMES,
          minDays: 28,
        },
        current: {
          users: consentedCount,
          impressions: impressionCount,
          outcomes: totalOutcomes,
          days: collectionDays,
        },
      },
    });
  } catch {
    console.error("[api/interactions/stats] GET failed");
    return NextResponse.json(
      { error: "Không thể lấy thống kê." },
      { status: 500 },
    );
  }
}
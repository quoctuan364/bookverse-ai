"use server";

import {
  FeedbackValue,
  MembershipPaymentStatus,
  OrderStatus,
  SubscriptionStatus,
} from "@prisma/client";

import { requireModeratorUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

function startOfUtcDay(value: Date): Date {
  const result = new Date(value);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function getAdminAnalytics() {
  await requireModeratorUser();

  const today = startOfUtcDay(new Date());
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - 29);

  const [
    membershipPayments,
    marketplaceOrders,
    totalUsers,
    activeSubscriptions,
    chatbotSessions,
    chatbotFeedback,
  ] = await Promise.all([
    prisma.membershipPayment.findMany({
      where: {
        status: MembershipPaymentStatus.PAID_DEMO,
        paidAt: { gte: startDate },
      },
      select: {
        amount: true,
        paidAt: true,
        plan: { select: { id: true, name: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: {
          in: [
            OrderStatus.PAID,
            OrderStatus.PAID_DEMO,
            OrderStatus.SHIPPED,
            OrderStatus.COMPLETED,
          ],
        },
      },
      select: { totalAmount: true, createdAt: true },
    }),
    prisma.user.count(),
    prisma.subscription.count({
      where: {
        status: SubscriptionStatus.ACTIVE,
        startsAt: { lte: new Date() },
        endsAt: { gt: new Date() },
      },
    }),
    prisma.chatbotSession.count({ where: { createdAt: { gte: startDate } } }),
    prisma.chatbotFeedback.groupBy({
      by: ["value"],
      where: { createdAt: { gte: startDate } },
      _count: { _all: true },
    }),
  ]);

  const dailyMap = new Map<
    string,
    {
      membershipRevenue: number;
      membershipPayments: number;
      marketplaceRevenue: number;
      marketplaceOrders: number;
    }
  >();
  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + offset);
    dailyMap.set(dateKey(date), {
      membershipRevenue: 0,
      membershipPayments: 0,
      marketplaceRevenue: 0,
      marketplaceOrders: 0,
    });
  }

  const planMap = new Map<string, { name: string; revenue: number; payments: number }>();
  for (const payment of membershipPayments) {
    if (!payment.paidAt) continue;
    const key = dateKey(payment.paidAt);
    const day = dailyMap.get(key);
    if (day) {
      day.membershipRevenue += Number(payment.amount);
      day.membershipPayments += 1;
    }
    const plan = planMap.get(payment.plan.id) ?? {
      name: payment.plan.name,
      revenue: 0,
      payments: 0,
    };
    plan.revenue += Number(payment.amount);
    plan.payments += 1;
    planMap.set(payment.plan.id, plan);
  }

  for (const order of marketplaceOrders) {
    const key = dateKey(order.createdAt);
    const day = dailyMap.get(key);
    if (day) {
      day.marketplaceRevenue += Number(order.totalAmount);
      day.marketplaceOrders += 1;
    }
  }

  const daily = [...dailyMap.entries()].map(([key, value]) => ({
    key,
    label: new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "UTC",
    }).format(new Date(`${key}T00:00:00.000Z`)),
    ...value,
  }));
  const helpfulFeedback =
    chatbotFeedback.find((item) => item.value === FeedbackValue.HELPFUL)?._count
      ._all ?? 0;
  const unhelpfulFeedback =
    chatbotFeedback.find((item) => item.value === FeedbackValue.NOT_HELPFUL)
      ?._count._all ?? 0;

  return {
    period: { start: startDate, end: new Date() },
    summary: {
      totalUsers,
      activeSubscriptions,
      chatbotSessions,
      helpfulFeedback,
      unhelpfulFeedback,
      membershipRevenue: membershipPayments.reduce(
        (total, payment) => total + Number(payment.amount),
        0,
      ),
      membershipPayments: membershipPayments.length,
      marketplaceRevenue: marketplaceOrders.reduce(
        (total, order) => total + Number(order.totalAmount),
        0,
      ),
      marketplaceOrders: marketplaceOrders.length,
    },
    daily,
    topPlans: [...planMap.values()]
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 5),
  };
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, ChartNoAxesCombined, ShieldCheck, Timer } from "lucide-react";
import { OrderStatus, UserRole } from "@prisma/client";
import {
  DashboardCharts,
  type ReadingChartPoint,
  type RevenueChartPoint,
} from "@/components/dashboard/DashboardCharts";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { loadSellerQualityScores } from "@/lib/seller-quality-data";

export const metadata: Metadata = {
  title: "Dashboard | BookVerse AI",
  description: "Thống kê thói quen đọc sách và doanh thu chợ sách trên BookVerse AI.",
};

const paidOrderStatuses = [
  OrderStatus.PAID,
  OrderStatus.PAID_DEMO,
  OrderStatus.SHIPPED,
  OrderStatus.COMPLETED,
];

const numberFormatter = new Intl.NumberFormat("vi-VN");
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
});

interface ReadingSessionRow {
  createdAt: Date;
  currentPage: number;
  timeSpent: number;
}

interface RevenueItemRow {
  quantity: number;
  totalPrice: {
    toString: () => string;
  };
  order: {
    id: string;
    createdAt: Date;
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(
    2,
    "0",
  )}`;
}

function buildDayLabels(days: number): Array<{ date: Date; key: string; label: string }> {
  const today = startOfDay(new Date());
  const startDate = addDays(today, -(days - 1));

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(startDate, index);
    return {
      date,
      key: dayKey(date),
      label: dateFormatter.format(date),
    };
  });
}

function buildReadingChartData(sessions: ReadingSessionRow[]): ReadingChartPoint[] {
  const labels = buildDayLabels(14);
  const dailyPages = new Map<string, Set<number>>();
  const dailyStats = new Map<string, { minutes: number; sessions: number }>();

  for (const session of sessions) {
    const key = dayKey(session.createdAt);
    const stats = dailyStats.get(key) ?? { minutes: 0, sessions: 0 };
    stats.minutes += Math.ceil(session.timeSpent / 60);
    stats.sessions += 1;
    dailyStats.set(key, stats);

    const pages = dailyPages.get(key) ?? new Set<number>();
    pages.add(session.currentPage);
    dailyPages.set(key, pages);
  }

  return labels.map((label) => ({
    label: label.label,
    minutes: dailyStats.get(label.key)?.minutes ?? 0,
    pages: dailyPages.get(label.key)?.size ?? 0,
    sessions: dailyStats.get(label.key)?.sessions ?? 0,
  }));
}

function buildRevenueChartData(items: RevenueItemRow[]): RevenueChartPoint[] {
  const labels = buildDayLabels(30);
  const dailyOrders = new Map<string, Set<string>>();
  const dailyStats = new Map<string, { revenue: number; items: number }>();

  for (const item of items) {
    const key = dayKey(item.order.createdAt);
    const stats = dailyStats.get(key) ?? { revenue: 0, items: 0 };
    stats.revenue += Number(item.totalPrice.toString());
    stats.items += item.quantity;
    dailyStats.set(key, stats);

    const orders = dailyOrders.get(key) ?? new Set<string>();
    orders.add(item.order.id);
    dailyOrders.set(key, orders);
  }

  return labels.map((label) => ({
    label: label.label,
    revenue: dailyStats.get(label.key)?.revenue ?? 0,
    orders: dailyOrders.get(label.key)?.size ?? 0,
    items: dailyStats.get(label.key)?.items ?? 0,
  }));
}

function sumNumbers(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user || user.isLocked) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const userId = user.id;
  const isPlatformManager = user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;
  const readingStartDate = buildDayLabels(14)[0]?.date ?? startOfDay(new Date());
  const revenueStartDate = buildDayLabels(30)[0]?.date ?? startOfDay(new Date());

  const [readingSessions, readingProgress, revenueItems, sellerQualityScores] = await Promise.all([
    prisma.readingSession.findMany({
      where: {
        createdAt: {
          gte: readingStartDate,
        },
        userId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        createdAt: true,
        currentPage: true,
        timeSpent: true,
      },
    }),
    prisma.readingProgress.findMany({
      where: {
        userId,
      },
      orderBy: [
        {
          lastReadAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
      select: {
        book: {
          select: {
            authorName: true,
            coverPath: true,
            title: true,
          },
        },
        currentPage: true,
        lastReadAt: true,
        progressPercent: true,
        totalMinutes: true,
        updatedAt: true,
      },
      take: 5,
    }),
    prisma.orderItem.findMany({
      where: {
        ...(isPlatformManager
          ? {}
          : {
              listing: {
                is: {
                  sellerId: userId,
                },
              },
            }),
        order: {
          createdAt: {
            gte: revenueStartDate,
          },
          status: {
            in: paidOrderStatuses,
          },
        },
      },
      select: {
        order: {
          select: {
            createdAt: true,
            id: true,
          },
        },
        quantity: true,
        totalPrice: true,
      },
    }),
    loadSellerQualityScores([userId]),
  ]);
  const sellerQualityScore = sellerQualityScores.get(userId);

  const readingChartData = buildReadingChartData(readingSessions);
  const revenueChartData = buildRevenueChartData(revenueItems);
  const totalReadingMinutes = sumNumbers(readingProgress.map((item) => item.totalMinutes));
  const completedBooks = readingProgress.filter((item) => item.progressPercent >= 99).length;
  const averageProgress =
    readingProgress.length > 0
      ? Math.round(sumNumbers(readingProgress.map((item) => item.progressPercent)) / readingProgress.length)
      : 0;
  const totalRevenue = sumNumbers(revenueItems.map((item) => Number(item.totalPrice.toString())));
  const totalSellerItems = sumNumbers(revenueItems.map((item) => item.quantity));
  const uniqueOrders = new Set(revenueItems.map((item) => item.order.id)).size;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.2),transparent_34%),linear-gradient(180deg,#020617_0%,#111827_52%,#18181b_100%)] px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#F2C14E]">BookVerse AI</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Smart Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Một màn hình thống kê chung cho thói quen đọc của user và hiệu quả bán sách của seller/admin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] px-4 text-sm font-bold text-zinc-100 transition hover:bg-white/[0.12]"
              href="/profile"
            >
              Hồ sơ đọc
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#D6A84F] px-4 text-sm font-bold text-slate-950 transition hover:bg-[#F2C14E]"
              href="/marketplace"
            >
              Mở chợ sách
            </Link>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
            <Timer className="h-5 w-5 text-[#7DD3C7]" aria-hidden="true" />
            <p className="mt-4 text-2xl font-black">{numberFormatter.format(totalReadingMinutes)}</p>
            <p className="mt-1 text-sm text-zinc-400">Tổng phút đã đọc</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
            <BookOpenCheck className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
            <p className="mt-4 text-2xl font-black">{completedBooks}</p>
            <p className="mt-1 text-sm text-zinc-400">Sách đã hoàn thành</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
            <ChartNoAxesCombined className="h-5 w-5 text-[#7DD3C7]" aria-hidden="true" />
            <p className="mt-4 text-2xl font-black">{averageProgress}%</p>
            <p className="mt-1 text-sm text-zinc-400">Tiến độ trung bình</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
            <ShieldCheck className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
            <p className="mt-4 text-2xl font-black">{currencyFormatter.format(totalRevenue)}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {uniqueOrders} đơn / {totalSellerItems} sản phẩm
            </p>
          </div>
        </section>

        <div className="mt-5">
          <DashboardCharts readingData={readingChartData} revenueData={revenueChartData} />
        </div>

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Sách đang đọc</h2>
                <p className="mt-1 text-sm text-zinc-400">Lấy trực tiếp từ bảng `reading_progress` của user hiện tại.</p>
              </div>
              <Link className="text-sm font-bold text-[#F2C14E] hover:underline" href="/catalog">
                Danh mục sách
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {readingProgress.length > 0 ? (
                readingProgress.map((item) => (
                  <article
                    className="rounded-xl border border-white/10 bg-white/[0.05] p-4 transition hover:bg-white/[0.08]"
                    key={`${item.book.title}-${item.currentPage}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-zinc-50">{item.book.title}</h3>
                        <p className="mt-1 text-sm text-zinc-400">{item.book.authorName}</p>
                      </div>
                      <span className="rounded-full bg-[#0F766E]/18 px-3 py-1 text-xs font-bold text-[#7DD3C7] ring-1 ring-[#0F766E]/35">
                        {Math.round(item.progressPercent)}%
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#D6A84F]"
                        style={{ width: `${Math.min(Math.max(item.progressPercent, 0), 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      Trang {item.currentPage} - {item.totalMinutes} phút - đọc gần nhất{" "}
                      {dateFormatter.format(item.lastReadAt ?? item.updatedAt)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-white/12 bg-white/[0.04] p-4 text-sm text-zinc-400">
                  Chưa có tiến độ đọc. Hãy mở một cuốn sách và lưu tiến độ để dashboard có dữ liệu.
                </p>
              )}
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-white/10 bg-zinc-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <h2 className="text-xl font-black">Điểm chất lượng theo quy tắc</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Công thức deterministic v1 từ đơn hoàn tất/hủy và chất lượng listing; không phải điểm AI.
            </p>

            {sellerQualityScore ? (
              <div className="mt-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-4xl font-black text-[#F2C14E]">{sellerQualityScore.score.toFixed(1)}</p>
                    <p className="text-sm text-zinc-400">/ 100 điểm</p>
                  </div>
                  <span className="rounded-full border border-[#0F766E]/35 bg-[#0F766E]/18 px-3 py-1 text-xs font-bold text-[#7DD3C7]">
                    {sellerQualityScore.badge}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
                    <p className="text-lg font-black">{sellerQualityScore.facts.completedOrders}</p>
                    <p className="text-xs text-zinc-500">Đơn hoàn tất</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
                    <p className="text-lg font-black">{sellerQualityScore.facts.cancelledOrders}</p>
                    <p className="text-xs text-zinc-500">Đơn đã hủy</p>
                  </div>
                </div>

                <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm leading-6 text-zinc-300">
                  {sellerQualityScore.reasons.join(" ")}
                </p>
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-white/12 bg-white/[0.04] p-4 text-sm leading-6 text-zinc-400">
                Chưa tính được điểm chất lượng theo quy tắc cho tài khoản này.
              </p>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

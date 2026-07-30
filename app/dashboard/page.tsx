import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpenCheck, ChartNoAxesCombined, ShieldCheck, Sparkles, Timer } from "lucide-react";
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
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-[#F2C14E]" aria-hidden="true" />
              Tổng quan cá nhân
            </div>
            <h1 className="bv-editorial mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Chào {user.name}
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-[#D9EEEA]">
              Theo dõi hành trình đọc, hiệu quả bán sách và những chỉ số quan trọng trong một màn hình.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2C14E]"
              href="/read"
            >
              Tiếp tục đọc
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F2C14E] px-4 text-sm font-black text-[#17202A] transition hover:bg-[#FFD46B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              href="/marketplace"
            >
              Mở chợ sách
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section aria-label="Chỉ số tổng quan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#176B62]/15 bg-white p-5 shadow-sm">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6F3F0] text-[#176B62]">
              <Timer className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-2xl font-black tabular-nums text-[#17202A]">{numberFormatter.format(totalReadingMinutes)}</p>
            <p className="mt-1 text-sm font-medium text-[#66706B]">Tổng phút đã đọc</p>
          </div>
          <div className="rounded-2xl border border-[#B17700]/15 bg-white p-5 shadow-sm">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF4DD] text-[#9B6700]">
              <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-2xl font-black tabular-nums text-[#17202A]">{completedBooks}</p>
            <p className="mt-1 text-sm font-medium text-[#66706B]">Sách đã hoàn thành</p>
          </div>
          <div className="rounded-2xl border border-[#176B62]/15 bg-white p-5 shadow-sm">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6F3F0] text-[#176B62]">
              <ChartNoAxesCombined className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-2xl font-black tabular-nums text-[#17202A]">{averageProgress}%</p>
            <p className="mt-1 text-sm font-medium text-[#66706B]">Tiến độ trung bình</p>
          </div>
          <div className="rounded-2xl border border-[#C65D43]/15 bg-white p-5 shadow-sm">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF0EB] text-[#C65D43]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-2xl font-black tabular-nums text-[#17202A]">{currencyFormatter.format(totalRevenue)}</p>
            <p className="mt-1 text-sm font-medium text-[#66706B]">
              {uniqueOrders} đơn / {totalSellerItems} sản phẩm
            </p>
          </div>
        </section>

        <div className="mt-5">
          <DashboardCharts readingData={readingChartData} revenueData={revenueChartData} />
        </div>

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-[#176B62]/15 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[#17202A]">Sách đang đọc</h2>
                <p className="mt-1 text-sm text-[#66706B]">Các cuốn vừa đọc và tiến độ mới nhất của bạn.</p>
              </div>
              <Link className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-bold text-[#176B62] transition hover:bg-[#E6F3F0] hover:underline" href="/catalog">
                Danh mục sách
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {readingProgress.length > 0 ? (
                readingProgress.map((item) => (
                  <article
                    className="rounded-xl border border-[#D8D0C2] bg-[#FFFDF8] p-4 transition hover:border-[#176B62]/30 hover:bg-[#F7FBF9]"
                    key={`${item.book.title}-${item.currentPage}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-[#17202A]">{item.book.title}</h3>
                        <p className="mt-1 text-sm text-[#66706B]">{item.book.authorName}</p>
                      </div>
                      <span className="rounded-full bg-[#E6F3F0] px-3 py-1 text-xs font-bold text-[#176B62] ring-1 ring-[#176B62]/20">
                        {Math.round(item.progressPercent)}%
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E7E0D5]">
                      <div
                        className="h-full rounded-full bg-[#D6A84F]"
                        style={{ width: `${Math.min(Math.max(item.progressPercent, 0), 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#66706B]">
                      Trang {item.currentPage} - {item.totalMinutes} phút - đọc gần nhất{" "}
                      {dateFormatter.format(item.lastReadAt ?? item.updatedAt)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-[#D8D0C2] bg-[#F7F4ED] p-4 text-sm text-[#66706B]">
                  Chưa có tiến độ đọc. Hãy mở một cuốn sách và lưu tiến độ để dashboard có dữ liệu.
                </p>
              )}
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-[#C65D43]/15 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#17202A]">Uy tín người bán</h2>
            <p className="mt-1 text-sm leading-6 text-[#66706B]">
              Điểm được tính từ đơn hoàn tất, đơn hủy và chất lượng tin đăng.
            </p>

            {sellerQualityScore ? (
              <div className="mt-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-4xl font-black text-[#C65D43]">{sellerQualityScore.score.toFixed(1)}</p>
                    <p className="text-sm text-[#66706B]">/ 100 điểm</p>
                  </div>
                  <span className="rounded-full border border-[#176B62]/20 bg-[#E6F3F0] px-3 py-1 text-xs font-bold text-[#176B62]">
                    {sellerQualityScore.badge}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#D8D0C2] bg-[#FFFDF8] p-3">
                    <p className="text-lg font-black text-[#17202A]">{sellerQualityScore.facts.completedOrders}</p>
                    <p className="text-xs text-[#66706B]">Đơn hoàn tất</p>
                  </div>
                  <div className="rounded-xl border border-[#D8D0C2] bg-[#FFFDF8] p-3">
                    <p className="text-lg font-black text-[#17202A]">{sellerQualityScore.facts.cancelledOrders}</p>
                    <p className="text-xs text-[#66706B]">Đơn đã hủy</p>
                  </div>
                </div>

                <p className="mt-4 rounded-xl border border-[#176B62]/15 bg-[#E6F3F0] p-3 text-sm leading-6 text-[#31544F]">
                  {sellerQualityScore.reasons.join(" ")}
                </p>
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-[#D8D0C2] bg-[#F7F4ED] p-4 text-sm leading-6 text-[#66706B]">
                Chưa tính được điểm chất lượng theo quy tắc cho tài khoản này.
              </p>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ReadingChartPoint {
  label: string;
  minutes: number;
  pages: number;
  sessions: number;
}

export interface RevenueChartPoint {
  label: string;
  revenue: number;
  orders: number;
  items: number;
}

interface DashboardChartsProps {
  readingData: ReadingChartPoint[];
  revenueData: RevenueChartPoint[];
}

const tooltipStyle = {
  background: "rgba(15, 23, 42, 0.94)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "12px",
  color: "#F8FAFC",
};

const labelStyle = {
  color: "#CBD5E1",
  fontWeight: 700,
};

const axisTick = {
  fill: "#94A3B8",
  fontSize: 12,
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});

export function DashboardCharts({ readingData, revenueData }: DashboardChartsProps) {
  const readingSummary = useMemo(
    () =>
      readingData.reduce(
        (summary, item) => ({
          minutes: summary.minutes + item.minutes,
          pages: summary.pages + item.pages,
          sessions: summary.sessions + item.sessions,
        }),
        { minutes: 0, pages: 0, sessions: 0 },
      ),
    [readingData],
  );

  const revenueSummary = useMemo(
    () =>
      revenueData.reduce(
        (summary, item) => ({
          revenue: summary.revenue + item.revenue,
          orders: summary.orders + item.orders,
          items: summary.items + item.items,
        }),
        { revenue: 0, orders: 0, items: 0 },
      ),
    [revenueData],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 text-zinc-100 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#7DD3C7]">User Dashboard</p>
            <h2 className="mt-2 text-xl font-black">Thói quen đọc sách</h2>
            <p className="mt-1 text-sm text-zinc-400">Theo dõi phút đọc và số trang đã chạm trong 14 ngày gần nhất.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
              <p className="text-lg font-black text-[#F2C14E]">{readingSummary.minutes}</p>
              <p className="text-[11px] font-bold uppercase text-zinc-500">Phút</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
              <p className="text-lg font-black text-[#7DD3C7]">{readingSummary.pages}</p>
              <p className="text-[11px] font-bold uppercase text-zinc-500">Trang</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
              <p className="text-lg font-black text-zinc-50">{readingSummary.sessions}</p>
              <p className="text-[11px] font-bold uppercase text-zinc-500">Phiên</p>
            </div>
          </div>
        </div>

        <div className="mt-6 h-80">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={readingData} margin={{ bottom: 0, left: -10, right: 8, top: 12 }}>
              <defs>
                <linearGradient id="readingMinutesGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#0F766E" stopOpacity={0.62} />
                  <stop offset="95%" stopColor="#0F766E" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} />
              <YAxis tick={axisTick} tickLine={false} width={36} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Area
                dataKey="minutes"
                fill="url(#readingMinutesGradient)"
                name="Phút đọc"
                stroke="#0F766E"
                strokeWidth={3}
                type="monotone"
              />
              <Area
                dataKey="pages"
                fill="rgba(242,193,78,0.08)"
                name="Trang đọc"
                stroke="#F2C14E"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/72 p-5 text-zinc-100 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#F2C14E]">Seller Dashboard</p>
            <h2 className="mt-2 text-xl font-black">Doanh thu chợ sách</h2>
            <p className="mt-1 text-sm text-zinc-400">Tổng hợp đơn đã thanh toán, đang giao hoặc hoàn tất trong 30 ngày.</p>
          </div>
          <div className="rounded-xl border border-[#F2C14E]/20 bg-[#F2C14E]/10 px-4 py-3 text-right">
            <p className="text-lg font-black text-[#F2C14E]">{currencyFormatter.format(revenueSummary.revenue)}</p>
            <p className="text-xs font-bold text-zinc-400">
              {revenueSummary.orders} đơn / {revenueSummary.items} sản phẩm
            </p>
          </div>
        </div>

        <div className="mt-6 h-80">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={revenueData} margin={{ bottom: 0, left: 4, right: 8, top: 12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} />
              <YAxis
                tick={axisTick}
                tickFormatter={(value) => `${Number(value) / 1000}k`}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [
                  name === "Doanh thu" ? currencyFormatter.format(Number(value)) : value,
                  name,
                ]}
                labelStyle={labelStyle}
              />
              <Bar dataKey="revenue" fill="#D6A84F" name="Doanh thu" radius={[8, 8, 0, 0]} />
              <Bar dataKey="orders" fill="#0F766E" name="Số đơn" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

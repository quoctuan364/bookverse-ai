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
  background: "#102B2A",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  borderRadius: "12px",
  color: "#FFFDF8",
};

const labelStyle = {
  color: "#D9EEEA",
  fontWeight: 700,
};

const axisTick = {
  fill: "#68736E",
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
      <section
        aria-labelledby="reading-chart-title"
        className="rounded-2xl border border-[#176B62]/15 bg-white p-5 shadow-[0_16px_45px_rgba(23,107,98,0.08)]"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#176B62]">Nhịp đọc 14 ngày</p>
            <h2 className="mt-2 text-xl font-black text-[#17202A]" id="reading-chart-title">Thói quen đọc sách</h2>
            <p className="mt-1 text-sm leading-6 text-[#66706B]">Phút đọc và số trang đã chạm theo từng ngày.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#FFF4DD] px-3 py-2">
              <p className="text-lg font-black text-[#8A5A00]">{readingSummary.minutes}</p>
              <p className="text-[11px] font-bold uppercase text-[#7A6540]">Phút</p>
            </div>
            <div className="rounded-xl bg-[#E6F3F0] px-3 py-2">
              <p className="text-lg font-black text-[#176B62]">{readingSummary.pages}</p>
              <p className="text-[11px] font-bold uppercase text-[#456862]">Trang</p>
            </div>
            <div className="rounded-xl bg-[#F2EEE6] px-3 py-2">
              <p className="text-lg font-black text-[#17202A]">{readingSummary.sessions}</p>
              <p className="text-[11px] font-bold uppercase text-[#66706B]">Phiên</p>
            </div>
          </div>
        </div>

        <div className="mt-6 h-72 sm:h-80" role="img" aria-label="Biểu đồ vùng thói quen đọc trong 14 ngày">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={readingData} margin={{ bottom: 0, left: -10, right: 8, top: 12 }}>
              <defs>
                <linearGradient id="readingMinutesGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#0F766E" stopOpacity={0.62} />
                  <stop offset="95%" stopColor="#0F766E" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E7E0D5" strokeDasharray="3 3" vertical={false} />
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

      <section
        aria-labelledby="revenue-chart-title"
        className="rounded-2xl border border-[#C65D43]/15 bg-white p-5 shadow-[0_16px_45px_rgba(198,93,67,0.08)]"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#C65D43]">Kết quả 30 ngày</p>
            <h2 className="mt-2 text-xl font-black text-[#17202A]" id="revenue-chart-title">Doanh thu chợ sách</h2>
            <p className="mt-1 text-sm leading-6 text-[#66706B]">Các đơn đã thanh toán, đang giao hoặc hoàn tất.</p>
          </div>
          <div className="rounded-xl border border-[#C65D43]/15 bg-[#FFF0EB] px-4 py-3 text-right">
            <p className="text-lg font-black text-[#B44F37]">{currencyFormatter.format(revenueSummary.revenue)}</p>
            <p className="text-xs font-bold text-[#765B54]">
              {revenueSummary.orders} đơn / {revenueSummary.items} sản phẩm
            </p>
          </div>
        </div>

        <div className="mt-6 h-72 sm:h-80" role="img" aria-label="Biểu đồ cột doanh thu chợ sách trong 30 ngày">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={revenueData} margin={{ bottom: 0, left: 4, right: 8, top: 12 }}>
              <CartesianGrid stroke="#E7E0D5" strokeDasharray="3 3" vertical={false} />
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
              <Bar dataKey="revenue" fill="#C65D43" name="Doanh thu" radius={[8, 8, 0, 0]} />
              <Bar dataKey="orders" fill="#0F766E" name="Số đơn" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

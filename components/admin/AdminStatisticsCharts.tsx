"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Compass, Layers, UserPlus } from "lucide-react";
import type { AdminStatisticsData } from "@/actions/admin-statistics.actions";

interface AdminStatisticsChartsProps {
  data: AdminStatisticsData;
}

const COLORS = {
  primary: "#0D9488",
  secondary: "#6366F1",
  indigo: "#6366F1",
  amber: "#F59E0B",
  grid: "#F1F5F9",
  text: "#64748B",
};

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; fill?: string }>;
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;

  const names: Record<string, { label: string; color: string }> = {
    views: { label: "Lượt xem sách", color: "#0D9488" },
    sessions: { label: "Phiên đọc thực tế", color: "#6366F1" },
    newUsers: { label: "Tài khoản mới", color: "#6366F1" },
    count: { label: "Số lượt tương tác", color: "#F59E0B" },
    totalStock: { label: "Số sách tồn", color: "#F59E0B" },
  };

  return (
    <div className="min-w-52 rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md">
      <p className="text-xs font-black text-slate-800 border-b border-slate-100 pb-1.5">{label}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => {
          const info = names[entry.name ?? ""] ?? {
            label: entry.name ?? "",
            color: entry.color || entry.fill || "#0D9488",
          };
          return (
            <div className="flex items-center justify-between gap-4 text-xs" key={entry.name}>
              <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
                {info.label}
              </span>
              <span className="font-black tabular-nums text-slate-900">
                {(entry.value ?? 0).toLocaleString("vi-VN")} {suffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartCard({
  icon: Icon,
  title,
  subtitle,
  badge,
  iconBg = "bg-teal-50 text-teal-700",
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  subtitle: string;
  badge: string;
  iconBg?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} shadow-xs`}>
              <Icon aria-hidden={true} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-900 tracking-tight">{title}</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">{subtitle}</p>
            </div>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-xs sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {badge}
          </span>
        </div>
      </div>
      <div className="mt-5 h-[290px] min-w-0">{children}</div>
    </article>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function AdminStatisticsCharts({ data }: AdminStatisticsChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="grid gap-6 lg:grid-cols-2" aria-label="Đang tải biểu đồ thống kê">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="h-[390px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80" key={index} />
        ))}
      </div>
    );
  }

  const categories = data.categoryViews.slice(0, 8);
  const interactions = data.interactionBreakdown.slice(0, 8);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard
        badge="30 ngày qua"
        icon={Activity}
        iconBg="bg-teal-50 text-teal-700"
        subtitle="Lượt xem sách chi tiết và các phiên đọc thực tế của độc giả theo ngày."
        title="Lượt xem sách & phiên đọc theo ngày"
      >
        <div aria-label="Biểu đồ lượt xem sách và phiên đọc trong 30 ngày" className="h-full" role="img">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={data.dailyActivity} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="adminViewsGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0D9488" stopOpacity={0.35} />
                  <stop offset="60%" stopColor="#0D9488" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="adminSessionsGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} />
                  <stop offset="60%" stopColor="#6366F1" stopOpacity={0.05} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="label" fontSize={10} interval={4} stroke={COLORS.text} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} fontSize={11} stroke={COLORS.text} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                align="right"
                formatter={(value) => (value === "views" ? "Lượt xem sách" : "Phiên đọc")}
                height={32}
                iconType="circle"
                verticalAlign="top"
              />
              <Area
                activeDot={{ r: 5, stroke: "#0D9488", strokeWidth: 2, fill: "#FFFFFF" }}
                dataKey="views"
                fill="url(#adminViewsGradient)"
                name="views"
                stroke="#0D9488"
                strokeWidth={2.5}
                type="monotone"
              />
              <Area
                activeDot={{ r: 5, stroke: "#6366F1", strokeWidth: 2, fill: "#FFFFFF" }}
                dataKey="sessions"
                fill="url(#adminSessionsGradient)"
                name="sessions"
                stroke="#6366F1"
                strokeWidth={2.5}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        badge={`${categories.length} chủ đề`}
        icon={Layers}
        iconBg="bg-emerald-50 text-emerald-700"
        subtitle="Xếp hạng thể loại theo số lượt mở trang chi tiết sách."
        title="Lượt xem sách theo thể loại"
      >
        {categories.length === 0 ? (
          <EmptyChart>Chưa có lượt xem sách trong 30 ngày qua.</EmptyChart>
        ) : (
          <div aria-label="Biểu đồ lượt xem sách theo chủ đề" className="h-full" role="img">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={categories} layout="vertical" margin={{ top: 0, right: 42, left: 16, bottom: 0 }}>
                <defs>
                  <linearGradient id="categoryBarGradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#0D9488" />
                    <stop offset="100%" stopColor="#14B8A6" />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} stroke={COLORS.grid} strokeDasharray="3 3" />
                <XAxis allowDecimals={false} axisLine={false} fontSize={11} stroke={COLORS.text} tickLine={false} type="number" />
                <YAxis
                  axisLine={false}
                  dataKey="category"
                  fontSize={10}
                  stroke={COLORS.text}
                  tickFormatter={(value: string) => (value.length > 18 ? `${value.slice(0, 18)}…` : value)}
                  tickLine={false}
                  type="category"
                  width={116}
                />
                <Tooltip content={<ChartTooltip suffix="lượt" />} cursor={{ fill: "#F8FAFC", radius: 4 }} />
                <Bar dataKey="views" fill="url(#categoryBarGradient)" name="views" radius={[0, 8, 8, 0]}>
                  <LabelList
                    dataKey="views"
                    fill="#0F766E"
                    fontSize={11}
                    fontWeight={800}
                    formatter={(val: unknown) => Number(val ?? 0).toLocaleString("vi-VN")}
                    position="right"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard
        badge={`${data.summary.totalNewUsers30d.toLocaleString("vi-VN")} tài khoản`}
        icon={UserPlus}
        iconBg="bg-indigo-50 text-indigo-700"
        subtitle="Số tài khoản được đăng ký mới theo từng ngày trong hệ thống."
        title="Độc giả mới trong 30 ngày"
      >
        <div aria-label="Biểu đồ tài khoản mới trong 30 ngày" className="h-full" role="img">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={data.registrations} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="userBarGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="label" fontSize={10} interval={4} stroke={COLORS.text} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} fontSize={11} stroke={COLORS.text} tickLine={false} />
              <Tooltip content={<ChartTooltip suffix="tài khoản" />} cursor={{ fill: "rgba(99, 102, 241, 0.06)", radius: 4 }} />
              <Bar dataKey="newUsers" fill="url(#userBarGradient)" name="newUsers" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        badge={`${data.summary.totalInteractions30d.toLocaleString("vi-VN")} lượt`}
        icon={Compass}
        iconBg="bg-amber-50 text-amber-700"
        subtitle="Phân bố các hành vi thực tế: đọc sách, xem chi tiết, tìm kiếm, đánh dấu, bình luận..."
        title="Cơ cấu tương tác độc giả (30 ngày)"
      >
        {interactions.length === 0 ? (
          <EmptyChart>Chưa có dữ liệu tương tác độc giả trong 30 ngày.</EmptyChart>
        ) : (
          <div aria-label="Biểu đồ cơ cấu tương tác độc giả trong 30 ngày" className="h-full" role="img">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={interactions} layout="vertical" margin={{ top: 0, right: 65, left: 16, bottom: 0 }}>
                <defs>
                  <linearGradient id="interactionBarGradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} stroke={COLORS.grid} strokeDasharray="3 3" />
                <XAxis allowDecimals={false} axisLine={false} fontSize={11} stroke={COLORS.text} tickLine={false} type="number" />
                <YAxis
                  axisLine={false}
                  dataKey="label"
                  fontSize={10}
                  stroke={COLORS.text}
                  tickFormatter={(value: string) => (value.length > 20 ? `${value.slice(0, 20)}…` : value)}
                  tickLine={false}
                  type="category"
                  width={130}
                />
                <Tooltip content={<ChartTooltip suffix="lượt" />} cursor={{ fill: "#FFFBEB", radius: 4 }} />
                <Bar dataKey="count" fill="url(#interactionBarGradient)" name="count" radius={[0, 8, 8, 0]}>
                  <LabelList
                    dataKey="count"
                    fill="#B45309"
                    fontSize={11}
                    fontWeight={800}
                    formatter={(val: unknown) => `${Number(val ?? 0).toLocaleString("vi-VN")} lượt`}
                    position="right"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </div>
  );
}

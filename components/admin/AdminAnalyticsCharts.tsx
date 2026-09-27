"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface AdminAnalyticsPoint {
  key: string;
  label: string;
  membershipRevenue: number;
  membershipPayments: number;
  marketplaceRevenue: number;
  marketplaceOrders: number;
}

const money = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  notation: "compact",
  style: "currency",
});

function AnalyticsTooltip({
  active,
  payload,
  label,
  isCurrency = false,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; fill?: string }>;
  label?: string;
  isCurrency?: boolean;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-48 rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md">
      <p className="text-xs font-black text-slate-800 border-b border-slate-100 pb-1.5">{label}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => {
          const color = entry.color || entry.fill || "#0D9488";
          return (
            <div className="flex items-center justify-between gap-4 text-xs" key={entry.name}>
              <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                {entry.name}
              </span>
              <span className="font-black tabular-nums text-slate-900">
                {isCurrency
                  ? money.format(Number(entry.value ?? 0))
                  : `${(entry.value ?? 0).toLocaleString("vi-VN")} đơn`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminAnalyticsCharts({ data }: { data: AdminAnalyticsPoint[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section
        aria-labelledby="admin-revenue-chart-title"
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900" id="admin-revenue-chart-title">
              Doanh thu trong 30 ngày
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              So sánh nguồn thu giữa gói hội viên và các giao dịch chợ sách cũ.
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
            30 ngày
          </span>
        </div>
        <div className="mt-5 h-80" role="img" aria-label="Biểu đồ cột doanh thu theo ngày">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={data} margin={{ left: 0, right: 8, top: 12 }}>
              <defs>
                <linearGradient id="membershipGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0D9488" />
                  <stop offset="100%" stopColor="#0F766E" />
                </linearGradient>
                <linearGradient id="marketplaceGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={10} interval={4} stroke="#64748B" tickLine={false} />
              <YAxis
                fontSize={11}
                stroke="#64748B"
                tickFormatter={(value) => money.format(Number(value))}
                tickLine={false}
                width={58}
              />
              <Tooltip content={<AnalyticsTooltip isCurrency />} cursor={{ fill: "#F8FAFC", radius: 4 }} />
              <Legend
                align="right"
                height={32}
                iconType="circle"
                verticalAlign="top"
              />
              <Bar
                dataKey="membershipRevenue"
                fill="url(#membershipGrad)"
                name="Gói hội viên"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="marketplaceRevenue"
                fill="url(#marketplaceGrad)"
                name="Chợ sách cũ"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section
        aria-labelledby="admin-transaction-chart-title"
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900" id="admin-transaction-chart-title">
              Số lượng giao dịch
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Theo dõi lượt thanh toán hội viên và đơn hàng chợ sách cũ mỗi ngày.
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
            Giao dịch
          </span>
        </div>
        <div className="mt-5 h-80" role="img" aria-label="Biểu đồ đường số giao dịch theo ngày">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={data} margin={{ left: -18, right: 8, top: 12 }}>
              <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={10} interval={4} stroke="#64748B" tickLine={false} />
              <YAxis allowDecimals={false} fontSize={11} stroke="#64748B" tickLine={false} />
              <Tooltip content={<AnalyticsTooltip isCurrency={false} />} />
              <Legend
                align="right"
                height={32}
                iconType="circle"
                verticalAlign="top"
              />
              <Line
                activeDot={{ r: 5, stroke: "#0D9488", strokeWidth: 2, fill: "#FFFFFF" }}
                dataKey="membershipPayments"
                dot={false}
                name="Thanh toán hội viên"
                stroke="#0D9488"
                strokeWidth={2.5}
                type="monotone"
              />
              <Line
                activeDot={{ r: 5, stroke: "#F59E0B", strokeWidth: 2, fill: "#FFFFFF" }}
                dataKey="marketplaceOrders"
                dot={false}
                name="Đơn chợ sách"
                stroke="#F59E0B"
                strokeWidth={2.5}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

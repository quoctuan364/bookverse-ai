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

const tooltipStyle = {
  background: "#102B2A",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: "12px",
  color: "#FFFDF8",
};

export function AdminAnalyticsCharts({ data }: { data: AdminAnalyticsPoint[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section
        aria-labelledby="admin-revenue-chart-title"
        className="rounded-2xl border border-[#176B62]/15 bg-white p-5 shadow-sm"
      >
        <h2 className="text-xl font-black text-[#17202A]" id="admin-revenue-chart-title">
          Doanh thu 30 ngày
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#66706B]">
          So sánh hội viên và chợ sách; số liệu demo được ghi riêng theo nguồn.
        </p>
        <div className="mt-5 h-80" role="img" aria-label="Biểu đồ cột doanh thu theo ngày">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="#E7E0D5" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={11} interval={4} tickLine={false} />
              <YAxis
                fontSize={11}
                tickFormatter={(value) => money.format(Number(value))}
                tickLine={false}
                width={58}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [money.format(Number(value)), name]}
              />
              <Legend />
              <Bar
                dataKey="membershipRevenue"
                fill="#176B62"
                name="Hội viên"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="marketplaceRevenue"
                fill="#C65D43"
                name="Chợ sách"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section
        aria-labelledby="admin-transaction-chart-title"
        className="rounded-2xl border border-[#176B62]/15 bg-white p-5 shadow-sm"
      >
        <h2 className="text-xl font-black text-[#17202A]" id="admin-transaction-chart-title">
          Số giao dịch
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#66706B]">
          Theo dõi lượng thanh toán hội viên và đơn marketplace mỗi ngày.
        </p>
        <div className="mt-5 h-80" role="img" aria-label="Biểu đồ đường số giao dịch theo ngày">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid stroke="#E7E0D5" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={11} interval={4} tickLine={false} />
              <YAxis allowDecimals={false} fontSize={11} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line
                dataKey="membershipPayments"
                dot={false}
                name="Thanh toán hội viên"
                stroke="#176B62"
                strokeWidth={3}
                type="monotone"
              />
              <Line
                dataKey="marketplaceOrders"
                dot={false}
                name="Đơn chợ sách"
                stroke="#C65D43"
                strokeWidth={3}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

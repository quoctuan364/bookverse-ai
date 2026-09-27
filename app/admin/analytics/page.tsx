import {
  ArrowLeft,
  BarChart3,
  Bot,
  CircleDollarSign,
  Crown,
  Download,
  MessageSquareMore,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";

import { getAdminAnalytics } from "@/actions/admin-analytics.actions";
import { AdminAnalyticsCharts } from "@/components/admin/AdminAnalyticsCharts";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});

export default async function AdminAnalyticsPage() {
  const data = await getAdminAnalytics();
  const feedbackTotal =
    data.summary.helpfulFeedback + data.summary.unhelpfulFeedback;
  const helpfulRate =
    feedbackTotal > 0
      ? Math.round((data.summary.helpfulFeedback / feedbackTotal) * 100)
      : null;

  const cards = [
    {
      icon: Users,
      label: "Tổng người dùng",
      value: data.summary.totalUsers.toLocaleString("vi-VN"),
      note: "Tài khoản hiện có trong database",
    },
    {
      icon: Crown,
      label: "Hội viên còn hạn",
      value: data.summary.activeSubscriptions.toLocaleString("vi-VN"),
      note: "Tài khoản đang có quyền đọc hội viên",
    },
    {
      icon: CircleDollarSign,
      label: "Doanh thu hội viên",
      value: money.format(data.summary.membershipRevenue),
      note: `${data.summary.membershipPayments} thanh toán trong 30 ngày`,
    },
    {
      icon: ShoppingBag,
      label: "Doanh thu chợ sách",
      value: money.format(data.summary.marketplaceRevenue),
      note: `${data.summary.marketplaceOrders} đơn hợp lệ trong 30 ngày`,
    },
    {
      icon: Bot,
      label: "Phiên Nova",
      value: data.summary.chatbotSessions.toLocaleString("vi-VN"),
      note: "phát sinh trong 30 ngày",
    },
    {
      icon: MessageSquareMore,
      label: "Phản hồi AI hữu ích",
      value: helpfulRate === null ? "Chưa có" : `${helpfulRate}%`,
      note: `${feedbackTotal} lượt đánh giá trong kỳ`,
    },
  ];

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-black text-[#D9EEEA] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
            href="/admin"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại Admin Center
          </Link>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-bv-gold" aria-hidden="true" />
            Báo cáo điều hành
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Analytics BookVerse
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-[#D9EEEA]">
            Theo dõi doanh thu demo, hội viên, kho đọc và chất lượng trợ lý AI
            trong 30 ngày gần nhất.
          </p>
          <a
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-bv-ivory px-4 text-sm font-black text-bv-primary-dark transition hover:bg-bv-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
            href="/admin/analytics/export"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Xuất CSV 30 ngày
          </a>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ icon: Icon, label, value, note }) => (
            <article
              className="rounded-2xl border border-bv-primary/15 bg-white p-5 shadow-sm"
              key={label}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-bv-text-muted">{label}</p>
                  <p className="mt-2 text-2xl font-black tabular-nums text-bv-heading">
                    {value}
                  </p>
                </div>
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bv-mint text-bv-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-bv-text-muted">{note}</p>
            </article>
          ))}
        </div>

        <AdminAnalyticsCharts data={data.daily} />

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <section className="rounded-2xl border border-bv-primary/15 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-bv-accent" aria-hidden="true" />
              <h2 className="text-xl font-black text-bv-heading">
                Gói hội viên nổi bật
              </h2>
            </div>
            <div className="mt-5 space-y-3">
              {data.topPlans.map((plan, index) => (
                <article
                  className="flex items-center justify-between gap-4 rounded-xl bg-bv-surface p-4"
                  key={plan.name}
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-bv-accent">
                      Hạng {index + 1}
                    </p>
                    <h3 className="mt-1 font-black text-bv-heading">{plan.name}</h3>
                    <p className="mt-1 text-xs text-bv-text-muted">
                      {plan.payments} lượt thanh toán
                    </p>
                  </div>
                  <p className="font-black tabular-nums text-bv-primary">
                    {money.format(plan.revenue)}
                  </p>
                </article>
              ))}
              {data.topPlans.length === 0 ? (
                <p className="rounded-xl bg-bv-surface p-4 text-sm text-bv-text-muted">
                  Chưa có thanh toán hội viên trong kỳ.
                </p>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-bv-primary/15 bg-white shadow-sm">
            <div className="p-5">
              <h2 className="text-xl font-black text-bv-heading">
                Bảng số liệu gần nhất
              </h2>
              <p className="mt-1 text-sm leading-6 text-bv-text-muted">
                Dữ liệu văn bản giúp đối chiếu biểu đồ và hỗ trợ khả năng tiếp cận.
              </p>
            </div>
            <div aria-label="Bảng số liệu phân tích, cuộn ngang để xem thêm cột" className="overflow-x-auto" tabIndex={0}>
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-bv-surface text-xs uppercase text-bv-text-muted">
                  <tr>
                    <th className="p-4">Ngày</th>
                    <th className="p-4">Hội viên</th>
                    <th className="p-4">Doanh thu hội viên</th>
                    <th className="p-4">Đơn sách</th>
                    <th className="p-4">Doanh thu sách</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E0D5]">
                  {data.daily.slice(-7).reverse().map((day) => (
                    <tr key={day.key}>
                      <td className="p-4 font-bold text-bv-heading">{day.label}</td>
                      <td className="p-4">{day.membershipPayments}</td>
                      <td className="p-4 font-bold text-bv-primary">
                        {money.format(day.membershipRevenue)}
                      </td>
                      <td className="p-4">{day.marketplaceOrders}</td>
                      <td className="p-4 font-bold text-bv-accent">
                        {money.format(day.marketplaceRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

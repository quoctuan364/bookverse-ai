import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Package,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { redirect } from "next/navigation";
import { requireModeratorUser } from "@/lib/permissions";
import { getAdminStatistics } from "@/actions/admin-statistics.actions";
import { AdminStatisticsCharts } from "@/components/admin/AdminStatisticsCharts";
import { AdminSubNav } from "@/components/admin/AdminSubNav";

export const dynamic = "force-dynamic";

export default async function AdminStatisticsPage() {
  try {
    await requireModeratorUser();
  } catch {
    redirect("/");
  }

  const data = await getAdminStatistics();

  const summaryCards = [
    {
      icon: Activity,
      label: "Lượt xem sách (30 ngày)",
      value: data.summary.totalViews30d.toLocaleString("vi-VN"),
      note: `${data.summary.trackedViewers30d} người dùng đã xác định phát sinh lượt xem`,
      color: "text-bv-primary",
      bg: "bg-bv-mint",
    },
    {
      icon: BookOpen,
      label: "Phiên đọc sách (30 ngày)",
      value: `${data.summary.totalReadingSessions30d} phiên`,
      note: `${data.summary.totalReadSessions7d} phiên trong 7 ngày gần nhất`,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      icon: UserPlus,
      label: "Độc giả mới (30 ngày)",
      value: `${data.summary.totalNewUsers30d} tài khoản`,
      note: `${data.summary.consentingUsers} người dùng cấp quyền ghi nhận`,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
    },
    {
      icon: Package,
      label: "Sách cũ đang bán (Chợ sách C2C)",
      value: `${data.summary.totalActiveListings.toLocaleString("vi-VN")} tin đăng`,
      note: `${data.summary.totalInventoryUnits.toLocaleString("vi-VN")} cuốn từ các tài khoản thành viên`,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
  ];

  return (
    <main className="bv-page bg-[#F8F9FA]">
      <AdminSubNav />
      {/* Hero Header */}
      <section className="bv-hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-black text-[#D9EEEA] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
            href="/admin"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại Bảng điều hành
          </Link>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-bv-gold" aria-hidden="true" />
            Thống kê vận hành 30 ngày qua
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Thống kê nền tảng BookVerse
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-[#D9EEEA]">
            Báo cáo tập trung vào <strong>30 ngày gần nhất</strong>: lượt xem sách, phiên đọc, tài khoản mới
            và ảnh chụp tồn kho chợ sách cũ ở thời điểm hiện tại.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner xác thực phạm vi số liệu 30 ngày */}
        <aside className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 text-sm leading-6 text-emerald-950 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-emerald-900">
                Phạm vi dữ liệu: Hoạt động thực tế trong 30 ngày qua
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                Dữ liệu được tổng hợp chính xác từ các lượt xem, phiên đọc, tài khoản và tồn kho thực tế trên hệ thống.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold text-emerald-700 bg-white/80 px-3 py-1.5 rounded-lg border border-emerald-200/60">
            Cập nhật lúc: {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(data.summary.generatedAt)}
          </span>
        </aside>

        {/* 4 Thẻ KPI chính */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ icon: Icon, label, value, note, color, bg }) => (
            <article
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md"
              key={label}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">
                    {value}
                  </p>
                </div>
                <span
                  className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500 border-t border-slate-100 pt-2.5">{note}</p>
            </article>
          ))}
        </div>

        {/* Bốn biểu đồ thiết yếu, có bảng dữ liệu chi tiết bên dưới */}
        <AdminStatisticsCharts data={data} />

        {/* Bảng top sách có lượt xem trong 30 ngày */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bv-mint text-bv-primary">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Top sách được xem nhiều nhất trong 30 ngày qua
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Xếp hạng theo số lần mở trang chi tiết sách sau khi loại bản ghi trùng
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              30 ngày qua
            </span>
          </div>

          <div
            aria-label="Bảng top sách 30 ngày, cuộn ngang để xem thêm"
            className="overflow-x-auto"
            tabIndex={0}
          >
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6 w-16">Hạng</th>
                  <th className="py-3.5 px-6">Tựa sách</th>
                  <th className="py-3.5 px-6">Tác giả</th>
                  <th className="py-3.5 px-6">Thể loại</th>
                  <th className="py-3.5 px-6 text-right">Lượt xem (30 ngày)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.topViewedBooks.length === 0 ? (
                  <tr>
                    <td className="p-6 text-slate-400 text-center" colSpan={5}>
                      Chưa có lượt xem sách nào trong 30 ngày qua.
                    </td>
                  </tr>
                ) : (
                  data.topViewedBooks.map((book, index) => (
                    <tr className="hover:bg-slate-50/60 transition" key={book.id}>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                            index === 0
                              ? "bg-bv-gold text-slate-950 shadow-sm"
                              : index <= 2
                                ? "bg-bv-mint text-bv-primary"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          className="line-clamp-1 font-bold text-slate-900 hover:text-bv-primary transition hover:underline"
                          href={`/book/${book.id}`}
                        >
                          {book.title}
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-xs">{book.author}</td>
                      <td className="py-4 px-6">
                        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          {book.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-black tabular-nums text-bv-primary">
                        {book.views.toLocaleString("vi-VN")} lượt xem
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bảng tồn kho chợ sách cũ chi tiết */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">Chi tiết tồn kho Chợ sách cũ C2C (người dùng đăng)</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Tổng hợp từ tin đăng của các tài khoản thành viên trong cộng đồng (hiện tại có {data.summary.totalActiveListings} tin đang hiển thị)
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              Tổng {data.summary.totalInventoryUnits.toLocaleString("vi-VN")} cuốn
            </span>
          </div>

          <div
            aria-label="Bảng tồn kho, cuộn ngang để xem thêm"
            className="overflow-x-auto"
            tabIndex={0}
          >
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Trạng thái tin</th>
                  <th className="py-3.5 px-6 text-right">Số tin đăng</th>
                  <th className="py-3.5 px-6 text-right">Tỷ lệ tin</th>
                  <th className="py-3.5 px-6 text-right">Tổng tồn kho (cuốn)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.inventory.length === 0 ? (
                  <tr>
                    <td className="p-6 text-slate-400 text-center" colSpan={4}>
                      Chưa có dữ liệu tồn kho.
                    </td>
                  </tr>
                ) : (
                  data.inventory.map((row) => {
                    const badgeColors: Record<string, string> = {
                      APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
                      REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
                      HIDDEN: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    return (
                      <tr className="hover:bg-slate-50/60 transition" key={row.status}>
                        <td className="py-4 px-6">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold border ${
                              badgeColors[row.status] ?? "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {row.label}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-black tabular-nums text-slate-900">
                          {row.count.toLocaleString("vi-VN")} tin
                        </td>
                        <td className="py-4 px-6 text-right font-bold tabular-nums text-slate-500">
                          {row.percent}%
                        </td>
                        <td className="py-4 px-6 text-right font-bold tabular-nums text-slate-700">
                          {row.totalStock.toLocaleString("vi-VN")} cuốn
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

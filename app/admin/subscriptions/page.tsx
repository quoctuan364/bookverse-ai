import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BellRing,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  RotateCcw,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { SubscriptionStatus } from "@prisma/client";
import { buildCatalogPaginationItems } from "@/lib/catalog-pagination";
import {
  adminGrantSubscription,
  extendSubscriptionDays,
  generateMembershipExpiryNotifications,
  getAdminSubscriptions,
  refundMembershipSandboxPayment,
  updateSubscriptionStatus,
} from "@/actions/membership.actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { getCurrentUser } from "@/lib/permissions";
import { AdminSubNav } from "@/components/admin/AdminSubNav";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}
function date(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(value);
}

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  CANCELLED: "Đã hủy gói",
  EXPIRED: "Đã hết hạn",
  PENDING: "Chờ kích hoạt",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID_DEMO: "Đã thanh toán (Demo)",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
  PENDING: "Chờ thanh toán",
  FAILED: "Thanh toán thất bại",
  CANCELLED: "Đã hủy",
};

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string; message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin/subscriptions");
  if (user.role !== "ADMIN") redirect("/");

  const [data, plans] = await Promise.all([
    getAdminSubscriptions(params?.q, Number(params?.page ?? 1)),
    prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { durationDays: "asc" },
      select: { id: true, name: true, price: true, durationDays: true },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  async function grantMembershipAction(formData: FormData) {
    "use server";
    const result = await adminGrantSubscription(formData);
    redirect(`/admin/subscriptions?${result.success ? "message" : "error"}=${encodeURIComponent(result.message)}`);
  }

  async function extendAction(formData: FormData) {
    "use server";
    const subId = String(formData.get("subscriptionId") ?? "");
    const days = Number(formData.get("days") ?? 30);
    const result = await extendSubscriptionDays(subId, days);
    redirect(`/admin/subscriptions?${result.success ? "message" : "error"}=${encodeURIComponent(result.message)}`);
  }

  async function changeStatus(formData: FormData) {
    "use server";
    const status = String(formData.get("status")) as SubscriptionStatus;
    const result = await updateSubscriptionStatus(String(formData.get("subscriptionId")), status);
    redirect(`/admin/subscriptions?message=${encodeURIComponent(result.message)}`);
  }
  async function notify() {
    "use server";
    const result = await generateMembershipExpiryNotifications();
    redirect(`/admin/subscriptions?message=${encodeURIComponent(result.message)}`);
  }
  async function refund(formData: FormData) {
    "use server";
    const result = await refundMembershipSandboxPayment(
      String(formData.get("paymentId") ?? ""),
      String(formData.get("reason") ?? ""),
    );
    redirect(`/admin/subscriptions?message=${encodeURIComponent(result.message)}`);
  }

  return (
    <main className="bv-page bg-[#F8F9FA]">
      <AdminSubNav />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="font-black uppercase tracking-[0.15em] text-bv-accent">Quản trị hệ thống</p><h1 className="mt-2 text-4xl font-black text-bv-heading">Quản lý thuê bao</h1></div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center rounded-lg border bg-white px-4 font-bold" href="/admin/membership-plans">Quản lý gói</Link>
            <form action={notify}>
              <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-bv-primary px-4 font-black text-white" type="submit">
                <BellRing className="h-4 w-4" aria-hidden="true" /> Tạo nhắc hết hạn
              </button>
            </form>
          </div>
        </div>
        {params?.message ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800" role="status">
            ✓ {params.message}
          </div>
        ) : null}
        {params?.error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800" role="alert">
            ⚠ {params.error}
          </div>
        ) : null}

        {/* Biểu mẫu cấp gói hội viên thủ công */}
        <details className="mt-6 rounded-2xl border border-bv-primary/20 bg-emerald-50/40 p-4 group">
          <summary className="cursor-pointer font-black text-bv-primary flex items-center justify-between list-none">
            <span className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4" />
              Cấp gói hội viên cho người dùng (Thủ công / Khuyến mãi)
            </span>
            <span className="rounded-lg bg-bv-primary px-3 py-1 text-xs font-bold text-white group-open:bg-zinc-200 group-open:text-zinc-700">
              + Mở biểu mẫu cấp gói
            </span>
          </summary>
          <form action={grantMembershipAction} className="mt-4 grid gap-3 sm:grid-cols-3 pt-3 border-t border-emerald-100">
            <div>
              <label className="text-xs font-bold text-bv-heading">Email độc giả nhận gói *</label>
              <input
                name="email"
                type="email"
                required
                placeholder="reader.tech.bookverse.demo@gmail.com"
                className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-bv-heading">Chọn gói hội viên *</label>
              <select name="planId" required className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs font-bold">
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.durationDays} ngày - {Number(p.price).toLocaleString("vi-VN")}đ)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-bv-heading">Thời hạn (ngày - để trống lấy theo gói)</label>
              <input
                name="durationDays"
                type="number"
                placeholder="Mặc định theo gói"
                className="mt-1 h-10 w-full rounded-lg border border-bv-border bg-white px-3 text-xs"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end pt-1">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-bv-focus px-4 py-2 text-xs font-black text-white hover:bg-[#0F5F59]"
              >
                <Check className="h-4 w-4" /> Kích hoạt cấp gói ngay
              </button>
            </div>
          </form>
        </details>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="bv-card rounded-xl p-5"><Users className="h-5 w-5 text-bv-primary" /><p className="mt-3 text-sm text-bv-text-muted">Đang hoạt động</p><p className="text-3xl font-black">{data.activeCount}</p></div>
          <div className="bv-card rounded-xl p-5"><CreditCard className="h-5 w-5 text-bv-primary" /><p className="mt-3 text-sm text-bv-text-muted">Doanh thu demo</p><p className="text-3xl font-black">{money(data.revenue)}</p></div>
          <div className="bv-card rounded-xl p-5"><Users className="h-5 w-5 text-bv-primary" /><p className="mt-3 text-sm text-bv-text-muted">Kết quả tìm kiếm</p><p className="text-3xl font-black">{data.total}</p></div>
        </div>
        <form className="mt-6 flex gap-2" method="get">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-bv-text-muted" aria-hidden="true" />
            <input aria-label="Tìm thuê bao" className="h-11 w-full rounded-lg border bg-white pl-10 pr-3" defaultValue={params?.q} name="q" placeholder="Tên, email hoặc tên gói..." />
          </div>
          <button className="min-h-11 rounded-lg bg-bv-heading px-5 font-black text-white">Tìm</button>
        </form>
        <div className="mt-5 overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-bv-surface"><tr><th className="p-4">Người dùng</th><th className="p-4">Gói</th><th className="p-4">Thời hạn</th><th className="p-4">Thanh toán</th><th className="p-4">Trạng thái</th><th className="p-4">Thao tác</th></tr></thead>
            <tbody>
              {data.subscriptions.map((item) => {
                const latestPayment = item.payments[0];
                return (
                  <tr className="border-t align-top" key={item.id}>
                    <td className="p-4">
                      <p className="font-bold text-bv-heading">{item.user.name}</p>
                      <p className="text-xs text-bv-text-muted">{item.user.email ?? "Không có email"}</p>
                    </td>
                    <td className="p-4 font-bold">{item.plan.name}</td>
                    <td className="p-4">{date(item.startsAt)} – {date(item.endsAt)}</td>
                    <td className="p-4">
                      <p className="font-bold">{money(Number(latestPayment?.amount ?? 0))}</p>
                      <p className="mt-1 text-xs text-bv-text-muted">
                        {latestPayment?.status ? (PAYMENT_STATUS_LABELS[latestPayment.status] ?? latestPayment.status) : "Chưa có"}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-black ${
                        item.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "EXPIRED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {SUBSCRIPTION_STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="grid gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <form action={changeStatus} className="flex items-center gap-1.5">
                            <input name="subscriptionId" type="hidden" value={item.id} />
                            <select
                              aria-label={`Trạng thái thuê bao của ${item.user.name}`}
                              className="h-9 rounded-lg border px-2 text-xs font-bold"
                              defaultValue={item.status}
                              name="status"
                            >
                              <option value="ACTIVE">Đang hoạt động</option>
                              <option value="CANCELLED">Hủy gói</option>
                              <option value="EXPIRED">Hết hạn</option>
                            </select>
                            <button className="min-h-9 rounded-lg bg-bv-mint px-2.5 text-xs font-bold text-bv-primary hover:bg-[#D4EBE7]">
                              Lưu
                            </button>
                          </form>

                          <form action={extendAction} className="inline-block">
                            <input name="subscriptionId" type="hidden" value={item.id} />
                            <input name="days" type="hidden" value="30" />
                            <ConfirmSubmitButton
                              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                              confirmMessage={`Gia hạn thêm 30 ngày cho gói của ${item.user.name}?`}
                            >
                              <Clock className="h-3 w-3" /> +30 Ngày
                            </ConfirmSubmitButton>
                          </form>
                        </div>

                        {latestPayment?.status === "PAID_DEMO" ? (
                          <form action={refund} className="flex gap-2">
                            <input name="paymentId" type="hidden" value={latestPayment.id} />
                            <input
                              aria-label={`Lý do hoàn tiền cho ${item.user.name}`}
                              className="h-9 w-40 rounded-lg border px-2 text-xs"
                              minLength={5}
                              name="reason"
                              placeholder="Lý do hoàn tiền"
                              required
                            />
                            <ConfirmSubmitButton
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-black text-red-700 hover:bg-red-100"
                              confirmMessage="Hoàn tiền thử nghiệm và hủy kỳ hội viên liên quan?"
                            >
                              <RotateCcw className="h-3 w-3" aria-hidden="true" />
                              Hoàn tiền
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.subscriptions.length === 0 ? <p className="p-8 text-center text-bv-text-muted">Chưa có thuê bao phù hợp.</p> : null}
        </div>
        {pages > 1 ? (() => {
          const paginationItems = buildCatalogPaginationItems(data.page, pages);
          const makeHref = (p: number) => `?q=${encodeURIComponent(params?.q ?? "")}&page=${p}`;
          return (
            <nav aria-label="Phân trang thuê bao" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-6 py-4 shadow-sm text-sm">
              {data.page > 1 ? (
                <Link className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50" href={makeHref(data.page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Trang trước</span>
                </Link>
              ) : (
                <span className="inline-flex h-10 cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200/50 bg-slate-100/60 px-4 text-xs font-bold text-slate-400">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Trang trước</span>
                </span>
              )}

              <div className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Danh sách số trang">
                {paginationItems.map((item, idx) =>
                  typeof item === "number" ? (
                    item === data.page ? (
                      <span
                        key={item}
                        aria-current="page"
                        className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-bv-primary px-3 text-xs font-black text-white shadow-xs"
                      >
                        {item}
                      </span>
                    ) : (
                      <Link
                        key={item}
                        href={makeHref(item)}
                        className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-xs transition hover:border-bv-primary/40 hover:bg-slate-50"
                      >
                        {item}
                      </Link>
                    )
                  ) : (
                    <span key={`ellipsis-${idx}`} className="inline-flex h-10 min-w-6 items-center justify-center text-xs font-bold text-slate-400">
                      …
                    </span>
                  )
                )}
              </div>

              {data.page < pages ? (
                <Link className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-bv-focus px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#0F5F59]" href={makeHref(data.page + 1)}>
                  <span>Trang sau</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex h-10 cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200/50 bg-slate-100/60 px-4 text-xs font-bold text-slate-400">
                  <span>Trang sau</span>
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </nav>
          );
        })() : null}
      </section>
    </main>
  );
}

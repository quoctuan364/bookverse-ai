import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CreditCard, RotateCcw, Search, Users } from "lucide-react";
import { SubscriptionStatus } from "@prisma/client";
import {
  generateMembershipExpiryNotifications,
  getAdminSubscriptions,
  refundMembershipSandboxPayment,
  updateSubscriptionStatus,
} from "@/actions/membership.actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}
function date(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(value);
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string; message?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin/subscriptions");
  if (user.role !== "ADMIN") redirect("/");
  const data = await getAdminSubscriptions(params?.q, Number(params?.page ?? 1));
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

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
    <main className="bv-page">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="font-black uppercase tracking-[0.15em] text-[#C65D43]">Admin</p><h1 className="mt-2 text-4xl font-black text-[#17202A]">Quản lý thuê bao</h1></div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center rounded-lg border bg-white px-4 font-bold" href="/admin/membership-plans">Quản lý gói</Link>
            <form action={notify}>
              <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#176B62] px-4 font-black text-white" type="submit">
                <BellRing className="h-4 w-4" aria-hidden="true" /> Tạo nhắc hết hạn
              </button>
            </form>
          </div>
        </div>
        {params?.message ? <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{params.message}</p> : null}
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="bv-card rounded-xl p-5"><Users className="h-5 w-5 text-[#176B62]" /><p className="mt-3 text-sm text-[#66706B]">Đang hoạt động</p><p className="text-3xl font-black">{data.activeCount}</p></div>
          <div className="bv-card rounded-xl p-5"><CreditCard className="h-5 w-5 text-[#176B62]" /><p className="mt-3 text-sm text-[#66706B]">Doanh thu demo</p><p className="text-3xl font-black">{money(data.revenue)}</p></div>
          <div className="bv-card rounded-xl p-5"><Users className="h-5 w-5 text-[#176B62]" /><p className="mt-3 text-sm text-[#66706B]">Kết quả tìm kiếm</p><p className="text-3xl font-black">{data.total}</p></div>
        </div>
        <form className="mt-6 flex gap-2" method="get">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-[#66706B]" aria-hidden="true" />
            <input aria-label="Tìm thuê bao" className="h-11 w-full rounded-lg border bg-white pl-10 pr-3" defaultValue={params?.q} name="q" placeholder="Tên, email hoặc tên gói..." />
          </div>
          <button className="min-h-11 rounded-lg bg-[#17202A] px-5 font-black text-white">Tìm</button>
        </form>
        <div className="mt-5 overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#F7F4ED]"><tr><th className="p-4">Người dùng</th><th className="p-4">Gói</th><th className="p-4">Thời hạn</th><th className="p-4">Thanh toán</th><th className="p-4">Trạng thái</th><th className="p-4">Thao tác</th></tr></thead>
            <tbody>
              {data.subscriptions.map((item) => {
                const latestPayment = item.payments[0];
                return (
                  <tr className="border-t align-top" key={item.id}>
                    <td className="p-4">
                      <p className="font-bold">{item.user.name}</p>
                      <p className="text-xs text-[#66706B]">{item.user.email ?? "Không có email"}</p>
                    </td>
                    <td className="p-4 font-bold">{item.plan.name}</td>
                    <td className="p-4">{date(item.startsAt)} – {date(item.endsAt)}</td>
                    <td className="p-4">
                      <p className="font-bold">{money(Number(latestPayment?.amount ?? 0))}</p>
                      <p className="mt-1 text-xs text-[#66706B]">{latestPayment?.status ?? "Chưa có"}</p>
                    </td>
                    <td className="p-4">{item.status}</td>
                    <td className="p-4">
                      <div className="grid gap-2">
                        <form action={changeStatus} className="flex gap-2">
                          <input name="subscriptionId" type="hidden" value={item.id} />
                          <select
                            aria-label={`Trạng thái thuê bao của ${item.user.name}`}
                            className="h-11 rounded-lg border px-2"
                            defaultValue={item.status}
                            name="status"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="CANCELLED">CANCELLED</option>
                            <option value="EXPIRED">EXPIRED</option>
                          </select>
                          <button className="min-h-11 rounded-lg bg-[#E6F3F0] px-3 font-bold text-[#176B62]">
                            Lưu
                          </button>
                        </form>
                        {latestPayment?.status === "PAID_DEMO" ? (
                          <form action={refund} className="flex gap-2">
                            <input name="paymentId" type="hidden" value={latestPayment.id} />
                            <input
                              aria-label={`Lý do hoàn tiền cho ${item.user.name}`}
                              className="h-11 w-48 rounded-lg border px-3 text-xs"
                              minLength={5}
                              name="reason"
                              placeholder="Lý do hoàn tiền"
                              required
                            />
                            <ConfirmSubmitButton
                              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 font-black text-red-700 hover:bg-red-100"
                              confirmMessage="Hoàn tiền Sandbox và hủy kỳ hội viên liên quan?"
                            >
                              <RotateCcw className="h-4 w-4" aria-hidden="true" />
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
          {data.subscriptions.length === 0 ? <p className="p-8 text-center text-[#66706B]">Chưa có thuê bao phù hợp.</p> : null}
        </div>
        <div className="mt-6 flex justify-center gap-3">{data.page > 1 ? <Link className="rounded-lg border bg-white px-4 py-2" href={`?q=${encodeURIComponent(params?.q ?? "")}&page=${data.page - 1}`}>Trang trước</Link> : null}<span className="px-4 py-2">{data.page}/{pages}</span>{data.page < pages ? <Link className="rounded-lg border bg-white px-4 py-2" href={`?q=${encodeURIComponent(params?.q ?? "")}&page=${data.page + 1}`}>Trang sau</Link> : null}</div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Crown, ReceiptText } from "lucide-react";
import { cancelMyMembership, getMyMembership } from "@/actions/membership.actions";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function date(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(value);
}

function money(value: unknown) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value));
}

export default async function MyMembershipPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/profile/membership");
  const data = await getMyMembership();

  async function cancel() {
    "use server";
    await cancelMyMembership();
    redirect("/profile/membership?message=cancelled");
  }

  const now = new Date();
  const active =
    data.subscription?.status === "ACTIVE" &&
    data.subscription.startsAt <= now &&
    data.subscription.endsAt > now;
  return (
    <main className="bv-page">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="font-black uppercase tracking-[0.15em] text-bv-accent">Tài khoản</p><h1 className="mt-2 text-4xl font-black text-bv-heading">Hội viên của tôi</h1></div>
          <Link className="rounded-lg bg-bv-primary px-4 py-3 font-black text-white" href="/membership">Xem các gói</Link>
        </div>

        <section className="bv-card mt-8 rounded-2xl p-7">
          {data.subscription ? (
            <div className="grid gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-black ${active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-700"}`}>{active ? "Đang hoạt động" : data.subscription.status}</span>
                <h2 className="mt-4 flex items-center gap-2 text-2xl font-black text-bv-heading"><Crown className="h-6 w-6 text-bv-accent" />{data.subscription.plan.name}</h2>
                <p className="mt-2 text-bv-text-muted">Đang mở nội dung trong Thư viện BookVerse dành cho hội viên.</p>
                <div className="mt-5 flex flex-wrap gap-5 text-sm text-bv-text">
                  <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Bắt đầu: {date(data.subscription.startsAt)}</span>
                  <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Hết hạn: {date(data.subscription.endsAt)}</span>
                </div>
                {data.subscription.cancelledAt ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Đã hủy gia hạn. Gói vẫn dùng được đến {date(data.subscription.endsAt)}.</p> : null}
              </div>
              <div className="flex flex-col gap-3">
                {active ? <Link className="rounded-lg bg-bv-primary px-4 py-3 text-center font-black text-white" href="/membership/books">Đọc sách hội viên</Link> : null}
                {active && !data.subscription.cancelledAt ? <form action={cancel}><button className="w-full rounded-lg border border-red-200 bg-white px-4 py-3 font-bold text-red-700" type="submit">Hủy gia hạn</button></form> : null}
              </div>
            </div>
          ) : (
            <div className="py-5 text-center"><Crown className="mx-auto h-10 w-10 text-bv-primary" /><h2 className="mt-3 text-xl font-black">Bạn chưa đăng ký hội viên</h2><p className="mt-2 text-bv-text-muted">Bạn vẫn có thể đọc thử tối đa 10% nội dung minh họa của mỗi cuốn sách.</p></div>
          )}
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-black text-bv-heading"><ReceiptText className="h-5 w-5" /> Lịch sử thanh toán</h2>
            <Link className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 font-bold text-bv-primary transition hover:bg-bv-mint" href="/profile/membership/payments">Xem tất cả giao dịch</Link>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-bv-surface text-bv-text"><tr><th className="p-4">Gói</th><th className="p-4">Ngày</th><th className="p-4">Số tiền</th><th className="p-4">Trạng thái</th></tr></thead>
              <tbody>{data.payments.map((payment) => <tr className="border-t" key={payment.id}><td className="p-4 font-bold">{payment.plan.name}</td><td className="p-4">{date(payment.createdAt)}</td><td className="p-4">{money(payment.amount)}</td><td className="p-4">{payment.status}</td></tr>)}</tbody>
            </table>
            {data.payments.length === 0 ? <p className="p-5 text-center text-bv-text-muted">Chưa có giao dịch.</p> : null}
          </div>
        </section>
      </section>
    </main>
  );
}

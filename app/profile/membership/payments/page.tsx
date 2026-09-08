import { ArrowLeft, CreditCard, ReceiptText } from "lucide-react";
import Link from "next/link";
import { getMyMembershipPayments } from "@/actions/membership.actions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

const money = (value: unknown) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
}).format(Number(value));
const date = (value: Date | null | undefined) => value
  ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(value)
  : "—";

export default async function MembershipPaymentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const data = await getMyMembershipPayments(Math.max(1, Number(params.page) || 1));
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <main className="bv-page min-h-[70vh]">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-bold text-bv-primary transition hover:bg-bv-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary" href="/profile/membership">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay lại hội viên
        </Link>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-black uppercase tracking-[0.15em] text-bv-accent">Tài khoản</p><h1 className="mt-2 text-3xl font-black text-bv-heading">Lịch sử thanh toán hội viên</h1><p className="mt-2 leading-7 text-bv-text-muted">{data.total} giao dịch trên tài khoản của bạn.</p></div>
          <CreditCard className="h-10 w-10 text-bv-primary" aria-hidden="true" />
        </div>

        {data.payments.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-bv-primary/30 bg-white p-8 text-center">
            <ReceiptText className="mx-auto h-10 w-10 text-bv-primary" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-black text-bv-heading">Chưa có giao dịch hội viên</h2>
            <p className="mt-2 text-sm text-bv-text-muted">Sau khi đăng ký, biên nhận demo sẽ xuất hiện tại đây.</p>
            <Link className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-bv-primary px-5 py-3 font-black text-white transition hover:bg-bv-primary-dark" href="/membership">Xem các gói</Link>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-2xl border border-bv-border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-bv-surface text-[#364152]"><tr><th className="p-4">Gói</th><th className="p-4">Mã giao dịch</th><th className="p-4">Hiệu lực</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Số tiền</th></tr></thead>
                <tbody>{data.payments.map((payment) => (
                  <tr className="border-t border-[#E7E0D5]" key={payment.id}>
                    <td className="p-4"><strong className="block text-bv-heading">{payment.plan.name}</strong><span className="text-xs text-bv-text-muted">{payment.plan.durationDays} ngày · {date(payment.paidAt)}</span></td>
                    <td className="p-4 font-mono text-xs text-bv-text">{payment.transactionRef}</td>
                    <td className="p-4 text-bv-text">{date(payment.subscription?.startsAt)} – {date(payment.subscription?.endsAt)}</td>
                    <td className="p-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">{payment.status === "PAID_DEMO" ? "Đã thanh toán demo" : payment.status}</span></td>
                    <td className="p-4 text-right font-black tabular-nums text-bv-primary">{money(payment.amount)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 ? (
          <nav aria-label="Phân trang lịch sử thanh toán" className="mt-6 flex items-center justify-center gap-3">
            {data.page > 1 ? <Link className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-bv-border bg-white px-4 font-bold" href={`?page=${data.page - 1}`}>Trang trước</Link> : null}
            <span className="text-sm font-bold text-bv-text-muted">Trang {data.page}/{totalPages}</span>
            {data.page < totalPages ? <Link className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-bv-border bg-white px-4 font-bold" href={`?page=${data.page + 1}`}>Trang sau</Link> : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}

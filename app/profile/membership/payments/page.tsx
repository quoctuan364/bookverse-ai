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
        <Link className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-bold text-[#176B62] transition hover:bg-[#E6F3F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]" href="/profile/membership">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay lại hội viên
        </Link>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-black uppercase tracking-[0.15em] text-[#C65D43]">Tài khoản</p><h1 className="mt-2 text-3xl font-black text-[#17202A]">Lịch sử thanh toán hội viên</h1><p className="mt-2 leading-7 text-[#66706B]">{data.total} giao dịch trên tài khoản của bạn.</p></div>
          <CreditCard className="h-10 w-10 text-[#176B62]" aria-hidden="true" />
        </div>

        {data.payments.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#176B62]/30 bg-white p-8 text-center">
            <ReceiptText className="mx-auto h-10 w-10 text-[#176B62]" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-black text-[#17202A]">Chưa có giao dịch hội viên</h2>
            <p className="mt-2 text-sm text-[#66706B]">Sau khi đăng ký, biên nhận demo sẽ xuất hiện tại đây.</p>
            <Link className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-[#176B62] px-5 py-3 font-black text-white transition hover:bg-[#104C47]" href="/membership">Xem các gói</Link>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-2xl border border-[#D8D0C2] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-[#F7F4ED] text-[#364152]"><tr><th className="p-4">Gói</th><th className="p-4">Mã giao dịch</th><th className="p-4">Hiệu lực</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Số tiền</th></tr></thead>
                <tbody>{data.payments.map((payment) => (
                  <tr className="border-t border-[#E7E0D5]" key={payment.id}>
                    <td className="p-4"><strong className="block text-[#17202A]">{payment.plan.name}</strong><span className="text-xs text-[#66706B]">{payment.plan.durationDays} ngày · {date(payment.paidAt)}</span></td>
                    <td className="p-4 font-mono text-xs text-[#536071]">{payment.transactionRef}</td>
                    <td className="p-4 text-[#536071]">{date(payment.subscription?.startsAt)} – {date(payment.subscription?.endsAt)}</td>
                    <td className="p-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">{payment.status === "PAID_DEMO" ? "Đã thanh toán demo" : payment.status}</span></td>
                    <td className="p-4 text-right font-black tabular-nums text-[#176B62]">{money(payment.amount)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 ? (
          <nav aria-label="Phân trang lịch sử thanh toán" className="mt-6 flex items-center justify-center gap-3">
            {data.page > 1 ? <Link className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-[#D8D0C2] bg-white px-4 font-bold" href={`?page=${data.page - 1}`}>Trang trước</Link> : null}
            <span className="text-sm font-bold text-[#66706B]">Trang {data.page}/{totalPages}</span>
            {data.page < totalPages ? <Link className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-[#D8D0C2] bg-white px-4 font-bold" href={`?page=${data.page + 1}`}>Trang sau</Link> : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}

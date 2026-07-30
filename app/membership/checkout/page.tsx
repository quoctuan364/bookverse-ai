import { randomUUID } from "node:crypto";
import { ArrowLeft, CalendarDays, CheckCircle2, CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  createMembershipPaymentIntent,
  getMembershipCheckoutPlan,
} from "@/actions/membership.actions";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { MEMBERSHIP_SANDBOX_METHODS } from "@/lib/membership-payment-sandbox";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ planId?: string; error?: string }>;
}

function money(value: unknown) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency", currency: "VND", maximumFractionDigits: 0,
  }).format(Number(value));
}

export default async function MembershipCheckoutPage({ searchParams }: Props) {
  const params = await searchParams;
  const planId = String(params.planId ?? "").trim();
  if (!planId) notFound();
  const plan = await getMembershipCheckoutPlan(planId);
  if (!plan) notFound();

  async function confirm(formData: FormData) {
    "use server";
    const selectedPlanId = String(formData.get("planId") ?? "");
    const requestId = String(formData.get("requestId") ?? "");
    if (formData.get("acceptedTerms") !== "on") {
      redirect(`/membership/checkout?planId=${encodeURIComponent(selectedPlanId)}&error=${encodeURIComponent("Bạn cần đồng ý điều khoản hội viên trước khi xác nhận.")}`);
    }
    const result = await createMembershipPaymentIntent(
      selectedPlanId,
      String(formData.get("paymentMethod") ?? ""),
      requestId,
    );
    if (result.success && result.paymentId) {
      redirect(`/membership/payment/${encodeURIComponent(result.paymentId)}`);
    }
    redirect(`/membership/checkout?planId=${encodeURIComponent(selectedPlanId)}&error=${encodeURIComponent(result.message)}`);
  }

  return (
    <main className="bv-page min-h-[70vh]">
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-bold text-[#176B62] transition hover:bg-[#E6F3F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]" href="/membership">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay lại chọn gói
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="bv-card rounded-2xl p-5 sm:p-8" aria-labelledby="checkout-title">
            <p className="text-sm font-black uppercase tracking-[0.15em] text-[#C65D43]">Xác nhận đăng ký</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#17202A]" id="checkout-title">Kiểm tra gói hội viên</h1>
            <p className="mt-3 max-w-2xl leading-7 text-[#66706B]">Hệ thống chỉ tạo kỳ hội viên sau khi bạn kiểm tra quyền lợi và đồng ý điều khoản.</p>

            {params.error ? (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-800" role="alert">
                {params.error}
              </div>
            ) : null}

            <div className="mt-7 space-y-4">
              {[
                [CalendarDays, "Thời hạn rõ ràng", `${plan.durationDays} ngày sử dụng. Kỳ mới sẽ nối tiếp nếu tài khoản đang có gói còn hạn.`],
                [LockKeyhole, "Mở toàn bộ kho đọc", `${plan._count.books} đầu sách hiện có và sách mới bổ sung trong thời hạn đều được mở.`],
                [ShieldCheck, "Hủy gia hạn không mất kỳ đã mua", "Bạn vẫn đọc được đến ngày kết thúc của kỳ đã thanh toán."],
              ].map(([Icon, title, text]) => (
                <div className="flex gap-3 rounded-xl border border-[#D8D0C2] bg-[#FAF8F2] p-4" key={String(title)}>
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#176B62]" aria-hidden="true" />
                  <div><h2 className="font-black text-[#17202A]">{String(title)}</h2><p className="mt-1 text-sm leading-6 text-[#66706B]">{String(text)}</p></div>
                </div>
              ))}
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-[#176B62]/20 bg-white p-5 shadow-[0_18px_55px_rgba(37,49,56,0.10)] sm:p-6" aria-label="Tóm tắt thanh toán">
            <div className="flex items-center gap-2 text-[#176B62]"><CreditCard className="h-5 w-5" aria-hidden="true" /><h2 className="text-lg font-black">Tóm tắt</h2></div>
            <p className="mt-5 text-sm text-[#66706B]">Gói đã chọn</p>
            <p className="mt-1 text-xl font-black text-[#17202A]">{plan.name}</p>
            <dl className="mt-5 space-y-3 border-y border-[#D8D0C2] py-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[#66706B]">Thời hạn</dt><dd className="font-bold">{plan.durationDays} ngày</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#66706B]">Kho đọc</dt><dd className="font-bold">{plan._count.books} cuốn</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#66706B]">Thanh toán</dt><dd className="font-bold">Chọn Sandbox</dd></div>
            </dl>
            <div className="mt-4 flex items-end justify-between gap-4"><span className="font-bold text-[#66706B]">Tổng cộng</span><strong className="text-2xl font-black tabular-nums text-[#176B62]">{money(plan.price)}</strong></div>

            <form action={confirm} className="mt-6">
              <input name="planId" type="hidden" value={plan.id} />
              <input name="requestId" type="hidden" value={randomUUID()} />
              <fieldset>
                <legend className="text-sm font-black text-[#17202A]">
                  Phương thức thanh toán thử
                </legend>
                <div className="mt-3 grid gap-2">
                  {MEMBERSHIP_SANDBOX_METHODS.map((method, index) => (
                    <label
                      className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-[#D8D0C2] bg-white p-3 transition hover:border-[#176B62]/45 hover:bg-[#F7FBFA] focus-within:ring-2 focus-within:ring-[#176B62]"
                      key={method.value}
                    >
                      <input
                        className="mt-1 h-5 w-5 shrink-0 accent-[#176B62]"
                        defaultChecked={index === 0}
                        name="paymentMethod"
                        type="radio"
                        value={method.value}
                      />
                      <span>
                        <span className="block text-sm font-black text-[#17202A]">
                          {method.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-[#66706B]">
                          {method.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#F7F4ED] p-3 text-sm leading-6 text-[#364152]">
                <input className="mt-1 h-5 w-5 shrink-0 accent-[#176B62]" name="acceptedTerms" required type="checkbox" />
                <span>
                  Tôi đồng ý với{" "}
                  <Link
                    className="-mx-1 inline-flex min-h-11 items-center px-1 font-bold text-[#176B62] underline"
                    href="/membership/terms"
                    target="_blank"
                  >
                    điều khoản hội viên
                  </Link>{" "}
                  và hiểu đây là thanh toán mô phỏng phục vụ demo.
                </span>
              </label>
              <SubmitButton className="mt-4 min-h-12 w-full cursor-pointer gap-2 bg-[#176B62] text-base font-black text-white hover:bg-[#104C47]" pendingLabel="Đang tạo giao dịch...">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Tiếp tục thanh toán
              </SubmitButton>
            </form>
            <p className="mt-3 text-center text-xs leading-5 text-[#66706B]">Không có giao dịch ngân hàng thật trong chế độ demo.</p>
          </aside>
        </div>
      </section>
    </main>
  );
}

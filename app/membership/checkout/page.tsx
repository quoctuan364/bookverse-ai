import { randomUUID } from "node:crypto";
import { ArrowLeft, CalendarDays, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  createMembershipPaymentIntent,
  getMembershipCheckoutPlan,
} from "@/actions/membership.actions";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { MembershipCheckoutSidebar } from "@/components/membership/MembershipCheckoutSidebar";
import { MEMBERSHIP_SANDBOX_METHODS } from "@/lib/membership-payment-sandbox";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ planId?: string; error?: string }>;
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
        <Link className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-bold text-bv-primary transition hover:bg-bv-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary" href="/membership">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay lại chọn gói
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="bv-card rounded-2xl p-5 sm:p-8" aria-labelledby="checkout-title">
            <p className="text-sm font-black uppercase tracking-[0.15em] text-bv-accent">Xác nhận đăng ký</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-bv-heading" id="checkout-title">Kiểm tra gói hội viên</h1>
            <p className="mt-3 max-w-2xl leading-7 text-bv-text-muted">Hệ thống chỉ tạo kỳ hội viên sau khi bạn kiểm tra quyền lợi và đồng ý điều khoản.</p>

            {params.error ? (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-800" role="alert">
                {params.error}
              </div>
            ) : null}

            <div className="mt-7 space-y-4">
              {[
                [CalendarDays, "Thời hạn rõ ràng", `${plan.durationDays} ngày sử dụng. Kỳ mới sẽ nối tiếp nếu tài khoản đang có gói còn hạn.`],
                [LockKeyhole, "Mở nội dung BookVerse", `${plan._count.books} đầu sách có nội dung minh họa và nội dung mới trong thời hạn đều được mở.`],
                [ShieldCheck, "Hủy gia hạn không mất kỳ đã mua", "Bạn vẫn đọc được đến ngày kết thúc của kỳ đã thanh toán."],
              ].map(([Icon, title, text]) => (
                <div className="flex gap-3 rounded-xl border border-bv-border bg-[#FAF8F2] p-4" key={String(title)}>
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-bv-primary" aria-hidden="true" />
                  <div><h2 className="font-black text-bv-heading">{String(title)}</h2><p className="mt-1 text-sm leading-6 text-bv-text-muted">{String(text)}</p></div>
                </div>
              ))}
            </div>
          </section>

          <MembershipCheckoutSidebar
            booksCount={plan._count.books}
            checkoutForm={
              <form action={confirm} className="mt-6">
                <input name="planId" type="hidden" value={plan.id} />
                <input name="requestId" type="hidden" value={randomUUID()} />
                <fieldset>
                  <legend className="text-sm font-black text-bv-heading">
                    Phương thức thanh toán thử
                  </legend>
                  <div className="mt-3 grid gap-2">
                    {MEMBERSHIP_SANDBOX_METHODS.map((method, index) => (
                      <label
                        className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-bv-border bg-white p-3 transition hover:border-bv-primary/45 hover:bg-[#F7FBFA] focus-within:ring-2 focus-within:ring-bv-primary"
                        key={method.value}
                      >
                        <input
                          className="mt-1 h-5 w-5 shrink-0 accent-bv-primary"
                          defaultChecked={index === 0}
                          name="paymentMethod"
                          type="radio"
                          value={method.value}
                        />
                        <span>
                          <span className="block text-sm font-black text-bv-heading">
                            {method.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-bv-text-muted">
                            {method.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-bv-surface p-3 text-sm leading-6 text-[#364152]">
                  <input className="mt-1 h-5 w-5 shrink-0 accent-bv-primary" name="acceptedTerms" required type="checkbox" />
                  <span>
                    Tôi đồng ý với{" "}
                    <Link
                      className="-mx-1 inline-flex min-h-11 items-center px-1 font-bold text-bv-primary underline"
                      href="/membership/terms"
                      target="_blank"
                    >
                      điều khoản hội viên
                    </Link>{" "}
                    và hiểu đây là thanh toán mô phỏng phục vụ demo.
                  </span>
                </label>
                <SubmitButton className="mt-4 min-h-12 w-full cursor-pointer gap-2 bg-bv-primary text-base font-black text-white hover:bg-bv-primary-dark" pendingLabel="Đang tạo giao dịch...">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Tiếp tục thanh toán
                </SubmitButton>
              </form>
            }
            durationDays={plan.durationDays}
            planName={plan.name}
            planPrice={Number(plan.price)}
          />
        </div>
      </section>
    </main>
  );
}

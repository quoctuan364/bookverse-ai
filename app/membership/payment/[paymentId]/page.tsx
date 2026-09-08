import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  completeMembershipSandboxPayment,
  getMembershipSandboxPayment,
} from "@/actions/membership.actions";
import { SubmitButton } from "@/components/shared/SubmitButton";

export const dynamic = "force-dynamic";

interface MembershipPaymentPageProps {
  params: Promise<{ paymentId: string }>;
  searchParams: Promise<{ error?: string }>;
}

function money(value: unknown): string {
  return new Intl.NumberFormat("vi-VN", {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value));
}

export default async function MembershipPaymentPage({
  params,
  searchParams,
}: MembershipPaymentPageProps) {
  const [{ paymentId }, query] = await Promise.all([params, searchParams]);
  const payment = await getMembershipSandboxPayment(paymentId);
  if (!payment) notFound();

  async function processPayment(formData: FormData) {
    "use server";

    const result = await completeMembershipSandboxPayment(
      paymentId,
      String(formData.get("outcome") ?? ""),
    );
    if (result.success && result.subscriptionId) {
      redirect(
        `/membership/success?subscriptionId=${encodeURIComponent(result.subscriptionId)}&paymentId=${encodeURIComponent(paymentId)}`,
      );
    }
    redirect(
      `/membership/payment/${encodeURIComponent(paymentId)}?error=${encodeURIComponent(result.message)}`,
    );
  }

  const isPending = payment.status === "PENDING";
  const isPaid = payment.status === "PAID_DEMO";

  return (
    <main className="bv-page min-h-[72vh]">
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-bold text-bv-primary transition hover:bg-bv-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
          href={`/membership/checkout?planId=${encodeURIComponent(payment.plan.id)}`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại thanh toán
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="bv-card overflow-hidden rounded-2xl" aria-labelledby="payment-title">
            <div className="bg-bv-primary-dark p-6 text-white sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em]">
                  <ShieldCheck className="h-4 w-4 text-bv-gold" aria-hidden="true" />
                  Cổng thanh toán Sandbox
                </span>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-[#D9EEEA]">
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                  Giao dịch thử nghiệm
                </span>
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-tight" id="payment-title">
                Xác nhận thanh toán hội viên
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-[#D9EEEA]">
                Trang này mô phỏng phản hồi từ ví điện tử hoặc ngân hàng. Không có
                tiền thật được chuyển đi.
              </p>
            </div>

            <div className="p-5 sm:p-8">
              {query.error ? (
                <div
                  className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-800"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  {query.error}
                </div>
              ) : null}

              <div className="grid gap-6 rounded-2xl border border-bv-ink/10 bg-[#FAF8F2] p-5 sm:grid-cols-[200px_1fr] sm:items-center">
                <div
                  aria-label="Mã QR thanh toán chuyển khoản Sacombank"
                  className="relative flex aspect-square w-full max-w-[200px] flex-col items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white p-2 shadow-[0_10px_30px_rgba(23,107,98,0.16)]"
                >
                  <Image
                    alt="VietQR Sacombank - Lương Nguyễn Quốc Tuấn"
                    className="h-full w-full object-contain"
                    height={200}
                    priority
                    src="/images/sacombank-qr-only.png"
                    width={200}
                  />
                </div>
                <div className="grid gap-3">
                  <div className="rounded-xl border border-bv-primary/20 bg-white p-3.5 shadow-xs">
                    <div className="flex items-center justify-between gap-2 border-b border-bv-ink/10 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-bv-primary">Ngân hàng</span>
                      <span className="font-black text-bv-heading">SACOMBANK</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-bv-text-muted">Chủ tài khoản:</span>
                        <p className="font-black uppercase text-bv-heading">LƯƠNG NGUYỄN QUỐC TUẤN</p>
                      </div>
                      <div>
                        <span className="text-bv-text-muted">Số tài khoản:</span>
                        <p className="font-mono text-sm font-black text-bv-primary">0868792717</p>
                      </div>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-bv-text-muted">Gói hội viên</dt>
                      <dd className="mt-0.5 text-sm font-black text-bv-heading">
                        {payment.plan.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-bv-text-muted">Số tiền cần chuyển</dt>
                      <dd className="mt-0.5 text-sm font-black text-bv-primary">
                        {money(payment.amount)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-bv-text-muted">Nội dung chuyển khoản</dt>
                      <dd className="mt-0.5 inline-block rounded-md bg-[#EDF8F5] px-2 py-1 font-mono text-xs font-black text-bv-primary">
                        BOOKVERSE {payment.transactionRef.slice(-8).toUpperCase()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {isPending ? (
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <form action={processPayment}>
                    <input name="outcome" type="hidden" value="success" />
                    <SubmitButton
                      className="min-h-12 w-full cursor-pointer gap-2 bg-bv-primary text-base font-black text-white hover:bg-bv-primary-dark"
                      pendingLabel="Đang xác nhận..."
                    >
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      Mô phỏng thành công
                    </SubmitButton>
                  </form>
                  <form action={processPayment}>
                    <input name="outcome" type="hidden" value="failure" />
                    <SubmitButton
                      className="min-h-12 w-full cursor-pointer gap-2 border-red-200 bg-white font-black text-red-700 hover:bg-red-50"
                      pendingLabel="Đang xử lý..."
                      variant="outline"
                    >
                      <AlertCircle className="h-5 w-5" aria-hidden="true" />
                      Mô phỏng thất bại
                    </SubmitButton>
                  </form>
                </div>
              ) : (
                <div
                  className={`mt-8 rounded-xl border p-4 ${
                    isPaid
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                  role="status"
                >
                  <p className="font-black">
                    {isPaid
                      ? "Giao dịch đã được thanh toán."
                      : "Giao dịch thử đã thất bại hoặc không còn hiệu lực."}
                  </p>
                  <Link
                    className="mt-3 inline-flex min-h-11 items-center font-black underline"
                    href={
                      isPaid
                        ? "/profile/membership"
                        : `/membership/checkout?planId=${encodeURIComponent(payment.plan.id)}`
                    }
                  >
                    {isPaid ? "Xem gói hội viên" : "Tạo giao dịch mới"}
                  </Link>
                </div>
              )}
            </div>
          </section>

          <aside
            aria-label="Tóm tắt giao dịch"
            className="h-fit rounded-2xl border border-bv-primary/20 bg-white p-5 shadow-[0_18px_55px_rgba(37,49,56,0.10)] sm:p-6"
          >
            <p className="text-sm font-bold text-bv-text-muted">Số tiền Sandbox</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-bv-primary">
              {money(payment.amount)}
            </p>
            <dl className="mt-5 space-y-3 border-y border-bv-border py-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-bv-text-muted">Thời hạn</dt>
                <dd className="font-bold">{payment.plan.durationDays} ngày</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-bv-text-muted">Trạng thái</dt>
                <dd className="font-black text-bv-accent">{payment.status}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-bv-text-muted">
              Dùng hai nút mô phỏng để trình bày cả nhánh thành công và thất bại
              với giảng viên.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}

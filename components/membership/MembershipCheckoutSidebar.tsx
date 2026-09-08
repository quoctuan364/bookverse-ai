"use client";

import { useState, type ReactNode } from "react";
import { CreditCard } from "lucide-react";
import { VoucherInput } from "@/components/shared/VoucherInput";
import type { VoucherDefinition } from "@/lib/vouchers";

interface MembershipCheckoutSidebarProps {
  planName: string;
  durationDays: number;
  booksCount: number;
  planPrice: number;
  checkoutForm: ReactNode;
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function MembershipCheckoutSidebar({
  planName,
  durationDays,
  booksCount,
  planPrice,
  checkoutForm,
}: MembershipCheckoutSidebarProps) {
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucher, setVoucher] = useState<VoucherDefinition | null>(null);

  const finalPrice = Math.max(0, planPrice - discountAmount);

  return (
    <aside
      aria-label="Tóm tắt thanh toán"
      className="h-fit rounded-2xl border border-bv-primary/20 bg-white p-5 shadow-[0_18px_55px_rgba(37,49,56,0.10)] sm:p-6"
    >
      <div className="flex items-center gap-2 text-bv-primary">
        <CreditCard className="h-5 w-5" aria-hidden="true" />
        <h2 className="text-lg font-black">Tóm tắt</h2>
      </div>

      <p className="mt-5 text-sm text-bv-text-muted">Gói đã chọn</p>
      <p className="mt-1 text-xl font-black text-bv-heading">{planName}</p>

      <dl className="mt-5 space-y-3 border-y border-bv-border py-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-bv-text-muted">Thời hạn</dt>
          <dd className="font-bold">{durationDays} ngày</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-bv-text-muted">Kho đọc</dt>
          <dd className="font-bold">{booksCount} cuốn</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-bv-text-muted">Tạm tính</dt>
          <dd className="font-bold text-bv-heading">{money(planPrice)}</dd>
        </div>

        {voucher && discountAmount > 0 ? (
          <div className="flex justify-between gap-4 animate-in fade-in">
            <dt className="font-bold text-emerald-700">
              Giảm giá ({voucher.code})
            </dt>
            <dd className="font-black text-emerald-700">
              -{money(discountAmount)}
            </dd>
          </div>
        ) : null}
      </dl>

      {/* Voucher Input Area */}
      <div className="mt-4">
        <VoucherInput
          onApply={(discount, applied) => {
            setDiscountAmount(discount);
            setVoucher(applied);
          }}
          originalAmount={planPrice}
        />
      </div>

      <div className="mt-4 flex items-end justify-between gap-4 border-t border-bv-border/60 pt-3">
        <span className="font-bold text-bv-text-muted">Tổng thanh toán</span>
        <strong className="text-2xl font-black tabular-nums text-bv-primary">
          {money(finalPrice)}
        </strong>
      </div>

      {checkoutForm}

      <p className="mt-3 text-center text-xs leading-5 text-bv-text-muted">
        Không có giao dịch ngân hàng thật trong chế độ demo.
      </p>
    </aside>
  );
}

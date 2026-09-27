"use client";

import { useState, type ReactNode } from "react";
import { VoucherInput } from "@/components/shared/VoucherInput";
import type { VoucherDefinition } from "@/lib/vouchers";

interface CartSummarySidebarProps {
  orderId: string | null;
  totalItems: number;
  totalAmount: number;
  checkoutIssues: string[];
  checkoutForm: ReactNode;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

export function CartSummarySidebar({
  orderId,
  totalItems,
  totalAmount,
  checkoutIssues,
  checkoutForm,
}: CartSummarySidebarProps) {
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucher, setVoucher] = useState<VoucherDefinition | null>(null);

  const finalTotal = Math.max(0, totalAmount - discountAmount);

  return (
    <aside className="h-fit rounded-3xl border border-bv-ink/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-bv-heading">Tóm tắt đơn hàng</h2>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-bv-text-muted">Mã giỏ hàng</dt>
          <dd className="font-black text-bv-heading">{orderId ?? "Chưa có"}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-bv-text-muted">Số lượng</dt>
          <dd className="font-black text-bv-heading">{totalItems}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-bv-text-muted">Tạm tính</dt>
          <dd className="font-black text-bv-heading">{formatPrice(totalAmount)}</dd>
        </div>

        {voucher && discountAmount > 0 ? (
          <div className="flex items-center justify-between animate-in fade-in">
            <dt className="font-bold text-emerald-700">
              Giảm giá ({voucher.code})
            </dt>
            <dd className="font-black text-emerald-700">
              -{formatPrice(discountAmount)}
            </dd>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-[#17191F]/10 pt-3">
          <dt className="font-black text-bv-heading">Tổng thanh toán</dt>
          <dd className="text-xl font-black text-bv-accent">{formatPrice(finalTotal)}</dd>
        </div>
      </dl>

      {/* Voucher Input Area */}
      <div className="mt-5">
        <VoucherInput
          onApply={(discount, applied) => {
            setDiscountAmount(discount);
            setVoucher(applied);
          }}
          originalAmount={totalAmount}
        />
      </div>

      {checkoutIssues.length > 0 ? (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950 shadow-xs">
          <p className="font-black text-amber-900">Chưa thể đặt hàng:</p>
          <ul className="mt-1.5 list-inside list-disc space-y-1 font-medium text-amber-900">
            {checkoutIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {checkoutForm}

      <p className="mt-4 rounded-lg bg-bv-muted px-3 py-2 text-xs leading-5 text-[#42524D]">
        Đây là bước thanh toán mô phỏng, chưa trừ tiền thật. Thông tin này chỉ giúp BookVerse cải thiện những gợi ý sách dành cho bạn.
      </p>
    </aside>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles, Tag, X } from "lucide-react";
import { calculateVoucherDiscount, MOCK_VOUCHERS, type VoucherDefinition } from "@/lib/vouchers";

interface VoucherInputProps {
  originalAmount: number;
  onApply: (discount: number, voucher: VoucherDefinition | null) => void;
  className?: string;
}

export function VoucherInput({ originalAmount, onApply, className = "" }: VoucherInputProps) {
  const [code, setCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherDefinition | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleApply(voucherToApply?: string) {
    const codeToUse = voucherToApply || code;
    const result = calculateVoucherDiscount(codeToUse, originalAmount);

    if (result.success && result.voucher) {
      setAppliedVoucher(result.voucher);
      setCode(result.voucher.code);
      setFeedback({ type: "success", text: result.message });
      onApply(result.discountAmount, result.voucher);
    } else {
      setAppliedVoucher(null);
      setFeedback({ type: "error", text: result.message });
      onApply(0, null);
    }
  }

  function handleRemove() {
    setAppliedVoucher(null);
    setCode("");
    setFeedback(null);
    onApply(0, null);
  }

  return (
    <div className={`rounded-2xl border border-bv-ink/10 bg-white p-4 shadow-xs ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-bv-heading" htmlFor="voucher-input">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-bv-primary/10 text-bv-primary">
            <Tag className="h-3.5 w-3.5" />
          </span>
          Mã giảm giá / Ưu đãi
        </label>
        {appliedVoucher ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 ring-1 ring-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Đã áp dụng
          </span>
        ) : null}
      </div>

      {!appliedVoucher ? (
        <div className="mt-3 flex gap-2">
          <input
            className="h-10 flex-1 rounded-xl border border-bv-ink/15 bg-[#FAF8F2] px-3 text-xs font-black uppercase text-bv-heading placeholder:font-normal placeholder:normal-case placeholder:text-bv-text-muted transition focus:border-bv-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-bv-primary/20"
            id="voucher-input"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleApply();
              }
            }}
            placeholder="Nhập mã (VD: BOOKVERSE50)..."
            type="text"
            value={code}
          />
          <button
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-bv-primary px-4 text-xs font-black text-white shadow-xs transition hover:bg-bv-primary-dark active:scale-95 disabled:cursor-not-allowed disabled:bg-bv-ink/20 disabled:text-bv-ink/40"
            disabled={!code.trim()}
            onClick={() => handleApply()}
            type="button"
          >
            Áp dụng
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-300/60 bg-[#EDF8F5] p-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bv-primary text-white">
              <Tag className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="font-mono font-black text-bv-primary-dark">{appliedVoucher.code}</p>
              <p className="text-[11px] font-bold text-bv-text-muted">{appliedVoucher.name}</p>
            </div>
          </div>
          <button
            aria-label="Hủy mã voucher"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-bv-ink/60 transition hover:bg-red-100 hover:text-red-700"
            onClick={handleRemove}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Suggestion Pills */}
      {!appliedVoucher ? (
        <div className="mt-3 border-t border-bv-ink/5 pt-2.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-bv-text-muted">Mã giảm nhanh:</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {Object.values(MOCK_VOUCHERS).map((v) => (
              <button
                className="group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-bv-primary/20 bg-[#FAF8F2] px-2.5 py-1 text-[11px] font-black text-bv-primary transition hover:border-bv-primary hover:bg-bv-primary hover:text-white active:scale-95"
                key={v.code}
                onClick={() => handleApply(v.code)}
                type="button"
              >
                <Sparkles className="h-3 w-3 text-bv-accent transition group-hover:text-white" />
                {v.code}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`mt-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
          role="status"
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          ) : (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      ) : null}
    </div>
  );
}

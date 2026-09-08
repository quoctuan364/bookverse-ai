export interface VoucherDefinition {
  code: string;
  name: string;
  type: "fixed" | "percent";
  value: number; // 50000 VND or 20 (%)
  description: string;
  minOrderValue?: number;
}

export const MOCK_VOUCHERS: Record<string, VoucherDefinition> = {
  BOOKVERSE50: {
    code: "BOOKVERSE50",
    name: "Giảm 50.000đ",
    type: "fixed",
    value: 50000,
    description: "Giảm trực tiếp 50.000đ cho đơn hàng hoặc gói hội viên",
  },
  SINHVIEN20: {
    code: "SINHVIEN20",
    name: "Ưu đãi Sinh viên 20%",
    type: "percent",
    value: 20,
    description: "Giảm 20% tổng giá trị đơn hàng",
  },
  NOVAREAD: {
    code: "NOVAREAD",
    name: "Nova Reader 10%",
    type: "percent",
    value: 10,
    description: "Giảm 10% đặc quyền độc giả BookVerse AI",
  },
};

export interface VoucherApplyResult {
  success: boolean;
  message: string;
  voucher?: VoucherDefinition;
  discountAmount: number;
  finalAmount: number;
}

export function calculateVoucherDiscount(
  voucherCode: string,
  originalAmount: number,
): VoucherApplyResult {
  const normalized = voucherCode.trim().toUpperCase();
  if (!normalized) {
    return {
      success: false,
      message: "Vui lòng nhập mã giảm giá.",
      discountAmount: 0,
      finalAmount: originalAmount,
    };
  }

  const voucher = MOCK_VOUCHERS[normalized];
  if (!voucher) {
    return {
      success: false,
      message: `Mã "${voucherCode}" không hợp lệ hoặc đã hết hạn.`,
      discountAmount: 0,
      finalAmount: originalAmount,
    };
  }

  let discount = 0;
  if (voucher.type === "fixed") {
    discount = Math.min(voucher.value, originalAmount);
  } else if (voucher.type === "percent") {
    discount = Math.round((originalAmount * voucher.value) / 100);
  }

  const finalAmount = Math.max(0, originalAmount - discount);

  return {
    success: true,
    message: `Đã áp dụng mã ${voucher.code}: ${voucher.name}!`,
    voucher,
    discountAmount: discount,
    finalAmount,
  };
}

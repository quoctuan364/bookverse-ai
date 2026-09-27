"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  HeartHandshake,
  Landmark,
  Loader2,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";

import type { CartPageData, CartItem } from "@/actions/cart.actions";
import { BookCover } from "@/components/shared/BookCover";
import { VoucherInput } from "@/components/shared/VoucherInput";
import type { VoucherDefinition } from "@/lib/vouchers";

interface CartViewProps {
  cart: CartPageData;
  message?: string;
  error?: string;
  updateQuantityAction: (formData: FormData) => Promise<void>;
  removeItemAction: (formData: FormData) => Promise<void>;
  checkoutAction: (formData: FormData) => Promise<void>;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function conditionLabel(value: string | null): string {
  switch (value) {
    case "NEW":
      return "Mới";
    case "LIKE_NEW":
      return "Như mới";
    case "GOOD":
      return "Tốt";
    case "FAIR":
      return "Đã dùng";
    case "POOR":
      return "Cũ";
    case "DIGITAL":
      return "Sách điện tử";
    default:
      return "Tiêu chuẩn";
  }
}

const PAYMENT_METHODS = [
  {
    value: "COD",
    label: "Thanh toán khi nhận hàng (COD)",
    description: "Kiểm tra hàng và thanh toán trực tiếp cho nhân viên giao hàng",
    icon: Banknote,
    badge: "Phổ biến",
  },
  {
    value: "BANK_TRANSFER_DEMO",
    label: "Chuyển khoản ngân hàng (Mô phỏng)",
    description: "Quét mã VietQR hoặc chuyển khoản qua Internet Banking",
    icon: Landmark,
    badge: "Tiện lợi",
  },
  {
    value: "WALLET_DEMO",
    label: "Ví BookVerse (Mô phỏng)",
    description: "Trừ trực tiếp số dư ví điện tử BookVerse của bạn",
    icon: Wallet,
    badge: "Nhanh nhất",
  },
];

export function CartView({
  cart,
  message,
  error,
  updateQuantityAction,
  removeItemAction,
  checkoutAction,
}: CartViewProps) {
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    cart.selectedShippingAddressId ||
      cart.shippingAddresses.find((a) => a.isDefault)?.id ||
      cart.shippingAddresses[0]?.id ||
      "",
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("COD");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucher, setVoucher] = useState<VoucherDefinition | null>(null);
  const [isCheckingOut, startCheckoutTransition] = useTransition();

  const finalTotal = Math.max(0, cart.totalAmount - discountAmount);

  // Xử lý khi giỏ hàng trống
  if (cart.items.length === 0) {
    return (
      <main className="min-h-[75vh] bg-[#FAF8F2] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Breadcrumb */}
          <nav aria-label="Đường dẫn trang" className="mb-6 flex items-center gap-2 text-xs font-semibold text-[#66706B]">
            <Link className="hover:text-[#176B62]" href="/">Trang chủ</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#1D2433]">Giỏ hàng</span>
          </nav>

          <div className="rounded-3xl border border-[#1D2433]/10 bg-white p-8 text-center shadow-sm sm:p-14">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-[#EBF6F3] text-[#176B62] shadow-inner">
              <ShoppingBag className="h-12 w-12" />
            </div>
            <h1 className="mt-6 text-2xl font-black text-[#1D2433] sm:text-3xl">
              Giỏ hàng của bạn đang trống
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#66706B]">
              Bạn chưa có cuốn sách nào trong giỏ hàng. Hãy khám phá hàng ngàn tựa sách đặc sắc tại BookVerse nhé!
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#176B62] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#176B62]/20 transition hover:bg-[#104C47]"
                href="/catalog"
              >
                Khám phá danh mục sách
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#1D2433]/15 bg-white px-6 py-3 text-sm font-bold text-[#1D2433] transition hover:bg-[#F2F9F7]"
                href="/marketplace"
              >
                Xem chợ sách cũ
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F2] pb-16 pt-6 text-[#1D2433]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Tiêu đề trang */}
        <nav aria-label="Đường dẫn trang" className="flex items-center gap-2 text-xs font-semibold text-[#66706B]">
          <Link className="hover:text-[#176B62]" href="/">Trang chủ</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[#1D2433]">Giỏ hàng</span>
        </nav>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-[#1D2433] sm:text-3xl">
              Giỏ hàng
            </h1>
            <span className="rounded-full bg-[#176B62]/10 px-3 py-1 text-xs font-bold text-[#176B62]">
              {cart.totalItems} sản phẩm
            </span>
          </div>
          <Link
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#176B62] hover:underline"
            href="/marketplace"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Tiếp tục chọn thêm sách
          </Link>
        </div>

        {/* Thông báo Message / Error */}
        {message ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Layout 2 Cột: Cột chính bên trái + Cột tóm tắt cố định bên phải */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-start">
          {/* CỘT CHÍNH (8 cột) */}
          <div className="space-y-6 lg:col-span-8">
            {/* THẺ 1: ĐỊA CHỈ NHẬN HÀNG */}
            <section className="rounded-2xl border border-[#1D2433]/10 bg-white p-5 shadow-xs sm:p-6">
              <div className="flex items-center justify-between border-b border-[#1D2433]/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF6F3] text-[#176B62]">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-black text-[#1D2433]">Địa chỉ giao hàng</h2>
                    <p className="text-xs text-[#66706B]">Chọn nơi bạn muốn nhận sách</p>
                  </div>
                </div>
                <Link
                  className="rounded-lg border border-[#1D2433]/15 px-3 py-1.5 text-xs font-bold text-[#176B62] transition hover:bg-[#EBF6F3]"
                  href="/profile/addresses"
                >
                  Quản lý địa chỉ
                </Link>
              </div>

              {cart.shippingAddresses.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {cart.shippingAddresses.map((address) => {
                    const isSelected = selectedAddressId === address.id;
                    const fullAddressStr = [
                      address.addressLine,
                      address.ward,
                      address.district,
                      address.province,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <div
                        className={`relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
                          isSelected
                            ? "border-[#176B62] bg-[#F2F9F7] ring-2 ring-[#176B62]/20"
                            : "border-[#1D2433]/10 bg-white hover:border-[#176B62]/40 hover:bg-[#FAF8F2]"
                        }`}
                        key={address.id}
                        onClick={() => setSelectedAddressId(address.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              checked={isSelected}
                              className="h-4 w-4 accent-[#176B62]"
                              id={`addr-${address.id}`}
                              name="shippingAddressRadio"
                              onChange={() => setSelectedAddressId(address.id)}
                              type="radio"
                              value={address.id}
                            />
                            <label className="cursor-pointer text-sm font-black text-[#1D2433]" htmlFor={`addr-${address.id}`}>
                              {address.fullName}
                            </label>
                          </div>
                          {address.isDefault ? (
                            <span className="rounded-full bg-[#176B62]/10 px-2 py-0.5 text-[10px] font-bold text-[#176B62]">
                              Mặc định
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs font-semibold text-[#66706B] pl-6">
                          {address.phone}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#1D2433] pl-6">
                          {fullAddressStr}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-6 text-center">
                  <p className="text-sm font-bold text-amber-900">
                    Bạn chưa có địa chỉ nhận hàng nào đã lưu.
                  </p>
                  <Link
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#176B62] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#104C47]"
                    href="/profile/addresses"
                  >
                    + Thêm địa chỉ mới ngay
                  </Link>
                </div>
              )}
            </section>

            {/* THẺ 2: DANH SÁCH SẢN PHẨM TRONG GIỎ */}
            <section className="rounded-2xl border border-[#1D2433]/10 bg-white p-5 shadow-xs sm:p-6">
              <div className="flex items-center justify-between border-b border-[#1D2433]/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF6F3] text-[#176B62]">
                    <ShoppingBag className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-black text-[#1D2433]">Sản phẩm ({cart.items.length})</h2>
                    <p className="text-xs text-[#66706B]">Kiểm tra số lượng và tình trạng sách</p>
                  </div>
                </div>
              </div>

              {/* Bảng sản phẩm */}
              <div className="mt-4 divide-y divide-[#1D2433]/5">
                {cart.items.map((item) => (
                  <article className="py-4 first:pt-0 last:pb-0" key={item.id}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      {/* Bìa và thông tin sách */}
                      <div className="flex min-w-0 flex-1 items-start gap-3.5">
                        <Link
                          className="aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-xl bg-[#EDE3D5] shadow-xs transition hover:opacity-90 sm:w-22"
                          href={`/book/${item.book.id}`}
                        >
                          <BookCover
                            alt={`Bìa sách ${item.book.title}`}
                            author={item.book.author}
                            bookId={item.book.id}
                            className="h-full w-full object-cover"
                            src={item.book.coverImage}
                            title={item.book.title}
                          />
                        </Link>

                        <div className="min-w-0 flex-1">
                          <Link
                            className="line-clamp-2 text-sm font-black text-[#1D2433] hover:text-[#176B62] hover:underline"
                            href={`/book/${item.book.id}`}
                          >
                            {item.listingTitle ?? item.book.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-[#66706B]">Tác giả: {item.book.author}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-[#66706B]">
                            <Store className="h-3 w-3 text-[#176B62]" />
                            <span>Người bán: <strong>{item.seller?.name ?? "BookVerse"}</strong></span>
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-[#176B62]/10 px-2 py-0.5 text-[11px] font-bold text-[#176B62]">
                              {conditionLabel(item.condition)}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                item.availability.ok
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {item.availability.ok ? "Có thể mua" : "Không khả dụng"}
                            </span>
                          </div>

                          {!item.availability.ok ? (
                            <p className="mt-2 text-xs font-semibold text-red-600">
                              {item.availability.message}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Đơn giá, Stepper Số lượng & Thành tiền */}
                      <div className="flex items-center justify-between gap-4 border-t border-[#1D2433]/5 pt-3 sm:border-0 sm:pt-0">
                        {/* Bộ điều khiển số lượng (Stepper) */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center rounded-xl border border-[#1D2433]/15 bg-[#FAF8F2] p-0.5">
                            <form action={updateQuantityAction}>
                              <input name="itemId" type="hidden" value={item.id} />
                              <button
                                aria-label="Giảm số lượng"
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#1D2433] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
                                disabled={item.quantity <= 1}
                                name="nextQuantity"
                                type="submit"
                                value={Math.max(1, item.quantity - 1)}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                            </form>

                            <span className="w-8 text-center text-xs font-black text-[#1D2433]">
                              {item.quantity}
                            </span>

                            <form action={updateQuantityAction}>
                              <input name="itemId" type="hidden" value={item.id} />
                              <button
                                aria-label="Tăng số lượng"
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#1D2433] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
                                disabled={item.quantity >= item.stock}
                                name="nextQuantity"
                                type="submit"
                                value={Math.min(item.stock, item.quantity + 1)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          </div>
                          <span className="text-[10px] text-[#66706B]">Kho: {item.stock}</span>
                        </div>

                        {/* Thành tiền & Nút xóa */}
                        <div className="text-right">
                          <p className="text-sm font-black text-[#176B62]">
                            {formatPrice(item.totalPrice)}
                          </p>
                          <p className="text-[11px] text-[#66706B]">
                            {formatPrice(item.unitPrice)} / cuốn
                          </p>
                        </div>

                        <form action={removeItemAction}>
                          <input name="itemId" type="hidden" value={item.id} />
                          <button
                            aria-label={`Xóa cuốn ${item.book.title} khỏi giỏ`}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-[#66706B] transition hover:bg-red-50 hover:text-red-600"
                            title="Xóa cuốn này"
                            type="submit"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* THẺ 3: PHƯƠNG THỨC THANH TOÁN */}
            <section className="rounded-2xl border border-[#1D2433]/10 bg-white p-5 shadow-xs sm:p-6">
              <div className="flex items-center gap-2.5 border-b border-[#1D2433]/10 pb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF6F3] text-[#176B62]">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-black text-[#1D2433]">Phương thức thanh toán</h2>
                  <p className="text-xs text-[#66706B]">Chọn hình thức bạn muốn thanh toán đơn hàng này</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = selectedPaymentMethod === method.value;
                  const Icon = method.icon;

                  return (
                    <div
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                        isSelected
                          ? "border-[#176B62] bg-[#F2F9F7] ring-2 ring-[#176B62]/20"
                          : "border-[#1D2433]/10 bg-white hover:border-[#176B62]/40 hover:bg-[#FAF8F2]"
                      }`}
                      key={method.value}
                      onClick={() => setSelectedPaymentMethod(method.value)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          checked={isSelected}
                          className="h-4 w-4 accent-[#176B62]"
                          id={`pm-${method.value}`}
                          name="paymentMethodRadio"
                          onChange={() => setSelectedPaymentMethod(method.value)}
                          type="radio"
                          value={method.value}
                        />
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#176B62] shadow-xs border border-[#1D2433]/10">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <label className="cursor-pointer text-sm font-black text-[#1D2433]" htmlFor={`pm-${method.value}`}>
                            {method.label}
                          </label>
                          <p className="text-xs text-[#66706B]">{method.description}</p>
                        </div>
                      </div>
                      <span className="hidden rounded-full bg-[#176B62]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#176B62] sm:inline-block">
                        {method.badge}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* CỘT PHẢI: TỔNG QUAN ĐƠN HÀNG (4 cột - Sticky) */}
          <aside className="space-y-6 lg:col-span-4 lg:sticky lg:top-24">
            {/* THẺ MÃ GIẢM GIÁ */}
            <div className="rounded-2xl border border-[#1D2433]/10 bg-white p-5 shadow-xs">
              <VoucherInput
                className="border-0 p-0 shadow-none"
                onApply={(discount, applied) => {
                  setDiscountAmount(discount);
                  setVoucher(applied);
                }}
                originalAmount={cart.totalAmount}
              />
            </div>

            {/* THẺ TÓM TẮT CHI PHÍ & ĐẶT HÀNG */}
            <div className="rounded-2xl border border-[#1D2433]/10 bg-white p-5 shadow-xs sm:p-6">
              <h2 className="text-base font-black text-[#1D2433]">Chi tiết thanh toán</h2>

              <dl className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-[#66706B]">
                  <dt>Mã giỏ hàng</dt>
                  <dd className="font-mono font-bold text-[#1D2433]">{cart.orderId ?? "Tự động tạo"}</dd>
                </div>
                <div className="flex items-center justify-between text-[#66706B]">
                  <dt>Tổng số lượng</dt>
                  <dd className="font-bold text-[#1D2433]">{cart.totalItems} cuốn</dd>
                </div>
                <div className="flex items-center justify-between text-[#66706B]">
                  <dt>Tạm tính tiền sách</dt>
                  <dd className="font-bold text-[#1D2433]">{formatPrice(cart.totalAmount)}</dd>
                </div>
                <div className="flex items-center justify-between text-[#66706B]">
                  <dt className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-emerald-600" />
                    Phí vận chuyển
                  </dt>
                  <dd className="font-bold text-emerald-700">Miễn phí</dd>
                </div>

                {voucher && discountAmount > 0 ? (
                  <div className="flex items-center justify-between text-emerald-700">
                    <dt className="flex items-center gap-1 font-bold">
                      <Tag className="h-3.5 w-3.5" />
                      Ưu đãi ({voucher.code})
                    </dt>
                    <dd className="font-black">-{formatPrice(discountAmount)}</dd>
                  </div>
                ) : null}

                <div className="border-t border-[#1D2433]/10 pt-3">
                  <div className="flex items-baseline justify-between">
                    <dt className="text-sm font-black text-[#1D2433]">Tổng thanh toán</dt>
                    <dd className="text-2xl font-black text-[#176B62]">
                      {formatPrice(finalTotal)}
                    </dd>
                  </div>
                  <p className="mt-1 text-right text-[10px] text-[#66706B]">Đã bao gồm thuế &amp; phí</p>
                </div>
              </dl>

              {/* Cảnh báo nếu chưa thể checkout */}
              {cart.checkoutIssues.length > 0 ? (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950">
                  <p className="flex items-center gap-1.5 font-black text-amber-900">
                    <AlertCircle className="h-4 w-4" />
                    Chưa thể tiến hành đặt hàng:
                  </p>
                  <ul className="mt-1.5 list-inside list-disc space-y-0.5 pl-1 font-medium text-amber-900">
                    {cart.checkoutIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* FORM THANH TOÁN (SUBMIT VỀ SERVER) */}
              <form
                action={(formData) => {
                  startCheckoutTransition(async () => {
                    await checkoutAction(formData);
                  });
                }}
                className="mt-5"
              >
                <input name="checkoutKey" type="hidden" value={`checkout-${cart.orderId ?? "empty"}`} />
                <input name="shippingAddressId" type="hidden" value={selectedAddressId} />
                <input name="paymentMethod" type="hidden" value={selectedPaymentMethod} />

                <button
                  className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#176B62] px-6 text-sm font-black text-white shadow-md shadow-[#176B62]/20 transition-all hover:bg-[#104C47] hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#1D2433]/20 disabled:text-[#1D2433]/40 disabled:shadow-none"
                  disabled={!cart.canCheckout || isCheckingOut || !selectedAddressId}
                  type="submit"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xử lý đặt hàng...
                    </>
                  ) : (
                    <>
                      <PackageCheck className="h-4 w-4" />
                      Tiến hành đặt hàng
                    </>
                  )}
                </button>
              </form>

              {/* Cam kết tin cậy */}
              <div className="mt-5 border-t border-[#1D2433]/10 pt-4 space-y-2 text-[11px] text-[#66706B]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#176B62]" />
                  <span>Đổi trả miễn phí 7 ngày nếu sách lỗi</span>
                </div>
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 shrink-0 text-[#176B62]" />
                  <span>Được đồng kiểm khi nhận hàng</span>
                </div>
                <div className="flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 shrink-0 text-[#176B62]" />
                  <span>Môi trường thanh toán demo an toàn</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

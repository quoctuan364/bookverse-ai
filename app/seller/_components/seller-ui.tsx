import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, ClipboardList, PackagePlus, Store } from "lucide-react";
import type { SellerGateData } from "@/actions/seller.actions";
import { cn } from "@/lib/utils";

export const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-black text-[#FFFDF8] transition hover:bg-[#0F5F59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]";
export const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-black text-zinc-100 transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]";
export const dangerButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-200 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500";
export const neutralButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-4 py-2 text-sm font-black text-[#17202A] transition hover:bg-[#EAF2EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]";

export const selectClass =
  "h-11 w-full rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm font-semibold text-[#17202A] outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/30";
export const textareaClass =
  "min-h-36 w-full resize-y rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-3 text-sm leading-6 text-[#17202A] outline-none transition placeholder:text-[#7A817C] focus-visible:ring-2 focus-visible:ring-[#0F766E]/30";

const sellerLinks = [
  { href: "/seller", label: "Tổng quan", icon: Store },
  { href: "/seller/listings", label: "Listing", icon: PackagePlus },
  { href: "/seller/orders", label: "Đơn hàng", icon: ClipboardList },
  { href: "/seller/revenue", label: "Doanh thu", icon: BarChart3 },
];

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function conditionLabel(value: string): string {
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
      return "Ebook";
    default:
      return value;
  }
}

export function listingStatusLabel(value: string): string {
  switch (value) {
    case "DRAFT":
      return "Nháp";
    case "PENDING_REVIEW":
      return "Chờ duyệt";
    case "APPROVED":
      return "Đã duyệt";
    case "SOLD":
      return "Đã bán";
    case "REJECTED":
      return "Từ chối";
    case "HIDDEN":
      return "Đã ẩn";
    case "ARCHIVED":
      return "Lưu trữ";
    default:
      return value;
  }
}

export function orderStatusLabel(value: string): string {
  switch (value) {
    case "PENDING":
      return "Chờ xử lý";
    case "PAID":
      return "Đã thanh toán";
    case "PAID_DEMO":
      return "Đã thanh toán demo";
    case "SHIPPED":
      return "Đang giao";
    case "COMPLETED":
      return "Hoàn tất";
    case "CANCELLED":
      return "Đã hủy";
    case "REFUNDED":
      return "Hoàn tiền";
    default:
      return value;
  }
}

export function paymentLabel(value: string | null): string {
  switch (value) {
    case "COD":
      return "COD";
    case "BANK_TRANSFER_DEMO":
      return "Chuyển khoản demo";
    case "WALLET_DEMO":
      return "Ví BookVerse demo";
    default:
      return "Chưa chọn";
  }
}

function statusClass(value: string): string {
  if (["APPROVED", "COMPLETED", "PAID", "PAID_DEMO", "ACTIVE", "SELLER", "ADMIN"].includes(value)) {
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }

  if (["PENDING", "PENDING_REVIEW", "DRAFT", "SHIPPED"].includes(value)) {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }

  if (["REJECTED", "HIDDEN", "ARCHIVED", "CANCELLED", "REFUNDED", "Rủi ro"].includes(value)) {
    return "bg-red-100 text-red-800 ring-red-200";
  }

  return "bg-zinc-100 text-zinc-700 ring-zinc-200";
}

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1", statusClass(value))}>
      {label ?? value}
    </span>
  );
}

export function SellerHero({
  action,
  description,
  kicker = "BookVerse Seller",
  title,
}: {
  action?: ReactNode;
  description: string;
  kicker?: string;
  title: string;
}) {
  return (
    <section className="bv-hero">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">{kicker}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#EAF5F1]">{description}</p>
        </div>
        {action}
      </div>
    </section>
  );
}

export function SellerNav() {
  return (
    <nav className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {sellerLinks.map((item) => {
        const Icon = item.icon;

        return (
          <Link className={secondaryButton} href={item.href} key={item.href}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SellerGatePanel({ gate }: { gate: SellerGateData }) {
  if (gate.status === "SELLER") {
    return null;
  }

  const isLoggedIn = gate.status !== "UNAUTHENTICATED";

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="bv-card rounded-lg p-6">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">
          {isLoggedIn ? "Cần bật vai trò người bán" : "Cần đăng nhập"}
        </p>
        <h2 className="mt-2 text-2xl font-black text-white">
          {isLoggedIn ? "Tài khoản của bạn chưa phải seller." : "Đăng nhập để mở Seller Dashboard."}
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          {isLoggedIn
            ? "Buyer có thể đăng ký nhanh để gửi listing chờ duyệt, theo dõi đơn và xem doanh thu."
            : "BookVerse cần biết tài khoản để bảo vệ listing, đơn hàng và doanh thu của từng người bán."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className={primaryButton} href={isLoggedIn ? "/seller/apply" : "/login?callbackUrl=/seller"}>
            {isLoggedIn ? "Đăng ký làm seller" : "Đăng nhập"}
          </Link>
          <Link className={secondaryButton} href="/marketplace">
            Xem chợ sách
          </Link>
        </div>
      </div>
    </section>
  );
}

export function SellerAlert({ message, tone }: { message?: string; tone: "error" | "success" }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {message}
    </div>
  );
}

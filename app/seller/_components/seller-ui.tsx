import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, ClipboardList, PackagePlus, Store } from "lucide-react";
import type { SellerGateData } from "@/actions/seller.actions";
import { cn } from "@/lib/utils";

export const primaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-bv-primary px-5 py-2.5 text-sm font-black text-white shadow-xs transition hover:bg-bv-primary-dark active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-bv-ink/15 bg-white px-4 py-2 text-sm font-black text-bv-heading shadow-xs transition hover:bg-bv-surface active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary disabled:cursor-not-allowed disabled:opacity-50";
export const dangerButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 shadow-xs transition hover:bg-red-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50";
export const neutralButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-bv-ink/15 bg-bv-surface px-4 py-2 text-sm font-black text-bv-heading transition hover:bg-bv-mint active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary disabled:cursor-not-allowed disabled:opacity-50";

export const selectClass =
  "h-12 w-full cursor-pointer rounded-xl border border-bv-ink/15 bg-white px-3 text-sm font-bold text-bv-heading outline-none transition focus-visible:border-bv-primary focus-visible:ring-2 focus-visible:ring-bv-primary/20";
export const textareaClass =
  "min-h-36 w-full resize-y rounded-xl border border-bv-ink/15 bg-white px-3.5 py-3 text-sm leading-6 text-bv-heading outline-none transition placeholder:text-bv-text-muted/70 focus-visible:border-bv-primary focus-visible:ring-2 focus-visible:ring-bv-primary/20";

const sellerLinks = [
  { href: "/seller", label: "Tổng quan", icon: Store },
  { href: "/seller/listings", label: "Tin đăng", icon: PackagePlus },
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
      return "sách điện tử";
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
  kicker = "Kênh bán sách",
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
          <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-gold">{kicker}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-bv-mint-soft">{description}</p>
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
  if (gate.canSell || gate.status === "SELLER") {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="bv-card rounded-lg p-6">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-gold">
          Kênh bán sách thành viên
        </p>
        <h2 className="mt-2 text-2xl font-black text-bv-heading">
          Đăng nhập để vào Kênh bán sách
        </h2>
        <p className="mt-3 text-sm leading-6 text-bv-text-muted">
          BookVerse hỗ trợ mọi thành viên đăng bán sách cũ, quản lý tin đăng và trao đổi trực tiếp với người mua.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className={primaryButton} href="/login?callbackUrl=/seller">
            Đăng nhập
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

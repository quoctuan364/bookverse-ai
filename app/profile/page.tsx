import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  BookMarked,
  BookOpen,
  CircleHelp,
  Highlighter,
  MapPin,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { getProfileDashboardData } from "@/actions/profile.actions";
import { BookCover } from "@/components/shared/BookCover";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  searchParams?: Promise<{
    message?: string;
  }>;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(value: Date | null): string {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Quản trị viên";
    case "MODERATOR":
      return "Kiểm duyệt viên";
    case "SELLER":
      return "Người bán";
    default:
      return "Độc giả";
  }
}

function getOrderStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Chờ thanh toán";
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
      return "Đã hoàn tiền";
    default:
      return status;
  }
}

function getListingStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Bản nháp";
    case "PENDING_REVIEW":
      return "Chờ duyệt";
    case "APPROVED":
      return "Đã duyệt";
    case "SOLD":
      return "Đã bán";
    case "REJECTED":
      return "Bị từ chối";
    case "ARCHIVED":
      return "Đã lưu trữ";
    default:
      return status;
  }
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const data = await getProfileDashboardData();

  if (!data) {
    redirect("/login?callbackUrl=/profile");
  }

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-gold">Hồ sơ cá nhân</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{data.user.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bv-mint-soft">
              {data.user.bio ??
                data.user.persona ??
                "Xem sách đang đọc, đơn hàng và tin đăng của bạn."}
            </p>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_12px_34px_rgba(0,0,0,0.12)] backdrop-blur-md">
            {data.user.avatarUrl ? (
              <img
                alt={`Avatar của ${data.user.name}`}
                className="mb-3 h-16 w-16 rounded-full border border-white/20 object-cover"
                src={data.user.avatarUrl}
              />
            ) : null}
            <p className="text-xs uppercase text-bv-gold">Vai trò</p>
            <p className="mt-1 flex items-center gap-2 font-semibold text-white">
              <BadgeCheck className="h-4 w-4 text-bv-gold" aria-hidden="true" />
              {getRoleLabel(data.user.role)}
            </p>
            <p className="mt-1 text-sm text-bv-mint-soft">{data.user.email ?? data.user.id}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { href: "/profile/settings", label: "Cài đặt", icon: Settings },
                { href: "/profile/security", label: "Bảo mật", icon: ShieldCheck },
                { href: "/profile/addresses", label: "Địa chỉ", icon: MapPin },
                { href: "/library", label: "Thư viện", icon: BookMarked },
                { href: "/help", label: "Hướng dẫn", icon: CircleHelp },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-bv-gold px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-bv-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    href={item.href}
                    key={item.href}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {params?.message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {params.message}
          </div>
        ) : null}

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.metrics.map((metric) => (
            <article className="min-w-0 rounded-2xl border border-bv-ink/10 bg-white p-5 shadow-sm" key={metric.label}>
              <p className="text-sm font-bold text-bv-text-muted">{metric.label}</p>
              <p className="mt-3 text-3xl font-black text-bv-heading">
                {metric.value.toLocaleString("vi-VN")}
              </p>
            </article>
          ))}
        </div>

        <section className="rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-bv-heading">Thể loại yêu thích</h2>
              <p className="mt-1 text-sm text-bv-text-muted">
                Các thể loại bạn thường đọc.
              </p>
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-bv-primary/20 px-4 text-sm font-black text-bv-primary transition hover:bg-bv-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
              href="/profile/settings"
            >
              Chỉnh sửa sở thích
            </Link>
          </div>
          {data.user.preferredGenres.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.user.preferredGenres.map((genre) => (
                <span
                  className="rounded-full bg-bv-muted px-3.5 py-1.5 text-sm font-bold text-bv-primary"
                  key={genre}
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-bv-primary/25 bg-bv-mint/40 px-4 py-4 text-sm text-bv-text-muted">
              Bạn chưa chọn thể loại yêu thích. Chọn ít nhất một thể loại để nhận gợi ý phù hợp hơn.
            </div>
          )}
        </section>

        {data.user.dailyReadingGoalMinutes || data.user.dailyReadingGoalPages ? (
          <section className="rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-bv-heading">Mục tiêu đọc hằng ngày</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-bv-ink/10 bg-bv-surface px-4 py-3">
                <p className="text-sm text-bv-text-muted">Số phút</p>
                <p className="mt-1 text-2xl font-black text-bv-accent">
                  {data.user.dailyReadingGoalMinutes ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-bv-ink/10 bg-bv-surface px-4 py-3">
                <p className="text-sm text-bv-text-muted">Số trang</p>
                <p className="mt-1 text-2xl font-black text-bv-accent">
                  {data.user.dailyReadingGoalPages ?? 0}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="min-w-0 rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-bv-heading">
              <BookOpen className="h-5 w-5 text-bv-primary" aria-hidden="true" />
              <h2 className="text-xl font-black">Đang đọc</h2>
            </div>

            {data.reading.length > 0 ? (
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                {data.reading.map((item) => (
                  <Link
                    className="flex gap-4 rounded-xl border border-bv-ink/10 bg-bv-surface p-3.5 transition hover:bg-bv-muted"
                    href={`/read/${item.bookId}`}
                    key={item.bookId}
                  >
                    <BookCover
                      alt={`Bìa sách ${item.title}`}
                      author={item.author}
                      bookId={item.bookId}
                      className="h-[120px] w-20 shrink-0 rounded-lg object-cover shadow-[0_6px_16px_rgba(39,44,51,0.08)]"
                      src={item.coverImage}
                      title={item.title}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-black text-bv-heading">{item.title}</p>
                      <p className="mt-1 truncate text-sm font-medium text-bv-text-muted">{item.author}</p>
                      <p className="mt-2 text-sm font-medium text-bv-text-muted">
                        Trang {item.currentPage} - {item.progressPercent.toFixed(0)}%
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-bv-ink/10">
                        <div
                          className="h-full rounded-full bg-bv-primary"
                          style={{ width: `${Math.min(item.progressPercent, 100)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-bv-text-muted">
                        Lần đọc gần nhất: {formatDate(item.lastReadAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface px-4 py-3 text-sm text-bv-text-muted">
                Chưa có tiến độ đọc. Hãy mở một sách và đọc thử.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-bv-heading">
              <Sparkles className="h-5 w-5 text-bv-gold" aria-hidden="true" />
              <h2 className="text-xl font-black">Gợi ý đã lưu</h2>
            </div>

            {data.recommendations.length > 0 ? (
              <div className="space-y-3">
                {data.recommendations.map((item) => (
                  <Link
                    className="block rounded-xl border border-bv-ink/10 bg-bv-surface px-4 py-3 transition hover:bg-bv-muted"
                    href={`/book/${item.bookId}`}
                    key={item.id}
                  >
                    <p className="line-clamp-1 font-black text-bv-heading">{item.title}</p>
                    <p className="mt-1 text-sm font-medium text-bv-text-muted">{item.author}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-bv-text-muted">
                      {item.evidenceStatus === "VERIFIED_REAL_USER"
                        ? item.reason
                        : "Chưa đủ dữ liệu để giải thích gợi ý này."}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface px-4 py-3 text-sm text-bv-text-muted">
                Chưa có gợi ý nào được lưu.
              </p>
            )}
          </section>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3 text-bv-heading">
              <span className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-bv-primary" aria-hidden="true" /><h2 className="text-xl font-black">Đơn hàng</h2></span>
              <Link className="inline-flex min-h-11 items-center text-sm font-bold text-bv-primary hover:underline" href="/orders">Xem tất cả</Link>
            </div>
            {data.orders.length > 0 ? (
              <div className="space-y-3">
                {data.orders.map((order) => (
                  <Link className="block rounded-xl border border-bv-ink/10 bg-bv-surface px-4 py-3 transition hover:bg-bv-muted" href={`/orders/${order.id}`} key={order.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black text-bv-heading">{order.id}</p>
                      <span className="rounded-full bg-bv-muted px-2.5 py-1 text-xs font-bold text-bv-primary">
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-bv-text-muted">
                      {order.books.join(", ") || "Không có sản phẩm"}
                    </p>
                    <p className="mt-2 font-black text-bv-accent">{formatPrice(order.totalAmount)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface px-4 py-3 text-sm text-bv-text-muted">
                Chưa có đơn hàng.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-bv-heading">
              <Store className="h-5 w-5 text-bv-primary" aria-hidden="true" />
              <h2 className="text-xl font-black">Tin bán sách của tôi</h2>
            </div>
            {data.listings.length > 0 ? (
              <div className="space-y-3">
                {data.listings.map((listing) => (
                  <div className="rounded-xl border border-bv-ink/10 bg-bv-surface px-4 py-3" key={listing.id}>
                    <p className="line-clamp-1 font-black text-bv-heading">{listing.title}</p>
                    <p className="mt-1 text-sm text-bv-text-muted">
                      {getListingStatusLabel(listing.status)} - {formatPrice(listing.price)}
                    </p>
                    <p className="mt-2 text-xs text-bv-text-muted">
                      Lượt xem {listing.views} | Vào giỏ {listing.cartAdds} | Mua {listing.purchases}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface px-4 py-3 text-sm text-bv-text-muted">
                Bạn chưa đăng bán sách.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-bv-heading">
              <Highlighter className="h-5 w-5 text-bv-gold" aria-hidden="true" />
              <h2 className="text-xl font-black">Đoạn tô sáng gần đây</h2>
            </div>
            {data.highlights.length > 0 ? (
              <div className="space-y-3">
                {data.highlights.map((highlight) => (
                  <Link
                    className="block rounded-xl border border-bv-ink/10 bg-bv-surface px-4 py-3 transition hover:bg-bv-muted"
                    href={`/read/${highlight.bookId}`}
                    key={highlight.id}
                  >
                    <p className="text-sm font-black text-bv-heading">
                      {highlight.bookTitle} - trang {highlight.pageNumber}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-bv-text-muted">
                      {highlight.text}
                    </p>
                    {highlight.note ? (
                      <p className="mt-2 text-xs font-semibold text-bv-accent">{highlight.note}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface px-4 py-3 text-sm text-bv-text-muted">
                Chưa có đoạn tô sáng.
              </p>
            )}
          </section>
        </div>

      </section>
    </main>
  );
}

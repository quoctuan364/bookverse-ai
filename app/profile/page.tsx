import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  BookMarked,
  BookOpen,
  ClipboardList,
  Highlighter,
  MapPin,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { getProfileDashboardData } from "@/actions/profile.actions";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  searchParams?: Promise<{
    message?: string;
  }>;
}

const fallbackCover =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%23153A3F'/%3E%3Crect x='48' y='56' width='304' height='488' rx='18' fill='%23F8F6F1' opacity='0.94'/%3E%3Ctext x='200' y='292' text-anchor='middle' font-family='Arial,sans-serif' font-size='38' font-weight='700' fill='%23153A3F'%3EBookVerse%3C/text%3E%3Ctext x='200' y='338' text-anchor='middle' font-family='Arial,sans-serif' font-size='28' fill='%23153A3F'%3EAI%3C/text%3E%3C/svg%3E";

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
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">BookVerse Profile</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{data.user.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#EAF5F1]">
              {data.user.bio ??
                data.user.persona ??
                "Theo dõi lịch sử đọc, đơn hàng, listing và gợi ý AI của tài khoản hiện tại."}
            </p>
          </div>

          <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.12)] backdrop-blur">
            {data.user.avatarUrl ? (
              <img
                alt={`Avatar của ${data.user.name}`}
                className="mb-3 h-16 w-16 rounded-full border border-white/20 object-cover"
                src={data.user.avatarUrl}
              />
            ) : null}
            <p className="text-xs uppercase text-[#D6A84F]">Vai trò</p>
            <p className="mt-1 flex items-center gap-2 font-semibold">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              {getRoleLabel(data.user.role)}
            </p>
            <p className="mt-1 text-sm text-[#EAF5F1]">{data.user.email ?? data.user.id}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { href: "/profile/settings", label: "Settings", icon: Settings },
                { href: "/profile/security", label: "Security", icon: ShieldCheck },
                { href: "/profile/addresses", label: "Addresses", icon: MapPin },
                { href: "/library", label: "Library", icon: BookMarked },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#D6A84F] px-3 text-sm font-black text-slate-950 transition hover:bg-[#F2C14E]"
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

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {params?.message ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {params.message}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.metrics.map((metric) => (
            <article className="bv-card rounded-lg p-5" key={metric.label}>
              <p className="text-sm font-bold text-[#66706B]">{metric.label}</p>
              <p className="mt-3 text-3xl font-black text-[#17202A]">
                {metric.value.toLocaleString("vi-VN")}
              </p>
            </article>
          ))}
        </div>

        {data.user.preferredGenres.length > 0 ? (
          <section className="bv-card rounded-lg p-5">
            <h2 className="text-lg font-black text-[#17202A]">Thể loại yêu thích</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.user.preferredGenres.map((genre) => (
                <span
                  className="rounded-full bg-[#EAF2EF] px-3 py-1 text-sm font-bold text-[#0F3F3C]"
                  key={genre}
                >
                  {genre}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {data.user.dailyReadingGoalMinutes || data.user.dailyReadingGoalPages ? (
          <section className="bv-card rounded-lg p-5">
            <h2 className="text-lg font-black text-[#17202A]">Mục tiêu đọc hằng ngày</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[#F7F4ED] px-4 py-3">
                <p className="text-sm text-[#66706B]">Số phút</p>
                <p className="mt-1 text-2xl font-black text-[#F2C14E]">
                  {data.user.dailyReadingGoalMinutes ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-[#F7F4ED] px-4 py-3">
                <p className="text-sm text-[#66706B]">Số trang</p>
                <p className="mt-1 text-2xl font-black text-[#F2C14E]">
                  {data.user.dailyReadingGoalPages ?? 0}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="bv-card rounded-lg p-5">
            <div className="mb-5 flex items-center gap-2 text-[#17202A]">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-xl font-black">Đang đọc</h2>
            </div>

            {data.reading.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {data.reading.map((item) => (
                  <Link
                    className="flex gap-4 rounded-lg bg-[#F7F4ED] p-3 transition hover:bg-[#EAF2EF]"
                    href={`/read/${item.bookId}`}
                    key={item.bookId}
                  >
                    <img
                      alt={`Bìa sách ${item.title}`}
                      className="h-28 w-20 shrink-0 rounded-lg object-cover shadow-[0_10px_22px_rgba(39,44,51,0.12)]"
                      src={item.coverImage ?? fallbackCover}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-black text-[#17202A]">{item.title}</p>
                      <p className="mt-1 truncate text-sm font-medium text-[#66706B]">{item.author}</p>
                      <p className="mt-2 text-sm font-medium text-[#66706B]">
                        Trang {item.currentPage} - {item.progressPercent.toFixed(0)}%
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E1D8C8]">
                        <div
                          className="h-full rounded-full bg-[#0F766E]"
                          style={{ width: `${Math.min(item.progressPercent, 100)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#66706B]">
                        Lần đọc gần nhất: {formatDate(item.lastReadAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-[#F7F4ED] px-4 py-3 text-sm text-[#66706B]">
                Chưa có tiến độ đọc. Hãy mở một sách và đọc thử.
              </p>
            )}
          </section>

          <section className="bv-card rounded-lg p-5">
            <div className="mb-5 flex items-center gap-2 text-[#17202A]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-xl font-black">Gợi ý đã lưu</h2>
            </div>

            {data.recommendations.length > 0 ? (
              <div className="space-y-3">
                {data.recommendations.map((item) => (
                  <Link
                    className="block rounded-lg bg-[#F7F4ED] px-4 py-3 transition hover:bg-[#EAF2EF]"
                    href={`/book/${item.bookId}`}
                    key={item.id}
                  >
                    <p className="line-clamp-1 font-black text-[#17202A]">{item.title}</p>
                    <p className="mt-1 text-sm font-medium text-[#66706B]">{item.author}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#66706B]">
                      {item.reason ?? `Điểm phù hợp: ${item.score.toFixed(2)}`}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-[#F7F4ED] px-4 py-3 text-sm text-[#66706B]">
                Chưa có gợi ý được lưu. Mở trang chủ khi AI service chạy để sinh dữ liệu.
              </p>
            )}
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="bv-card rounded-lg p-5">
            <div className="mb-5 flex items-center gap-2 text-[#17202A]">
              <ReceiptText className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-xl font-black">Đơn hàng</h2>
            </div>
            {data.orders.length > 0 ? (
              <div className="space-y-3">
                {data.orders.map((order) => (
                  <Link className="block rounded-lg bg-[#F7F4ED] px-4 py-3 transition hover:bg-[#EAF2EF]" href={`/orders/${order.id}`} key={order.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black text-[#17202A]">{order.id}</p>
                      <span className="rounded-full bg-[#EAF2EF] px-2 py-1 text-xs font-bold text-[#0F3F3C]">
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[#66706B]">
                      {order.books.join(", ") || "Không có item"}
                    </p>
                    <p className="mt-2 font-black text-[#E76F51]">{formatPrice(order.totalAmount)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-[#F7F4ED] px-4 py-3 text-sm text-[#66706B]">
                Chưa có đơn hàng.
              </p>
            )}
          </section>

          <section className="bv-card rounded-lg p-5">
            <div className="mb-5 flex items-center gap-2 text-[#17202A]">
              <Store className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-xl font-black">Listing của tôi</h2>
            </div>
            {data.listings.length > 0 ? (
              <div className="space-y-3">
                {data.listings.map((listing) => (
                  <div className="rounded-lg bg-[#F7F4ED] px-4 py-3" key={listing.id}>
                    <p className="line-clamp-1 font-black text-[#17202A]">{listing.title}</p>
                    <p className="mt-1 text-sm text-[#66706B]">
                      {getListingStatusLabel(listing.status)} - {formatPrice(listing.price)}
                    </p>
                    <p className="mt-2 text-xs text-[#66706B]">
                      Lượt xem {listing.views} | Vào giỏ {listing.cartAdds} | Mua {listing.purchases}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-[#F7F4ED] px-4 py-3 text-sm text-[#66706B]">
                Bạn chưa đăng bán sách.
              </p>
            )}
          </section>

          <section className="bv-card rounded-lg p-5">
            <div className="mb-5 flex items-center gap-2 text-[#17202A]">
              <Highlighter className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-xl font-black">Highlight gần đây</h2>
            </div>
            {data.highlights.length > 0 ? (
              <div className="space-y-3">
                {data.highlights.map((highlight) => (
                  <Link
                    className="block rounded-lg bg-[#F7F4ED] px-4 py-3 transition hover:bg-[#EAF2EF]"
                    href={`/read/${highlight.bookId}`}
                    key={highlight.id}
                  >
                    <p className="text-sm font-black text-[#17202A]">
                      {highlight.bookTitle} - trang {highlight.pageNumber}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#66706B]">
                      {highlight.text}
                    </p>
                    {highlight.note ? (
                      <p className="mt-2 text-xs text-[#C9784A]">{highlight.note}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-[#F7F4ED] px-4 py-3 text-sm text-[#66706B]">
                Chưa có highlight.
              </p>
            )}
          </section>
        </div>

        <section className="rounded-lg border border-[#17191F]/10 bg-[#F2C14E]/25 p-5">
          <div className="flex items-start gap-3">
            <ClipboardList className="mt-1 h-5 w-5 text-[#17202A]" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-black text-[#17202A]">Luồng demo gợi ý</h2>
              <p className="mt-1 text-sm leading-6 text-[#42524D]">
                Đọc sách, bookmark, highlight, review và checkout đều tạo event. Các event này được
                AI service dùng để sinh gợi ý có lý do giải thích.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

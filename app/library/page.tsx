import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, BookMarked, BookOpen, CalendarDays, Heart, Highlighter, LibraryBig, ReceiptText, Target, Trash2, Trophy } from "lucide-react";
import { getLibraryData, toggleFavoriteBook, type LibraryBookItem } from "@/actions/library.actions";
import { BookCover } from "@/components/shared/BookCover";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface LibraryPageProps {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
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

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(price);
}

function statusLabel(status: string): string {
  switch (status) {
    case "PAID":
      return "Đã thanh toán";
    case "PAID_DEMO":
      return "Đã thanh toán demo";
    case "SHIPPED":
      return "Đang giao";
    case "COMPLETED":
      return "Hoàn tất";
    default:
      return status;
  }
}

function MiniBook({ item, href }: { item: LibraryBookItem; href: string }) {
  return (
    <Link className="flex min-w-0 gap-3 rounded-xl border border-bv-ink/10 bg-bv-surface p-3 transition hover:bg-bv-muted" href={href}>
      <BookCover
        alt={`Bìa sách ${item.title}`}
        author={item.author}
        bookId={item.bookId}
        className="h-24 w-16 shrink-0 rounded-lg object-cover shadow-[0_6px_16px_rgba(0,0,0,0.08)]"
        src={item.coverImage}
        title={item.title}
      />
      <span className="min-w-0">
        <span className="line-clamp-2 font-black text-bv-heading">{item.title}</span>
        <span className="mt-1 block truncate text-sm text-bv-text-muted">{item.author}</span>
      </span>
    </Link>
  );
}

async function toggleFavoriteAction(formData: FormData) {
  "use server";

  const result = await toggleFavoriteBook(String(formData.get("bookId") ?? ""));

  if (!result.success) {
    redirect(`/library?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/library?message=${encodeURIComponent(result.message)}`);
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.isLocked) {
    redirect("/login?callbackUrl=/library");
  }

  const [params, data] = await Promise.all([searchParams, getLibraryData()]);

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-gold">Tủ sách cá nhân</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Thư viện của tôi</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bv-mint-soft">
              Sách đang đọc, đã mua, yêu thích, đánh dấu trang và đoạn tô sáng của tài khoản hiện tại.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
              href="/reading/insights"
            >
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              Thống kê đọc
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
              href="/reading/challenges"
            >
              <Trophy className="h-4 w-4" aria-hidden="true" />
              Thành tích
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
              href="/reading/calendar"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Lịch đọc
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
              href="/reading/goals"
            >
              <Target className="h-4 w-4" aria-hidden="true" />
              Mục tiêu
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-bv-ivory px-4 py-2 text-sm font-bold text-[#0F3F3C] shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition hover:bg-bv-gold/95"
              href="/catalog"
            >
              <LibraryBig className="h-4 w-4" aria-hidden="true" />
              Mở danh mục
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {params?.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}

        {params?.message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {params.message}
          </div>
        ) : null}

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="min-w-0 rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
              <BookOpen className="h-5 w-5 text-bv-primary" aria-hidden="true" />
              Sách đang đọc
            </h2>
            <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
              {data.reading.map((item) => (
                <div className="rounded-xl border border-bv-ink/10 bg-bv-surface p-3" key={item.bookId}>
                  <MiniBook item={item} href={`/read/${item.bookId}`} />
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-bv-ink/10">
                    <div className="h-full rounded-full bg-bv-primary" style={{ width: `${Math.min(item.progressPercent, 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-bv-text-muted">
                    Trang {item.currentPage} - {item.progressPercent.toFixed(0)}% - {item.totalMinutes} phút
                  </p>
                </div>
              ))}
              {data.reading.length === 0 ? (
                <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface p-5 text-sm text-bv-text-muted md:col-span-2">
                  Chưa có tiến độ đọc.
                </p>
              ) : null}
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
              <ReceiptText className="h-5 w-5 text-bv-primary" aria-hidden="true" />
              Sách đã mua
            </h2>
            <div className="mt-5 grid min-w-0 grid-cols-1 gap-3">
              {data.purchased.map((item) => (
                <div className="rounded-xl border border-bv-ink/10 bg-bv-surface p-3" key={`${item.orderId}-${item.bookId}`}>
                  <MiniBook item={item} href={`/book/${item.bookId}`} />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-bv-text-muted">
                    <Link className="font-black text-bv-primary hover:underline" href={`/orders/${item.orderId}`}>
                      {item.orderId}
                    </Link>
                    <span>{statusLabel(item.status)}</span>
                    <span className="font-bold text-bv-heading">{formatPrice(item.totalPrice)}</span>
                  </div>
                </div>
              ))}
              {data.purchased.length === 0 ? (
                <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface p-5 text-sm text-bv-text-muted">
                  Chưa có sách đã mua.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="min-w-0 rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
              <Heart className="h-5 w-5 text-bv-accent" aria-hidden="true" />
              Yêu thích
            </h2>
            <div className="mt-5 grid min-w-0 grid-cols-1 gap-3">
              {data.favorites.map((item) => (
                <div className="min-w-0 rounded-xl border border-bv-ink/10 bg-bv-surface p-3" key={item.favoriteId}>
                  <MiniBook item={item} href={`/book/${item.bookId}`} />
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-bv-text-muted">{formatDate(item.createdAt)}</span>
                    <form action={toggleFavoriteAction}>
                      <input name="bookId" type="hidden" value={item.bookId} />
                      <Button className="h-9 gap-2 border-bv-ink/15 text-bv-ink hover:bg-bv-surface" type="submit" variant="outline">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Bỏ
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
              {data.favorites.length === 0 ? (
                <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface p-5 text-sm text-bv-text-muted">
                  Chưa có sách yêu thích.
                </p>
              ) : null}
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
              <BookMarked className="h-5 w-5 text-bv-primary" aria-hidden="true" />
              Đánh dấu trang
            </h2>
            <div className="mt-5 grid min-w-0 grid-cols-1 gap-3">
              {data.bookmarks.map((item) => (
                <div className="min-w-0 rounded-xl border border-bv-ink/10 bg-bv-surface p-3" key={item.bookmarkId}>
                  <MiniBook item={item} href={`/read/${item.bookId}`} />
                  <p className="mt-3 text-xs text-bv-text-muted">Trang {item.pageNumber} - {formatDate(item.createdAt)}</p>
                </div>
              ))}
              {data.bookmarks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface p-5 text-sm text-bv-text-muted">
                  Chưa có đánh dấu trang.
                </p>
              ) : null}
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-bv-heading">
              <Highlighter className="h-5 w-5 text-bv-gold" aria-hidden="true" />
              Đoạn tô sáng gần đây
            </h2>
            <div className="mt-5 grid min-w-0 grid-cols-1 gap-3">
              {data.highlights.map((item) => (
                <Link
                  className="rounded-xl border border-bv-ink/10 bg-bv-surface p-4 transition hover:bg-bv-muted"
                  href={`/read/${item.bookId}`}
                  key={item.highlightId}
                >
                  <p className="line-clamp-1 font-black text-bv-heading">{item.title}</p>
                  <p className="mt-1 text-xs text-bv-text-muted">Trang {item.pageNumber} - {formatDate(item.createdAt)}</p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-bv-text-muted">{item.text}</p>
                  {item.note ? <p className="mt-2 text-xs font-semibold text-bv-accent">{item.note}</p> : null}
                </Link>
              ))}
              {data.highlights.length === 0 ? (
                <p className="rounded-xl border border-dashed border-bv-ink/15 bg-bv-surface p-5 text-sm text-bv-text-muted">
                  Chưa có đoạn tô sáng.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

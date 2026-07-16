import Link from "next/link";
import { redirect } from "next/navigation";
import { BookMarked, BookOpen, Heart, Highlighter, LibraryBig, ReceiptText, Trash2 } from "lucide-react";
import { getLibraryData, toggleFavoriteBook, type LibraryBookItem } from "@/actions/library.actions";
import { SafeBookCover } from "@/components/shared/SafeBookCover";
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
    <Link className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3 transition hover:bg-white/[0.08]" href={href}>
      <SafeBookCover
        alt={`Bìa sách ${item.title}`}
        className="h-24 w-16 shrink-0 rounded-lg object-cover shadow-[0_10px_22px_rgba(0,0,0,0.18)]"
        src={item.coverImage}
      />
      <span className="min-w-0">
        <span className="line-clamp-2 font-black text-white">{item.title}</span>
        <span className="mt-1 block truncate text-sm text-zinc-400">{item.author}</span>
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
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">Personal Library</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Thư viện của tôi</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#EAF5F1]">
              Sách đang đọc, đã mua, yêu thích, bookmark và highlight của tài khoản hiện tại.
            </p>
          </div>
          <Link
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-[#FFFDF8] px-4 py-2 text-sm font-bold text-[#0F3F3C] shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition hover:bg-[#F2C14E]/95"
            href="/catalog"
          >
            <LibraryBig className="h-4 w-4" aria-hidden="true" />
            Mở danh mục
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {params?.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}

        {params?.message ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {params.message}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
              <BookOpen className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
              Sách đang đọc
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {data.reading.map((item) => (
                <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3" key={item.bookId}>
                  <MiniBook item={item} href={`/read/${item.bookId}`} />
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#0F766E]" style={{ width: `${Math.min(item.progressPercent, 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Trang {item.currentPage} - {item.progressPercent.toFixed(0)}% - {item.totalMinutes} phút
                  </p>
                </div>
              ))}
              {data.reading.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-zinc-400 md:col-span-2">
                  Chưa có tiến độ đọc.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
              <ReceiptText className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
              Sách đã mua
            </h2>
            <div className="mt-5 grid gap-3">
              {data.purchased.map((item) => (
                <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3" key={`${item.orderId}-${item.bookId}`}>
                  <MiniBook item={item} href={`/book/${item.bookId}`} />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                    <Link className="font-black text-[#F2C14E] hover:underline" href={`/orders/${item.orderId}`}>
                      {item.orderId}
                    </Link>
                    <span>{statusLabel(item.status)}</span>
                    <span>{formatPrice(item.totalPrice)}</span>
                  </div>
                </div>
              ))}
              {data.purchased.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-zinc-400">
                  Chưa có sách đã mua.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
              <Heart className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
              Yêu thích
            </h2>
            <div className="mt-5 grid gap-3">
              {data.favorites.map((item) => (
                <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3" key={item.favoriteId}>
                  <MiniBook item={item} href={`/book/${item.bookId}`} />
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-500">{formatDate(item.createdAt)}</span>
                    <form action={toggleFavoriteAction}>
                      <input name="bookId" type="hidden" value={item.bookId} />
                      <Button className="h-9 gap-2 border-white/10 bg-white/[0.07] text-zinc-100 hover:bg-white/[0.12]" type="submit" variant="outline">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Bỏ
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
              {data.favorites.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-zinc-400">
                  Chưa có sách yêu thích.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
              <BookMarked className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
              Bookmark
            </h2>
            <div className="mt-5 grid gap-3">
              {data.bookmarks.map((item) => (
                <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3" key={item.bookmarkId}>
                  <MiniBook item={item} href={`/read/${item.bookId}`} />
                  <p className="mt-3 text-xs text-zinc-500">Trang {item.pageNumber} - {formatDate(item.createdAt)}</p>
                </div>
              ))}
              {data.bookmarks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-zinc-400">
                  Chưa có bookmark.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
              <Highlighter className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
              Highlight gần đây
            </h2>
            <div className="mt-5 grid gap-3">
              {data.highlights.map((item) => (
                <Link
                  className="rounded-xl border border-white/10 bg-white/[0.05] p-4 transition hover:bg-white/[0.08]"
                  href={`/read/${item.bookId}`}
                  key={item.highlightId}
                >
                  <p className="line-clamp-1 font-black text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">Trang {item.pageNumber} - {formatDate(item.createdAt)}</p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-300">{item.text}</p>
                  {item.note ? <p className="mt-2 text-xs text-[#F2C14E]">{item.note}</p> : null}
                </Link>
              ))}
              {data.highlights.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-zinc-400">
                  Chưa có highlight.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

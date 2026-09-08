import Link from "next/link";
import { BookOpen, Crown, Search, Sparkles } from "lucide-react";
import { SubscriptionStatus } from "@prisma/client";
import { getReadingLibrary } from "@/actions/membership.actions";
import { BookCover } from "@/components/shared/BookCover";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface ReadingLibraryPageProps {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    page?: string;
  }>;
}

function buildPageUrl(query: string, category: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/read?${suffix}` : "/read";
}

export default async function ReadingLibraryPage({
  searchParams,
}: ReadingLibraryPageProps) {
  const params = await searchParams;
  const data = await getReadingLibrary({
    query: params?.q,
    category: params?.category,
    page: Number(params?.page ?? 1),
  });
  const user = await getCurrentUser();
  const now = new Date();
  const activeMembership = user
    ? await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: SubscriptionStatus.ACTIVE,
          startsAt: { lte: now },
          endsAt: { gt: now },
        },
        orderBy: { endsAt: "desc" },
        select: { endsAt: true, plan: { select: { name: true } } },
      })
    : null;
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-bv-gold">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Kho đọc trực tuyến
            </p>
            <h1 className="bv-editorial mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
              Mọi cuốn sách đều có thể bắt đầu đọc
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-bv-mint-soft">
              Đọc thử miễn phí tối đa 10% mỗi cuốn. Một gói hội viên đang hoạt động
              sẽ mở toàn bộ nội dung đọc minh họa được BookVerse cấp quyền.
            </p>
          </div>

          <aside className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            {activeMembership ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-300/15 px-3 py-1 text-sm font-black text-emerald-100">
                  <Crown className="h-4 w-4" aria-hidden="true" />
                  Hội viên đang hoạt động
                </span>
                <h2 className="mt-4 text-xl font-black">{activeMembership.plan.name}</h2>
                <p className="mt-2 text-sm leading-6 text-bv-mint-soft">
                  Bạn đang được đọc toàn bộ nội dung BookVerse cấp quyền đến{" "}
                  {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
                    activeMembership.endsAt,
                  )}
                  .
                </p>
              </>
            ) : (
              <>
                <Crown className="h-7 w-7 text-bv-gold" aria-hidden="true" />
                <h2 className="mt-3 text-xl font-black">Muốn đọc toàn bộ?</h2>
                <p className="mt-2 text-sm leading-6 text-bv-mint-soft">
                  Chọn một gói để mở mọi sách và tự động nhận sách mới trong thời hạn.
                </p>
                <Link
                  className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-bv-gold px-4 py-2 font-black text-bv-heading transition hover:bg-[#F7D875] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  href="/membership"
                >
                  Xem gói hội viên
                </Link>
              </>
            )}
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
        <form
          action="/read"
          className="grid gap-3 rounded-2xl border border-bv-ink/10 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_240px_auto]"
        >
          <label className="relative">
            <span className="sr-only">Tìm sách hoặc tác giả</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-bv-text-muted"
              aria-hidden="true"
            />
            <input
              className="h-12 w-full rounded-lg border border-bv-ink/15 bg-[#FAF8F2] pl-12 pr-4 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-bv-primary"
              defaultValue={data.query}
              name="q"
              placeholder="Tìm theo tên sách hoặc tác giả..."
              type="search"
            />
          </label>
          <label>
            <span className="sr-only">Lọc theo thể loại</span>
            <select
              className="h-12 w-full cursor-pointer rounded-lg border border-bv-ink/15 bg-[#FAF8F2] px-3 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-bv-primary"
              defaultValue={data.category}
              name="category"
            >
              <option value="">Tất cả thể loại</option>
              {data.categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="min-h-12 cursor-pointer rounded-lg bg-bv-primary px-6 font-black text-white transition hover:bg-bv-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2"
            type="submit"
          >
            Tìm sách
          </button>
        </form>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-bv-accent">
              {data.total} kết quả
            </p>
            <h2 className="mt-1 text-3xl font-black text-bv-heading">
              Chọn sách để bắt đầu
            </h2>
          </div>
          <Link
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 font-bold text-bv-primary transition hover:bg-bv-mint"
            href="/membership/benefits"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Xem quyền lợi đọc
          </Link>
        </div>

        {data.books.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {data.books.map((book) => (
              <article className="group min-w-0" key={book.id}>
                <Link
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2"
                  href={`/read/${book.id}`}
                >
                  <BookCover
                    alt={`Bìa sách ${book.title}`}
                    author={book.authorName}
                    bookId={book.id}
                    category={book.category.name}
                    className="aspect-[2/3] w-full rounded-xl object-cover shadow-[0_14px_34px_rgba(37,49,56,0.16)] transition duration-200 group-hover:shadow-[0_20px_42px_rgba(37,49,56,0.22)]"
                    loading="lazy"
                    src={book.coverPath}
                    title={book.title}
                  />
                  <h3 className="mt-3 line-clamp-2 min-h-12 font-black leading-6 text-bv-heading">
                    {book.title}
                  </h3>
                </Link>
                <p className="mt-1 truncate text-sm text-bv-text-muted">{book.authorName}</p>
                <p className="mt-1 truncate text-xs font-bold text-bv-primary">
                  {book.pages ? `${book.pages} trang` : "Ebook"} · Đọc thử 10%
                </p>
                <Link
                  className="mt-3 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-bv-primary px-3 py-2 text-sm font-black text-white transition hover:bg-bv-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2"
                  href={`/read/${book.id}`}
                >
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  {activeMembership ? "Đọc toàn bộ" : "Đọc thử"}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-bv-primary/30 bg-white p-10 text-center">
            <Search className="mx-auto h-9 w-9 text-bv-primary" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-black text-bv-heading">Không tìm thấy sách</h2>
            <p className="mt-2 text-bv-text-muted">Thử từ khóa khác hoặc bỏ bộ lọc thể loại.</p>
            <Link className="mt-4 inline-flex min-h-11 items-center font-black text-bv-primary" href="/read">
              Xem toàn bộ kho
            </Link>
          </div>
        )}

        {totalPages > 1 ? (
          <nav aria-label="Phân trang kho đọc" className="mt-10 flex items-center justify-center gap-3">
            {data.page > 1 ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-lg border bg-white px-4 py-2 font-bold transition hover:bg-bv-surface"
                href={buildPageUrl(data.query, data.category, data.page - 1)}
              >
                Trang trước
              </Link>
            ) : null}
            <span className="px-3 text-sm font-bold text-bv-text-muted">
              Trang {data.page}/{totalPages}
            </span>
            {data.page < totalPages ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-lg border bg-white px-4 py-2 font-bold transition hover:bg-bv-surface"
                href={buildPageUrl(data.query, data.category, data.page + 1)}
              >
                Trang sau
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}

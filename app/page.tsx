import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Bot,
  BookOpen,
  CirclePlus,
  Clock3,
  Compass,
  LibraryBig,
  MessageCircle,
  Play,
  Search,
  Sparkles,
  Store,
} from "lucide-react";

import { getHomeShelvesData } from "@/actions/home-shelves.actions";
import { AiRecommendationSection } from "@/components/home/AiRecommendationSection";
import { GenreBookShelf } from "@/components/home/GenreBookShelf";
import { HomeBookShelf } from "@/components/home/HomeBookShelf";
import { BookCover } from "@/components/shared/BookCover";
import { AI_DISCOVERY_PROMPTS, buildAssistantDiscoveryHref } from "@/lib/ai-discovery-prompts";
import { selectHomeShelfBooks } from "@/lib/home-shelf-selection";

export const dynamic = "force-dynamic";

// Sáu thẻ đủ cho một kệ ngang trên desktop; phần còn lại mở qua "Xem tất cả".
// Giới hạn này giúp trang chủ không hydrate hàng chục BookCard ngoài viewport.
const HOME_SHELF_SIZE = 6;

/** Skeleton hiển thị trong khi Suspense chờ AI section stream xong. */
function AiRecommendationSkeleton() {
  return (
    <div
      aria-label="Đang tải gợi ý sách từ Nova..."
      className="mt-10 border-y border-bv-primary/10 bg-[#E7F0EB]/90 py-9 sm:py-11"
      role="status"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="h-72 animate-pulse rounded-3xl bg-[#0A332F]/20 lg:h-80" />
          <div className="h-72 animate-pulse rounded-3xl bg-white/50 lg:h-80" />
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  // Chỉ fetch dữ liệu kệ sách — nhanh. AI section stream riêng qua Suspense.
  const shelves = await getHomeShelvesData();

  // Tính offset ngày để kệ sách xoay vòng mượt mà mỗi ngày cho độc giả, luôn tươi mới mà vẫn đúng chuẩn thuật toán
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

  const seenBookIds = new Set<string>();
  const popularBooks = selectHomeShelfBooks(shelves.popular.books, seenBookIds, HOME_SHELF_SIZE, dayOfYear);
  const newestBooks = selectHomeShelfBooks(shelves.newest.books, seenBookIds, HOME_SHELF_SIZE, dayOfYear);
  const topRatedBooks = selectHomeShelfBooks(shelves.topRated.books, seenBookIds, HOME_SHELF_SIZE, dayOfYear);
  const readableBooks = selectHomeShelfBooks(shelves.readable.books, seenBookIds, HOME_SHELF_SIZE, dayOfYear);
  // Hero ưu tiên sách mới và dùng kệ phổ biến làm dự phòng để không hiện khung rỗng.
  const heroBooks = (newestBooks.length > 0 ? newestBooks : popularBooks).slice(0, 5);

  return (
    <main className="bv-page overflow-x-hidden pb-16">
      <section className="bv-home-hero relative overflow-hidden">
        {/* Animated orbs — thửa hướng từ globals.css */}
        <div className="bv-home-hero-orb-1" aria-hidden="true" />
        <div className="bv-home-hero-orb-2" aria-hidden="true" />
        <div className="bv-home-grid" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-9 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8 lg:py-14">
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-bv-ivory backdrop-blur-md">
              <BookOpen className="h-4 w-4 text-bv-gold" aria-hidden="true" />
              Khám phá kho sách
            </p>
            <h1 className="bv-editorial mt-4 max-w-3xl text-4xl font-black leading-[1.08] text-white sm:text-5xl lg:text-[3.55rem]">
              Tìm cuốn sách bạn muốn đọc
              <span className="block bg-gradient-to-r from-[#F4D787] via-[#FBEBB5] to-[#F4D787] bg-clip-text text-transparent">trên BookVerse.</span>
            </h1>
            <p className="mt-3.5 max-w-2xl text-base leading-7 text-[#D9EEEA]">
              Tìm theo tên sách, tác giả hoặc thể loại. Bạn cũng có thể đọc thử và mua sách cũ từ người dùng khác.
            </p>

            <form action="/catalog" className="mt-6 flex max-w-2xl flex-col gap-2.5 sm:flex-row" role="search">
              <label className="relative flex-1">
                <span className="sr-only">Tìm sách theo tên hoặc tác giả</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-bv-text-muted" aria-hidden="true" />
                <input
                  className="h-14 w-full rounded-2xl border border-white/30 bg-bv-ivory/95 pl-12 pr-4 text-base font-medium text-bv-heading shadow-sm backdrop-blur-sm outline-none transition placeholder:text-[#707B77] focus:border-bv-gold focus:ring-4 focus:ring-bv-gold/25"
                  name="q"
                  placeholder="Bạn muốn tìm cuốn sách nào?"
                  type="search"
                />
              </label>
              <button
                className="bv-btn-glow inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-bv-primary px-7 font-black text-white shadow-[0_10px_25px_rgba(23,107,98,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                type="submit"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
                Tìm sách
              </button>
            </form>

            <div className="mt-5 flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible" aria-label="Gợi ý khám phá nhanh">
              {AI_DISCOVERY_PROMPTS.slice(0, 3).map((prompt) => (
                <Link
                  className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-bv-gold/60 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  href={buildAssistantDiscoveryHref(prompt.query)}
                  key={prompt.id}
                >
                  <Sparkles className="h-3.5 w-3.5 text-bv-gold" aria-hidden="true" />
                  {prompt.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative mx-auto min-h-[330px] w-full max-w-[560px] sm:min-h-[390px] animate-in fade-in slide-in-from-right-4 duration-500" aria-label="Một số sách đang có trên BookVerse">
            <div className="absolute inset-x-3 bottom-2 top-8 rounded-[2rem] border border-white/15 bg-white/10 shadow-2xl backdrop-blur-md sm:inset-x-8" />
            {heroBooks.map((book, index) => {
              const positions = [
                "left-[28%] top-3 z-30 w-[42%] sm:left-[31%] sm:w-[38%]",
                "left-[3%] top-20 z-20 w-[32%] -rotate-6 sm:left-[5%] sm:w-[30%]",
                "right-[1%] top-16 z-20 w-[32%] rotate-6 sm:right-[3%] sm:w-[30%]",
                "bottom-0 left-[13%] z-10 hidden w-[26%] rotate-3 sm:block",
                "bottom-0 right-[12%] z-10 hidden w-[26%] -rotate-3 sm:block",
              ];
              return (
                <Link
                  aria-label={`Xem sách ${book.title}`}
                  className={`group absolute cursor-pointer rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.35)] transition-all duration-300 hover:z-40 hover:-translate-y-2 hover:scale-[1.03] focus-visible:z-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-bv-gold ${positions[index]}`}
                  href={`/book/${book.id}`}
                  key={book.id}
                >
                  <BookCover
                    alt={`Bìa sách ${book.title}`}
                    author={book.author}
                    bookId={book.id}
                    category={book.category}
                    className="w-full rounded-2xl border border-white/40 bg-white"
                    priority={index === 0}
                    src={book.coverImage}
                    title={book.title}
                  />
                </Link>
              );
            })}
            <div className="absolute bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/25 bg-[#092F2C]/90 px-4 py-2 text-xs font-black text-white shadow-xl backdrop-blur-md">
              <Compass className="h-4 w-4 text-bv-gold" aria-hidden="true" />
              Chọn bìa để xem sách
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="quick-discovery-heading" className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-bv-accent">Khám phá</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-bv-heading" id="quick-discovery-heading">
          Bạn muốn làm gì?
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            className="group relative min-h-44 overflow-hidden rounded-2xl border border-[#CFE4DF] bg-gradient-to-br from-[#EAF5F1] via-[#E5F3EE] to-[#DBF0E8] p-6 shadow-sm transition-all duration-200 hover:-translate-y-1.5 hover:border-bv-primary/50 hover:shadow-[0_20px_44px_rgba(23,107,98,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
            href="/community"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bv-primary text-white shadow-[0_8px_20px_rgba(23,107,98,0.30)] transition-transform duration-200 group-hover:scale-110">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-black text-bv-heading">Cộng đồng yêu sách</h3>
            <p className="mt-1.5 text-sm leading-6 text-[#42524D]">Đăng bài, bình luận và chia sẻ cảm nhận cùng độc giả khác.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-bv-primary">
              Vào thảo luận <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1.5" aria-hidden="true" />
            </span>
          </Link>

          <Link
            className="group relative min-h-44 overflow-hidden rounded-2xl border border-[#E7D8B5] bg-gradient-to-br from-[#FFF8E6] via-[#FFF4D6] to-[#FFEEc4] p-6 shadow-sm transition-all duration-200 hover:-translate-y-1.5 hover:border-[#C79A38]/60 hover:shadow-[0_20px_44px_rgba(167,116,27,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8751B]"
            href="/marketplace"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A8751B] text-white shadow-[0_8px_20px_rgba(168,117,27,0.30)] transition-transform duration-200 group-hover:scale-110">
              <Store className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-black text-bv-heading">Chợ sách cũ</h3>
            <p className="mt-1.5 text-sm leading-6 text-[#5B4A29]">
              Tìm sách đã qua sử dụng từ cộng đồng BookVerse.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-[#8A5C00]">
              Tìm sách cũ <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1.5" aria-hidden="true" />
            </span>
          </Link>

          <Link
            className="group relative min-h-44 overflow-hidden rounded-2xl border border-[#E9CFC5] bg-gradient-to-br from-[#FDF2ED] via-[#FCEAE0] to-[#FAE0D5] p-6 shadow-sm transition-all duration-200 hover:-translate-y-1.5 hover:border-bv-accent/50 hover:shadow-[0_20px_44px_rgba(169,68,50,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-accent"
            href="/seller/listings/new"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bv-accent text-white shadow-[0_8px_20px_rgba(169,68,50,0.30)] transition-transform duration-200 group-hover:scale-110">
              <CirclePlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-black text-bv-heading">Đăng bán sách</h3>
            <p className="mt-1.5 text-sm leading-6 text-[#674138]">Chia sẻ cuốn sách bạn muốn bán, thêm tình trạng và giá để mọi người cùng xem.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-bv-accent">
              Bắt đầu đăng bán <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1.5" aria-hidden="true" />
            </span>
          </Link>

          <Link
            className="group relative min-h-44 overflow-hidden rounded-2xl border border-[#CBCFE0] bg-gradient-to-br from-[#EFF1F9] via-[#E8ECF8] to-[#DEE3F4] p-6 shadow-sm transition-all duration-200 hover:-translate-y-1.5 hover:border-[#4B5680]/50 hover:shadow-[0_20px_44px_rgba(52,62,101,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B5680]"
            href="/assistant"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#414C75] text-white shadow-[0_8px_20px_rgba(65,76,117,0.30)] transition-transform duration-200 group-hover:scale-110">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-black text-bv-heading">Nova · Trợ lý đọc sách</h3>
            <p className="mt-1.5 text-sm leading-6 text-[#424B6C]">Nhập chủ đề hoặc thể loại để Nova tìm một vài cuốn sách.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-[#414C75]">
              Hỏi Nova <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1.5" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>

      {shelves.databaseError ? (
        <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8" role="alert">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm font-semibold text-amber-950">
            {shelves.databaseError}
          </div>
        </div>
      ) : null}

      {shelves.continueReading.length > 0 ? (
        <section aria-labelledby="continue-reading-heading" className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#173A36] p-5 shadow-[0_22px_55px_rgba(23,58,54,0.18)] sm:p-7">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#F4D787]">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            Đang đọc
          </p>
          <h2 className="bv-editorial mt-2 text-2xl font-black text-white sm:text-3xl" id="continue-reading-heading">
            Tiếp tục từ nơi bạn dừng lại
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {shelves.continueReading.map((book) => (
              <article className="grid grid-cols-[88px_1fr] gap-4 rounded-2xl border border-bv-primary/15 bg-white p-4 shadow-sm" key={book.id}>
                <BookCover
                  alt={`Bìa sách ${book.title}`}
                  author={book.author}
                  bookId={book.id}
                  category={book.category}
                  className="w-full rounded-lg"
                  src={book.coverImage}
                  title={book.title}
                />
                <div className="flex min-w-0 flex-col">
                  <h3 className="bv-editorial line-clamp-2 font-black leading-5 text-bv-ink">{book.title}</h3>
                  <p className="mt-1 truncate text-xs text-bv-text-subtle">{book.author}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-bv-muted">
                    <div className="h-full rounded-full bg-bv-primary" style={{ width: `${Math.min(100, book.progressPercent)}%` }} />
                  </div>
                  <p className="mt-1 text-xs font-bold text-bv-text-subtle">{book.progressPercent.toFixed(0)}% hoàn thành</p>
                  <Link
                    className="mt-auto inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-black text-bv-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
                    href={`/read/${book.id}`}
                  >
                    <Play className="h-4 w-4" aria-hidden="true" />
                    Tiếp tục đọc
                  </Link>
                </div>
              </article>
            ))}
          </div>
          </div>
        </section>
      ) : null}

      <Suspense fallback={<AiRecommendationSkeleton />}>
        <AiRecommendationSection />
      </Suspense>

      <HomeBookShelf
        books={popularBooks}
        description="Những cuốn đang được nhiều độc giả quan tâm."
        error={shelves.popular.error}
        eyebrow="Xu hướng"
        href="/catalog"
        id="popular"
        ranked
        title="Phổ biến"
        tone="cream"
      />

      <HomeBookShelf
        books={newestBooks}
        description="Những cuốn sách vừa có mặt trên BookVerse."
        error={shelves.newest.error}
        eyebrow="Mới cập nhật"
        href="/catalog?sort=newest"
        id="newest"
        title="Sách mới"
      />

      {topRatedBooks.length > 0 || shelves.topRated.error ? (
        <HomeBookShelf
          books={topRatedBooks}
          description="Những cuốn được độc giả đánh giá cao."
          error={shelves.topRated.error}
          eyebrow="Bạn đọc đánh giá"
          href="/catalog?sort=rating"
          id="top-rated"
          title="Đánh giá cao"
          tone="mint"
        />
      ) : null}

      <GenreBookShelf error={shelves.genreError} genres={shelves.genres} />

      <HomeBookShelf
        books={readableBooks}
        description="Đọc thử ngay trên BookVerse. Một số sách cần mua hoặc có gói hội viên để đọc toàn bộ."
        error={shelves.readable.error}
        eyebrow="Đọc trực tuyến"
        href="/read"
        id="readable"
        linkLabel="Vào kho đọc"
        title="Đọc ngay"
        tone="cream"
      />

      <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 rounded-3xl border border-bv-primary/15 bg-bv-ivory p-6 shadow-[0_20px_55px_rgba(37,49,56,0.08)] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-bv-accent">Kho sách BookVerse</p>
            <h2 className="bv-editorial mt-2 text-3xl font-black text-bv-heading">Tìm thêm sách trong danh mục</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-bv-text-subtle">
              Lọc theo thể loại, ngôn ngữ hoặc thứ tự mới nhất.
            </p>
          </div>
          <Link
            className="inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-bv-primary px-6 font-black text-white transition hover:bg-bv-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2"
            href="/catalog"
          >
            <LibraryBig className="h-5 w-5" aria-hidden="true" />
            Xem toàn bộ sách
          </Link>
        </div>
      </section>
    </main>
  );
}

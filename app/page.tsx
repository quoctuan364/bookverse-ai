import Link from "next/link";
import { Bot, BookOpen, Search, Sparkles, Store } from "lucide-react";
import { getRecommendedBooks } from "@/actions/recommendation.actions";
import { RecommendationTrackedLink } from "@/components/recommendation/RecommendationTrackedLink";
import { BookCard } from "@/components/shared/BookCard";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const userId = currentUser && !currentUser.isLocked ? currentUser.id : undefined;
  const userName = currentUser && !currentUser.isLocked ? currentUser.name ?? "bạn" : "bạn";
  const recommendationBatch = await getRecommendedBooks();
  const recommendedBooks = recommendationBatch.books;
  const sectionTitle = userId ? `Gợi ý dành riêng cho bạn, ${userName}` : "Sách nổi bật hôm nay";
  const heroBooks = recommendedBooks.slice(0, 5);

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:px-8 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-[#FFFDF8] shadow-[0_12px_34px_rgba(0,0,0,0.12)]">
              <Sparkles className="h-4 w-4 text-[#F2C14E]" aria-hidden="true" />
              Gợi ý AI
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {sectionTitle}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[#EAF5F1]">
              Tìm sách, đọc online, mua demo, thảo luận và để hệ gợi ý học từ hành vi đọc của bạn.
            </p>

            <form action="/catalog" className="relative mt-8 w-full max-w-2xl" role="search">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#66706B]"
            />
            <input
              aria-label="Tìm kiếm sách"
              className="h-14 w-full rounded-lg border border-white/20 bg-[#FFFDF8] pl-14 pr-32 text-base font-medium text-[#17202A] shadow-[0_18px_42px_rgba(0,0,0,0.16)] outline-none transition placeholder:text-[#7C8581] focus:ring-4 focus:ring-white/25"
              name="q"
              placeholder="Tìm sách, tác giả, chủ đề..."
              type="search"
            />
            <button
              className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-lg bg-[#0F766E] px-5 text-sm font-bold text-[#FFFDF8] transition hover:bg-[#0F5F59]"
              type="submit"
            >
              Tìm kiếm
            </button>
          </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#FFFDF8] px-4 text-sm font-bold text-[#0F3F3C] shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition hover:bg-[#F2C14E]/95"
                href="/assistant"
              >
                <Bot className="h-4 w-4" aria-hidden="true" />
                Hỏi trợ lý AI
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 text-sm font-bold text-[#FFFDF8] transition hover:bg-white/18"
                href="/marketplace"
              >
                <Store className="h-4 w-4" aria-hidden="true" />
                Chợ sách cũ
              </Link>
            </div>
          </div>

          <div className="relative hidden min-h-[420px] lg:block">
            <div className="absolute inset-0 overflow-hidden rounded-lg border border-white/15 bg-white/10 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur">
              <div className="grid h-full grid-cols-5 items-end gap-3">
                {heroBooks.map((book, index) => (
                  <RecommendationTrackedLink
                    bookId={book.id}
                    className="group block"
                    href={`/book/${book.id}`}
                    key={book.id}
                    requestId={recommendationBatch.requestId}
                    style={{ transform: `translateY(${index % 2 === 0 ? "18px" : "-10px"})` }}
                  >
                    <img
                      alt={`Bìa sách ${book.title}`}
                      className="aspect-[2/3] w-full rounded-lg object-cover shadow-[0_18px_34px_rgba(0,0,0,0.28)] transition duration-300 group-hover:-translate-y-2"
                      src={book.coverImage ?? "/covers/flat/book-0001.svg"}
                    />
                  </RecommendationTrackedLink>
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-6 left-6 right-6 rounded-lg border border-white/18 bg-[#17191F]/72 px-4 py-3 text-[#FFFDF8] shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur">
              <p className="text-sm font-bold">Kệ sách hôm nay</p>
              <p className="mt-1 text-xs leading-5 text-[#DCE8E4]">
                Mở một sách để bắt đầu đọc, bookmark và ghi nhận tiến độ.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#E76F51]">Gợi ý AI</p>
            <h2 className="mt-2 text-2xl font-black text-[#17202A] sm:text-3xl">
              {sectionTitle}
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-6 text-[#66706B]">
            {userId
              ? "Dữ liệu được lấy từ microservice Python và sắp xếp theo hành vi của tài khoản hiện tại."
              : "Bạn chưa đăng nhập, hệ thống đang hiển thị danh sách fallback từ cơ sở dữ liệu."}
          </p>
        </div>

        {recommendedBooks.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {recommendedBooks.map((book) => (
              <BookCard
                book={book}
                key={book.id}
                recommendationRequestId={recommendationBatch.requestId}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[#17191F]/10 bg-[#FFFDF8] p-8 text-center text-sm text-[#66706B] shadow-[0_12px_34px_rgba(39,44,51,0.08)]">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-[#0F766E]" aria-hidden="true" />
            Chưa có dữ liệu sách để hiển thị.
          </div>
        )}
      </section>
    </main>
  );
}

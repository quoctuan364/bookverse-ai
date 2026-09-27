import Link from "next/link";
import { ArrowRight, BookOpen, Bot, Sparkles } from "lucide-react";

import { HomeShelfScroller } from "@/components/home/HomeShelfScroller";
import { RecommendationTrackedLink } from "@/components/recommendation/RecommendationTrackedLink";
import { BookCard } from "@/components/shared/BookCard";
import { BookCover } from "@/components/shared/BookCover";
import { AI_DISCOVERY_PROMPTS, buildAssistantDiscoveryHref } from "@/lib/ai-discovery-prompts";
import type { HomeShelfBook } from "@/lib/home-shelf-types";

interface AiRecommendationShowcaseProps {
  books: HomeShelfBook[];
  hasVerifiedPersonalization: boolean;
  recommendationRequestId?: string | null;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

/** Khu gợi ý gồm các nhu cầu thường gặp và một cuốn sách tiêu biểu. */
export function AiRecommendationShowcase({
  books,
  hasVerifiedPersonalization,
  recommendationRequestId,
}: AiRecommendationShowcaseProps) {
  const [featuredBook, ...remainingBooks] = books;
  const isPersonalized = hasVerifiedPersonalization || Boolean(featuredBook?.recommendationEvidence);

  return (
    <section aria-labelledby="ai-recommendation-heading" className="mt-10 border-y border-bv-primary/10 bg-[#E7F0EB]/90 py-9 sm:py-11">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-stretch">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F4C46] via-[#0D443E] to-[#0A332F] p-5 text-white shadow-[0_20px_48px_rgba(13,76,70,0.22)] sm:p-6">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full border border-white/10" aria-hidden="true" />
            <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-bv-gold/15 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-bv-gold backdrop-blur-md shadow-sm">
                <Bot className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#F4D787]">
                Gợi ý từ Nova
              </p>
              <h2 className="bv-editorial mt-3 text-3xl font-black leading-tight sm:text-4xl" id="ai-recommendation-heading">
                Bạn muốn tìm sách gì?
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#D9EEEA]">
                Chọn một chủ đề bên dưới hoặc tự nhập yêu cầu cho Nova.
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
                {AI_DISCOVERY_PROMPTS.slice(0, 4).map((prompt) => (
                  <Link
                    className="group min-h-16 cursor-pointer rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-bv-gold/60 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
                    href={buildAssistantDiscoveryHref(prompt.query)}
                    key={prompt.id}
                  >
                    <span className="flex items-center justify-between gap-2 text-sm font-black">
                      {prompt.label}
                      <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[#C9E2DD]">{prompt.description}</span>
                  </Link>
                ))}
              </div>

              <Link
                className="mt-5 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-bv-gold px-6 font-black text-[#173A36] shadow-[0_10px_24px_rgba(242,193,78,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F5D98B] hover:shadow-[0_14px_28px_rgba(242,193,78,0.4)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                href="/assistant"
              >
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                Trò chuyện với Nova
              </Link>
            </div>
          </div>

          {featuredBook ? (
            <article className="relative grid overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_48px_rgba(37,49,56,0.12)] transition-shadow duration-300 hover:shadow-[0_24px_56px_rgba(37,49,56,0.18)] sm:grid-cols-[minmax(210px,0.82fr)_minmax(0,1.18fr)]">
              <div className="relative grid min-h-[340px] place-items-center overflow-hidden bg-gradient-to-br from-[#E0ECE7] via-[#F4E9D1] to-[#D8C39B] p-7 sm:min-h-[420px]">
                <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full border-[32px] border-white/30" aria-hidden="true" />
                <div className="absolute -bottom-16 -right-12 h-48 w-48 rounded-full bg-bv-primary/15 blur-2xl" aria-hidden="true" />
                <RecommendationTrackedLink
                  aria-label={`Xem chi tiết sách ${featuredBook.title}`}
                  bookId={featuredBook.id}
                  className="group relative z-10 block w-full max-w-[230px] cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-bv-primary/50 focus-visible:ring-offset-4"
                  href={`/book/${featuredBook.id}`}
                  requestId={recommendationRequestId}
                >
                  <BookCover
                    alt={`Bìa sách ${featuredBook.title}`}
                    author={featuredBook.author}
                    bookId={featuredBook.id}
                    category={featuredBook.category}
                    className="aspect-[2/3] w-full rounded-xl object-cover shadow-[0_24px_45px_rgba(24,45,41,0.32)] transition-transform duration-300 group-hover:-translate-y-1"
                    loading="eager"
                    src={featuredBook.coverImage}
                    title={featuredBook.title}
                  />
                </RecommendationTrackedLink>
                <span className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-black text-bv-primary-dark shadow-sm backdrop-blur-sm">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  Có bản đọc thử
                </span>
              </div>
              <div className="flex min-w-0 flex-col p-6 sm:p-8">
                <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#FFF0C7] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#855B05]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {isPersonalized ? "Gợi ý dành cho bạn" : "Đáng đọc hôm nay"}
                </p>
                <h3 className="bv-editorial mt-4 text-3xl font-black leading-[1.15] text-bv-heading sm:text-4xl">
                  {featuredBook.title}
                </h3>
                <p className="mt-2 text-base font-bold text-bv-text-subtle">{featuredBook.author}</p>
                <div className="mt-5 rounded-2xl border border-bv-primary/10 bg-[#EDF5F1] px-4 py-3.5">
                  <p className="text-sm font-semibold leading-6 text-[#344B45]">
                  {featuredBook.recommendationEvidence
                    ? featuredBook.recommendationEvidence
                    : "Một cuốn đáng để bạn xem qua và đọc thử trước khi chọn mua."}
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-bv-primary/10 pb-5">
                  <span className="rounded-full border border-bv-primary/15 bg-white px-3 py-1.5 text-xs font-black text-bv-primary-dark">
                    {featuredBook.category?.trim() || "Sách tổng hợp"}
                  </span>
                  <span className="text-2xl font-black text-bv-accent">{formatPrice(featuredBook.price)}</span>
                </div>
                <RecommendationTrackedLink
                  bookId={featuredBook.id}
                  className="mt-auto inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-bv-primary px-5 font-black text-white shadow-[0_10px_24px_rgba(23,107,98,0.26)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-bv-primary-dark hover:shadow-[0_14px_28px_rgba(23,107,98,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2"
                  href={`/book/${featuredBook.id}`}
                  requestId={recommendationRequestId}
                >
                  Xem sách và đọc thử
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </RecommendationTrackedLink>
              </div>
            </article>
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-bv-primary/25 bg-white p-8 text-center text-sm font-semibold text-bv-text-subtle">
              Chưa có gợi ý phù hợp lúc này. Bạn thử quay lại sau nhé.
            </div>
          )}
        </div>

        {remainingBooks.length > 0 ? (
          <div className="mt-7">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-bv-accent">
                  {hasVerifiedPersonalization ? "Theo sở thích của bạn" : "Gợi ý thêm"}
                </p>
                <h3 className="bv-editorial mt-2 text-2xl font-black text-bv-heading">Có thể bạn cũng thích</h3>
              </div>
              <Link className="hidden min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-black text-bv-primary transition-colors hover:bg-white sm:inline-flex" href="/discover">
                Xem tất cả <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <HomeShelfScroller ariaLabel="Danh sách sách gợi ý">
              {remainingBooks.map((book) => (
                <BookCard
                  book={{ ...book, priceLabel: "Giá BookVerse" }}
                  key={book.id}
                  recommendationRequestId={recommendationRequestId}
                  returnPath="/"
                  showQuickActions={false}
                />
              ))}
            </HomeShelfScroller>
          </div>
        ) : null}
      </div>
    </section>
  );
}

import Link from "next/link";
import { ArrowRight, Bot, Sparkles } from "lucide-react";

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

/** Khu AI có một sách nổi bật và một kệ phụ, nhưng vẫn chỉ dùng dữ liệu backend. */
export function AiRecommendationShowcase({
  books,
  hasVerifiedPersonalization,
  recommendationRequestId,
}: AiRecommendationShowcaseProps) {
  const [featuredBook, ...remainingBooks] = books;

  return (
    <section aria-labelledby="ai-recommendation-heading" className="mt-14 border-y border-bv-primary/10 bg-[#E7F0EB]/90 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F4C46] via-[#0D443E] to-[#0A332F] p-6 text-white shadow-[0_24px_60px_rgba(13,76,70,0.25)] sm:p-8">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full border border-white/10" aria-hidden="true" />
            <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-bv-gold/15 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-bv-gold backdrop-blur-md shadow-sm">
                <Bot className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#F4D787]">
                Nova · Trợ lý đọc sách
              </p>
              <h2 className="bv-editorial mt-3 text-3xl font-black leading-tight sm:text-4xl" id="ai-recommendation-heading">
                Hôm nay bạn muốn đọc điều gì?
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#D9EEEA]">
                Chọn một nhu cầu có sẵn hoặc mô tả điều bạn đang tìm. Nova sẽ đối chiếu catalog BookVerse và trả về sách kèm căn cứ khi dữ liệu cho phép.
              </p>

              <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {AI_DISCOVERY_PROMPTS.map((prompt) => (
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
                className="mt-6 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-bv-gold px-6 font-black text-[#173A36] shadow-[0_10px_24px_rgba(242,193,78,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F5D98B] hover:shadow-[0_14px_28px_rgba(242,193,78,0.4)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                href="/assistant"
              >
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                Trò chuyện với Nova
              </Link>
            </div>
          </div>

          {featuredBook ? (
            <article className="grid overflow-hidden rounded-3xl border border-bv-primary/15 bg-[#FFFDF8] shadow-[0_20px_55px_rgba(37,49,56,0.12)] transition-all duration-300 hover:shadow-[0_24px_60px_rgba(37,49,56,0.18)] sm:grid-cols-[230px_1fr]">
              <RecommendationTrackedLink
                aria-label={`Xem chi tiết sách ${featuredBook.title}`}
                bookId={featuredBook.id}
                className="block bg-[#DED8CB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bv-primary"
                href={`/book/${featuredBook.id}`}
                requestId={recommendationRequestId}
              >
                <BookCover
                  alt={`Bìa sách ${featuredBook.title}`}
                  author={featuredBook.author}
                  bookId={featuredBook.id}
                  category={featuredBook.category}
                  className="h-full min-h-[330px] w-full sm:min-h-full"
                  loading="eager"
                  src={featuredBook.coverImage}
                  title={featuredBook.title}
                />
              </RecommendationTrackedLink>
              <div className="flex flex-col p-6 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-bv-accent">
                  {hasVerifiedPersonalization ? "AI chọn cho bạn" : "Lựa chọn nổi bật từ catalog"}
                </p>
                <h3 className="bv-editorial mt-3 text-3xl font-black leading-tight text-bv-heading">
                  {featuredBook.title}
                </h3>
                <p className="mt-2 text-sm font-bold text-bv-text-subtle">{featuredBook.author}</p>
                <p className="mt-5 text-sm leading-7 text-[#42524D]">
                  {hasVerifiedPersonalization && featuredBook.recommendationEvidence
                    ? featuredBook.recommendationEvidence
                    : "BookVerse chưa có đủ bằng chứng cá nhân hóa cho tài khoản này. Đây là lựa chọn hợp lệ từ catalog đang hoạt động, không phải nhận định AI tự tạo."}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-bv-muted px-3 py-1.5 text-xs font-black text-bv-primary-dark">
                    {featuredBook.category?.trim() || "Sách tổng hợp"}
                  </span>
                  <span className="text-xl font-black text-bv-accent">{formatPrice(featuredBook.price)}</span>
                </div>
                <RecommendationTrackedLink
                  bookId={featuredBook.id}
                  className="mt-auto inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-bv-primary px-5 font-black text-white shadow-[0_8px_20px_rgba(23,107,98,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-bv-primary-dark hover:shadow-[0_12px_24px_rgba(23,107,98,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2"
                  href={`/book/${featuredBook.id}`}
                  requestId={recommendationRequestId}
                >
                  Xem vì sao cuốn này phù hợp
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </RecommendationTrackedLink>
              </div>
            </article>
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-bv-primary/25 bg-white p-8 text-center text-sm font-semibold text-bv-text-subtle">
              Chưa có đủ dữ liệu sách hợp lệ để tạo khu gợi ý.
            </div>
          )}
        </div>

        {remainingBooks.length > 0 ? (
          <div className="mt-9">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-bv-accent">
                  {hasVerifiedPersonalization ? "Gợi ý có bằng chứng" : "Phổ biến dành cho người đọc mới"}
                </p>
                <h3 className="bv-editorial mt-2 text-2xl font-black text-bv-heading">Thêm lựa chọn dành cho bạn</h3>
              </div>
              <Link className="hidden min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-black text-bv-primary transition-colors hover:bg-white sm:inline-flex" href="/discover">
                Xem tất cả <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <HomeShelfScroller ariaLabel="Kệ gợi ý AI">
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

import { Star } from "lucide-react";
import { RecommendationTrackedLink } from "@/components/recommendation/RecommendationTrackedLink";
import { BookCardActions } from "@/components/shared/BookCardActions";
import { BookCover } from "@/components/shared/BookCover";
import {
  getBookCardMetadataBadge,
  getRecommendationEvidencePresentation,
} from "@/lib/book-card-presentation";
import { formatBookPrice } from "@/lib/book-display-price";
import type { RecommendationEvidenceStatus } from "@/lib/recommendation-evidence-policy";

export interface BookCardData {
  id: string;
  title: string;
  author: string;
  category?: string | null;
  coverImage: string | null;
  price: number;
  recommendationScore?: number;
  recommendationEvidence?: string;
  recommendationEvidenceStatus?: RecommendationEvidenceStatus;
  catalogSource?: "CURATED_REAL" | "SYNTHETIC_DEMO";
  metadataBadge?: string;
  priceLabel?: string | null;
  sourceRating?: number | null;
  availableListingId?: string | null;
  isFavorite?: boolean;
}

interface BookCardProps {
  book: BookCardData;
  recommendationRequestId?: string | null;
  returnPath?: string;
  showQuickActions?: boolean;
}

export function BookCard({
  book,
  recommendationRequestId,
  returnPath = "/",
  showQuickActions = true,
}: BookCardProps) {
  const evidencePresentation = getRecommendationEvidencePresentation(book.recommendationEvidence, book.recommendationEvidenceStatus);
  const metadataBadge = getBookCardMetadataBadge(book.metadataBadge);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-bv-ink/8 bg-white text-bv-ink shadow-[0_4px_16px_rgba(37,49,56,0.07),_0_1px_3px_rgba(37,49,56,0.05)] transition-all duration-300 hover:-translate-y-2 hover:border-bv-primary/40 hover:shadow-[0_24px_52px_rgba(23,107,98,0.18),_0_4px_12px_rgba(37,49,56,0.08)]">
      <RecommendationTrackedLink
        aria-label={`Xem chi tiết sách ${book.title}`}
        bookId={book.id}
        className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bv-primary"
        href={`/book/${book.id}`}
        requestId={recommendationRequestId}
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-b from-[#e9e4d8] to-[#ddd8cc]">
          <BookCover
            alt={`Bìa sách ${book.title}`}
            author={book.author}
            bookId={book.id}
            category={book.category}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
            src={book.coverImage}
            title={book.title}
          />
          {/* Gradient nổi tiêu đề khi hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-bv-ink/28 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {metadataBadge ? (
            <span className="absolute left-2.5 top-2.5 rounded-full border border-white/80 bg-white/96 px-2.5 py-0.5 text-[11px] font-black text-bv-primary shadow-[0_2px_8px_rgba(0,0,0,0.14)] backdrop-blur-md">
              {metadataBadge}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="bv-editorial line-clamp-2 min-h-12 text-base font-bold leading-6 text-bv-ink transition-colors duration-200 group-hover:text-bv-primary">
            {book.title}
          </h3>
          <p className="mt-1.5 line-clamp-1 min-h-5 text-sm text-bv-text-subtle">
            {book.author}
          </p>
          <div className="mt-3 flex min-h-[2rem] items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {book.priceLabel ? (
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-bv-text-subtle">
                  {book.priceLabel}
                </p>
              ) : null}
              <p className="text-lg font-black text-bv-accent">{formatBookPrice(book.price)}</p>
            </div>
            {book.sourceRating ? (
              <span
                aria-label={`${book.sourceRating.toFixed(1)} trên 5 sao`}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-br from-amber-50 to-amber-100/80 px-2 py-0.5 text-[11px] font-black text-amber-800 shadow-sm ring-1 ring-amber-200/60"
              >
                <Star aria-hidden="true" className="h-3 w-3 fill-amber-400 text-amber-500" />
                {book.sourceRating.toFixed(1)}
              </span>
            ) : null}
          </div>
          <div className="mt-auto flex min-h-7 items-center justify-between gap-2 pt-3 text-xs font-bold">
            <span className="min-w-0 truncate rounded-full bg-bv-mint px-2.5 py-1 text-[#0E473F] ring-1 ring-bv-primary/12 transition-colors duration-200 group-hover:bg-bv-primary/12">
              {book.category?.trim() || "Tổng hợp"}
            </span>
            {book.availableListingId ? (
              <span className="shrink-0 inline-flex items-center gap-1 text-emerald-700 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Còn hàng
              </span>
            ) : null}
          </div>
          {book.recommendationEvidence ? (
            <p className="mt-3 line-clamp-2 rounded-xl border border-bv-primary/15 bg-gradient-to-br from-bv-mint/80 to-bv-mint/40 px-3 py-2 text-xs font-bold leading-5 text-[#0E473F]">
              {evidencePresentation.evidenceText}
            </p>
          ) : null}
        </div>
      </RecommendationTrackedLink>

      {showQuickActions ? (
        <div className="mt-auto border-t border-bv-ink/7 bg-bv-ivory/40 px-4 py-3.5">
          <BookCardActions
            availableListingId={book.availableListingId}
            bookId={book.id}
            initialFavorite={book.isFavorite}
            returnPath={returnPath}
            showCart
            primaryAction="read"
          />
        </div>
      ) : null}
    </article>
  );
}

import { BadgeCheck, Sparkles } from "lucide-react";
import { RecommendationTrackedLink } from "@/components/recommendation/RecommendationTrackedLink";
import { BookCardActions } from "@/components/shared/BookCardActions";
import { BookCover } from "@/components/shared/BookCover";
import { Badge } from "@/components/ui/badge";
import { getRecommendationEvidencePresentation } from "@/lib/book-card-presentation";
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

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

export function BookCard({
  book,
  recommendationRequestId,
  returnPath = "/",
  showQuickActions = true,
}: BookCardProps) {
  const evidencePresentation = getRecommendationEvidencePresentation(book.recommendationEvidence, book.recommendationEvidenceStatus);
  const isCurated = book.catalogSource === "CURATED_REAL";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#1D2433]/10 bg-white text-[#1D2433] shadow-[0_12px_30px_rgba(37,49,56,0.1)] transition-all duration-300 hover:border-[#176B62]/35 hover:shadow-[0_20px_42px_rgba(37,49,56,0.16)]">
      <RecommendationTrackedLink
        aria-label={`Xem chi tiết sách ${book.title}`}
        bookId={book.id}
        className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#176B62]"
        href={`/book/${book.id}`}
        requestId={recommendationRequestId}
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-[#e9e4d8]">
          <BookCover
            alt={`Bìa sách ${book.title}`}
            author={book.author}
            bookId={book.id}
            category={book.category}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            src={book.coverImage}
            title={book.title}
            useBookVerseArtwork={isCurated}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1d2433]/65 to-transparent" />
          <Badge className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] truncate border-0 bg-[#176B62] text-[#FFFDF8] shadow-[0_8px_20px_rgba(23,107,98,0.22)]">
            {isCurated ? (
              <BadgeCheck className="mr-1 h-3 w-3 shrink-0" aria-hidden="true" />
            ) : (
              <Sparkles className="mr-1 h-3 w-3 shrink-0" aria-hidden="true" />
            )}
            {book.metadataBadge ?? (isCurated ? "Sách tuyển chọn" : evidencePresentation.badgeLabel)}
          </Badge>
          <span className="absolute bottom-3 left-3 rounded-full bg-[#fffdf8]/95 px-3 py-1 text-sm font-black text-[#104C47] shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
            {formatPrice(book.price)}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="bv-editorial line-clamp-2 min-h-12 text-lg font-bold leading-6 text-[#1D2433]">
            {book.title}
          </h3>
          <p className="mt-2 line-clamp-1 min-h-5 text-sm font-medium text-[#687083]">
            {book.author}
          </p>
          <div className="mt-auto flex min-h-7 items-center justify-between gap-2 pt-3 text-xs font-bold">
            <span className="min-w-0 truncate rounded-full bg-[#F3F0E8] px-2.5 py-1 text-[#586274]">
              {book.category?.trim() || "Sách tổng hợp"}
            </span>
            {book.availableListingId ? (
              <span className="shrink-0 text-[#176B62]">Còn hàng</span>
            ) : null}
          </div>
        </div>
      </RecommendationTrackedLink>

      {showQuickActions ? (
        <div className="mt-auto border-t border-[#1D2433]/8 px-4 py-4">
          <BookCardActions
            availableListingId={book.availableListingId}
            bookId={book.id}
            initialFavorite={book.isFavorite}
            returnPath={returnPath}
            showCart
          />
        </div>
      ) : null}
    </article>
  );
}

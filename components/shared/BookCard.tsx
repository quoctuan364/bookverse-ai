import { BookOpen, Database, Info, Sparkles } from "lucide-react";
import { RecommendationTrackedLink } from "@/components/recommendation/RecommendationTrackedLink";
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
}

interface BookCardProps {
  book: BookCardData;
  recommendationRequestId?: string | null;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

export function BookCard({ book, recommendationRequestId }: BookCardProps) {
  const evidencePresentation = getRecommendationEvidencePresentation(book.recommendationEvidence, book.recommendationEvidenceStatus);
  const isCurated = book.catalogSource === "CURATED_REAL";

  return (
    <RecommendationTrackedLink
      aria-label={`Xem chi tiết sách ${book.title}`}
      bookId={book.id}
      className="block"
      href={`/book/${book.id}`}
      requestId={recommendationRequestId}
    >
      <article className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/72 text-zinc-100 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#0F766E]/45 hover:shadow-[0_28px_90px_rgba(0,0,0,0.36)]">
        <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
          <BookCover
            alt={`Bìa sách ${book.title}`}
            author={book.author}
            bookId={book.id}
            category={book.category}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            src={book.coverImage}
            title={book.title}
          />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/86 to-transparent" />
          <Badge className="absolute left-3 top-3 border-0 bg-[#0F766E] text-[#FFFDF8] shadow-[0_8px_20px_rgba(15,118,110,0.24)]">
            {isCurated ? (
              <Database className="mr-1 h-3 w-3" aria-hidden="true" />
            ) : (
              <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
            )}
            {book.metadataBadge ?? (isCurated ? "Sách trong danh mục" : evidencePresentation.badgeLabel)}
          </Badge>
          <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/82 px-3 py-1 text-sm font-black text-[#F2C14E] shadow-[0_8px_18px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            {book.priceLabel ? `${book.priceLabel} · ` : ""}{formatPrice(book.price)}
          </span>
        </div>

        <div className="space-y-3 p-4">
          <h3 className="line-clamp-2 min-h-12 text-base font-black leading-6 text-zinc-50">
            {book.title}
          </h3>
          <p className="truncate text-sm font-medium text-zinc-400">{book.author}</p>

          {isCurated ? (
            <p className="line-clamp-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs leading-5 text-zinc-300">
              <span className="inline-flex items-center gap-1 font-bold text-[#F2C14E]">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                Nguồn metadata
              </span>{" "}
              Open Library{book.sourceRating !== null && book.sourceRating !== undefined ? ` · Rating nguồn ${book.sourceRating.toFixed(1)}` : ""}
            </p>
          ) : (
            <p
              className="line-clamp-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs leading-5 text-zinc-300"
              title={evidencePresentation.evidenceText}
            >
              <span className="inline-flex items-center gap-1 font-bold text-[#F2C14E]">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                {evidencePresentation.evidenceLabel}
              </span>{" "}
              {evidencePresentation.evidenceText}
            </p>
          )}

          <span className="inline-flex items-center gap-2 text-sm font-bold text-[#7DD3C7]">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Xem chi tiết
          </span>
        </div>
      </article>
    </RecommendationTrackedLink>
  );
}

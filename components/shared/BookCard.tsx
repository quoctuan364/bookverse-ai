import { BookOpen, Info, Sparkles } from "lucide-react";
import { RecommendationTrackedLink } from "@/components/recommendation/RecommendationTrackedLink";
import { Badge } from "@/components/ui/badge";

export interface BookCardData {
  id: string;
  title: string;
  author: string;
  coverImage: string | null;
  price: number;
  recommendationScore?: number;
  recommendationEvidence?: string;
}

interface BookCardProps {
  book: BookCardData;
  recommendationRequestId?: string | null;
}

const fallbackCover =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%23153A3F'/%3E%3Crect x='48' y='56' width='304' height='488' rx='18' fill='%23F8F6F1' opacity='0.94'/%3E%3Ctext x='200' y='292' text-anchor='middle' font-family='Arial,sans-serif' font-size='38' font-weight='700' fill='%23153A3F'%3EBookVerse%3C/text%3E%3Ctext x='200' y='338' text-anchor='middle' font-family='Arial,sans-serif' font-size='28' fill='%23153A3F'%3EAI%3C/text%3E%3C/svg%3E";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function buildMockEvidence(book: BookCardData): string {
  const reasons = [
    `Gợi ý vì bạn quan tâm tác giả ${book.author}.`,
    `Gợi ý vì sách này gần với các chủ đề bạn đã đọc gần đây.`,
    `Gợi ý vì nhiều độc giả có hành vi đọc tương tự đã lưu sách này.`,
    `Gợi ý vì mức giá và độ phổ biến phù hợp với lịch sử tương tác của bạn.`,
  ];
  const seed = Array.from(book.id).reduce((total, character) => total + character.charCodeAt(0), 0);

  return reasons[seed % reasons.length];
}

export function BookCard({ book, recommendationRequestId }: BookCardProps) {
  const evidence = book.recommendationEvidence ?? buildMockEvidence(book);
  const badgeLabel = book.recommendationEvidence || book.recommendationScore ? "AI Gợi ý" : "Sách phù hợp";

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
          <img
            alt={`Bìa sách ${book.title}`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            src={book.coverImage ?? fallbackCover}
          />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/86 to-transparent" />
          <Badge className="absolute left-3 top-3 border-0 bg-[#0F766E] text-[#FFFDF8] shadow-[0_8px_20px_rgba(15,118,110,0.24)]">
            <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
            {badgeLabel}
          </Badge>
          <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/82 px-3 py-1 text-sm font-black text-[#F2C14E] shadow-[0_8px_18px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            {formatPrice(book.price)}
          </span>
        </div>

        <div className="space-y-3 p-4">
          <h3 className="line-clamp-2 min-h-12 text-base font-black leading-6 text-zinc-50">
            {book.title}
          </h3>
          <p className="truncate text-sm font-medium text-zinc-400">{book.author}</p>

          <p
            className="line-clamp-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs leading-5 text-zinc-300"
            title={evidence}
          >
            <span className="inline-flex items-center gap-1 font-bold text-[#F2C14E]">
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              Vì sao:
            </span>{" "}
            {evidence}
          </p>

          <span className="inline-flex items-center gap-2 text-sm font-bold text-[#7DD3C7]">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Xem chi tiết
          </span>
        </div>
      </article>
    </RecommendationTrackedLink>
  );
}

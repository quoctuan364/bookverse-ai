import Link from "next/link";
import { BadgeCheck, ShieldCheck, Star } from "lucide-react";
import { BookCover } from "@/components/shared/BookCover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BookListingBook {
  id: string;
  title: string;
  author: string;
  coverImage: string | null;
  price: number;
}

interface SellerQualityScore {
  score: number;
  completedOrders: number;
  cancelledOrders: number;
  reportedListings: number;
  isHighQuality: boolean;
  badge: string;
  formulaVersion: string;
}

export interface BookListingCardData {
  id: string;
  condition: string;
  price: number;
  seller?: {
    id: string;
    name: string;
  };
  sellerQualityScore?: SellerQualityScore;
  book: BookListingBook;
}

interface BookListingCardProps {
  listing: BookListingCardData;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function getConditionLabel(condition: string): string {
  switch (condition) {
    case "NEW":
      return "Mới";
    case "LIKE_NEW":
      return "Như mới";
    case "GOOD":
      return "Tốt";
    case "FAIR":
      return "Đã dùng";
    case "POOR":
      return "Cũ";
    case "DIGITAL":
      return "sách điện tử";
    default:
      return "Đã dùng";
  }
}

function getScoreTone(score?: number): string {
  if (!score) {
    return "text-zinc-400";
  }

  if (score >= 85) {
    return "text-bv-gold";
  }

  if (score >= 75) {
    return "text-[#7DD3C7]";
  }

  return "text-zinc-300";
}

export function BookListingCard({ listing }: BookListingCardProps) {
  const score = listing.sellerQualityScore?.score;

  return (
    <Link
      aria-label={`Xem chi tiết sách ${listing.book.title}`}
      className="block"
      href={`/book/${listing.book.id}`}
    >
      <article className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/72 text-zinc-100 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#D6A84F]/35 hover:shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
        <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
          <BookCover
            alt={`Bìa sách ${listing.book.title}`}
            author={listing.book.author}
            bookId={listing.book.id}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            src={listing.book.coverImage}
            title={listing.book.title}
          />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/88 to-transparent" />
          <Badge className="absolute left-3 top-3 border-0 bg-[#D6A84F] text-slate-950 shadow-sm">
            Chợ sách cũ
          </Badge>
          {listing.sellerQualityScore?.isHighQuality ? (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-bv-gold/35 bg-slate-950/76 px-3 py-1 text-xs font-black text-bv-gold backdrop-blur-xl">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Người bán uy tín
            </span>
          ) : null}
        </div>

        <div className="space-y-3 p-4">
          <h3 className="line-clamp-2 min-h-12 text-base font-black leading-6 text-zinc-50">
            {listing.book.title}
          </h3>
          <p className="truncate text-sm text-zinc-400">{listing.book.author}</p>

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">Tình trạng</p>
              <p className="mt-1 font-bold text-zinc-100">{getConditionLabel(listing.condition)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Uy tín người bán</p>
              <p className={cn("mt-1 inline-flex items-center gap-1 font-black", getScoreTone(score))}>
                <Star className="h-3.5 w-3.5" aria-hidden="true" />
                {score !== undefined ? `${score}/100` : "Chưa có"}
              </p>
            </div>
          </div>

          {listing.seller ? (
            <p className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400">
              <BadgeCheck className="h-4 w-4 text-[#7DD3C7]" aria-hidden="true" />
              {listing.seller.name}
              {listing.sellerQualityScore ? ` - ${listing.sellerQualityScore.badge}` : ""}
            </p>
          ) : null}

          <p className="text-base font-black text-bv-gold">{formatPrice(listing.price)}</p>
        </div>
      </article>
    </Link>
  );
}

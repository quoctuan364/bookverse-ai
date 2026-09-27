import { Star } from "lucide-react";

export interface ReviewSectionItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    name: string;
  };
}

interface ReviewSectionProps {
  reviews: ReviewSectionItem[];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getRatingStars(rating: number): boolean[] {
  const safeRating = Math.max(0, Math.min(5, rating));

  return Array.from({ length: 5 }, (_, index) => index < safeRating);
}

export function ReviewSection({ reviews }: ReviewSectionProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-bv-ink/10 bg-bv-ivory p-6 text-sm text-bv-text-subtle shadow-[0_12px_34px_rgba(39,44,51,0.08)]">
        Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận của bạn.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-bv-ink/10 bg-bv-ivory shadow-[0_12px_34px_rgba(39,44,51,0.08)]">
      {reviews.map((review) => (
        <article className="border-b border-[#17191F]/10 p-5 last:border-b-0" key={review.id}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-1" aria-label={`${review.rating} trên 5 sao`}>
                {getRatingStars(review.rating).map((isActive, index) => (
                  <Star
                    aria-hidden="true"
                    className={isActive ? "h-4 w-4 fill-[#D89B25] text-[#D89B25]" : "h-4 w-4 text-bv-border"}
                    key={`${review.id}-star-${index}`}
                  />
                ))}
              </div>
              <p className="mt-1 font-black text-bv-heading">{review.user.name}</p>
            </div>

            <time className="text-sm text-bv-text-muted" dateTime={review.createdAt}>
              {formatDate(review.createdAt)}
            </time>
          </div>

          <p className="mt-4 leading-7 text-[#42524D]">
            {review.comment ?? "Người dùng chưa viết nội dung đánh giá."}
          </p>
        </article>
      ))}
    </div>
  );
}

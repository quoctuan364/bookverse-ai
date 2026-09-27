"use client";

import { useState } from "react";
import { Star, Send, MessageSquareHeart } from "lucide-react";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { cn } from "@/lib/utils";

interface InteractiveReviewFormProps {
  bookId: string;
  action: (formData: FormData) => Promise<void>;
}

const RATING_HINTS: Record<number, string> = {
  5: "Tuyệt phẩm — Rất khuyên đọc",
  4: "Sách hay — Nhiều giá trị bổ ích",
  3: "Tạm ổn — Nội dung tương đối tròn trịa",
  2: "Chưa ưng ý — Cần cải thiện thêm",
  1: "Không hài lòng — Không đúng kỳ vọng",
};

export function InteractiveReviewForm({ bookId, action }: InteractiveReviewFormProps) {
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewLength, setReviewLength] = useState<number>(0);

  const activeRating = hoverRating || selectedRating;

  return (
    <form
      action={action}
      className="group relative overflow-hidden rounded-2xl border border-bv-ink/10 bg-gradient-to-b from-white to-bv-surface/60 p-5 shadow-[0_10px_30px_rgba(29,36,51,0.06)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(29,36,51,0.09)] sm:p-6"
    >
      <input name="bookId" type="hidden" value={bookId} />
      <input name="rating" type="hidden" value={selectedRating} />

      <div className="flex flex-col gap-5">
        {/* Rating Picker */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bv-ink/8 pb-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-bv-text-muted" htmlFor="rating-stars">
              Mức độ đánh giá của bạn
            </label>
            <div className="mt-1.5 flex items-center gap-1.5" id="rating-stars">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isLit = starValue <= activeRating;
                return (
                  <button
                    aria-label={`${starValue} sao`}
                    className="group/star rounded-lg p-1 transition-transform duration-150 hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-focus"
                    key={starValue}
                    onClick={() => setSelectedRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(0)}
                    type="button"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6 transition-all duration-200",
                        isLit
                          ? "fill-[#F2C14E] text-[#D4991A] drop-shadow-[0_2px_8px_rgba(242,193,78,0.45)]"
                          : "text-bv-border hover:text-bv-gold/70",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-bv-gold/25 bg-[#FFF9ED] px-3.5 py-1.5 text-xs font-bold text-[#8C5D00] shadow-sm">
            {RATING_HINTS[activeRating] ?? `${activeRating} sao`}
          </div>
        </div>

        {/* Review Textarea */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-bv-text-muted" htmlFor="reviewText">
              Cảm nhận chi tiết
            </label>
            <span className="text-xs font-medium text-bv-text-muted">
              {reviewLength} / 600 ký tự
            </span>
          </div>

          <div className="relative mt-2">
            <textarea
              className="min-h-28 w-full resize-y rounded-xl border border-bv-ink/15 bg-white p-3.5 text-sm leading-relaxed text-bv-ink placeholder:text-bv-text-muted/60 transition duration-200 focus:border-bv-focus focus:bg-white focus:outline-none focus:ring-4 focus:ring-bv-focus/15"
              id="reviewText"
              maxLength={600}
              name="reviewText"
              onChange={(e) => setReviewLength(e.target.value.length)}
              placeholder="Chia sẻ ngắn gọn điều bạn ấn tượng nhất hoặc chưa ưng ý về tác phẩm..."
              required
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs text-bv-text-muted">
            <MessageSquareHeart className="h-4 w-4 text-bv-primary" />
            <span>Nhận xét văn minh giúp cộng đồng có góc nhìn khách quan</span>
          </div>

          <SubmitButton
            className="gap-2 rounded-xl bg-bv-primary px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(23,107,98,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-bv-primary-dark hover:shadow-[0_12px_28px_rgba(23,107,98,0.32)] active:translate-y-0"
            pendingLabel="Đang gửi nhận xét..."
          >
            <Send className="h-4 w-4" />
            Gửi đánh giá
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

import { rankRecommendationBySeed } from "@/lib/recommendation-seed";
import { normalizeRecommendationCategory } from "@/lib/recommendation-affinity";

export type SmartRecommendationReason = "PREFERENCE" | "TRENDING" | "NEW" | "QUALITY" | "DISCOVERY";

export interface SmartRecommendationCandidate {
  id: string;
  category: string;
  createdAt: Date;
  rating: number;
  trendScore: number;
}

export interface RankedSmartRecommendation<T> {
  item: T;
  score: number;
  reasonType: SmartRecommendationReason;
  evidence: string;
}

interface SmartRecommendationContext {
  preferredGenres: Set<string>;
  categoryAffinity?: ReadonlyMap<string, number>;
  seed: string;
  now?: Date;
}

function freshnessScore(createdAt: Date, now: Date): number {
  const ageInDays = Math.max(0, now.getTime() - createdAt.getTime()) / 86_400_000;
  if (ageInDays <= 30) return 1;
  if (ageInDays <= 90) return 0.7;
  if (ageInDays <= 180) return 0.4;
  return 0.1;
}

/**
 * Xếp hạng lai cho nhánh dự phòng khi dịch vụ AI tạm thời không hoạt động.
 * Điểm dựa trên dữ liệu thật; seed chỉ dùng phá hòa để kết quả ổn định theo phiên.
 */
export function rankSmartRecommendations<T extends SmartRecommendationCandidate>(
  candidates: T[],
  context: SmartRecommendationContext,
): Array<RankedSmartRecommendation<T>> {
  const now = context.now ?? new Date();
  const maxTrendScore = Math.max(0, ...candidates.map((item) => item.trendScore));
  const normalizedPreferredGenres = new Set(
    [...context.preferredGenres].map(normalizeRecommendationCategory),
  );
  const hasPreferences =
    normalizedPreferredGenres.size > 0 || (context.categoryAffinity?.size ?? 0) > 0;

  return candidates
    .map((item) => {
      const normalizedCategory = normalizeRecommendationCategory(item.category);
      const preference = Math.min(
        1,
        Math.max(
          0,
          context.categoryAffinity?.get(normalizedCategory) ??
            (normalizedPreferredGenres.has(normalizedCategory) ? 1 : 0),
        ),
      );
      const trending = maxTrendScore > 0 ? item.trendScore / maxTrendScore : 0;
      const freshness = freshnessScore(item.createdAt, now);
      const quality = Math.min(1, Math.max(0, item.rating) / 5);
      const score = hasPreferences
        ? preference * 0.6 + trending * 0.2 + freshness * 0.1 + quality * 0.1
        : trending * 0.5 + freshness * 0.3 + quality * 0.2;

      if (preference > 0) {
        return {
          item,
          score,
          reasonType: "PREFERENCE" as const,
          evidence: `Hợp với thể loại ${item.category} bạn quan tâm.`,
        };
      }
      if (trending >= 0.35) {
        return {
          item,
          score,
          reasonType: "TRENDING" as const,
          evidence: "Đang được nhiều độc giả quan tâm gần đây.",
        };
      }
      if (freshness >= 0.7) {
        return {
          item,
          score,
          reasonType: "NEW" as const,
          evidence: "Sách mới được cập nhật trên BookVerse.",
        };
      }
      if (quality >= 0.8) {
        return {
          item,
          score,
          reasonType: "QUALITY" as const,
          evidence: "Được độc giả đánh giá tốt.",
        };
      }
      return {
        item,
        score,
        reasonType: "DISCOVERY" as const,
        evidence: "Một lựa chọn đáng xem trong kho sách BookVerse.",
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const seedDifference =
        rankRecommendationBySeed(context.seed, left.item.id) -
        rankRecommendationBySeed(context.seed, right.item.id);
      return seedDifference || left.item.id.localeCompare(right.item.id);
    });
}

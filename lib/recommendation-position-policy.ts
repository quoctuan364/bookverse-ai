export const RECOMMENDATION_TRACKING_REASONS = [
  "TRACKED",
  "DUPLICATE_BOOK_NORMALIZED",
  "INVALID_RANK_NORMALIZED",
  "PERSISTENCE_UNAVAILABLE",
  "DATABASE_UNAVAILABLE",
  "REQUEST_VALIDATION_FAILED",
] as const;

export type RecommendationTrackingReason = (typeof RECOMMENDATION_TRACKING_REASONS)[number];
export type RecommendationTrackingStatus = "TRACKED" | "DEGRADED";
export type RecommendationCandidateSource = "CURRENT" | "DAILY" | "LEGACY" | "FALLBACK";

const SOURCE_PRIORITY: Record<RecommendationCandidateSource, number> = {
  CURRENT: 0,
  DAILY: 1,
  LEGACY: 2,
  FALLBACK: 3,
};

export interface RecommendationCandidate<T> {
  bookId: string;
  score: number;
  evidence?: string | null;
  rank?: number | null;
  source: RecommendationCandidateSource;
  /** Thứ tự card mà production đã quyết định trước khi normalize. */
  productionOrder?: number;
  payload: T;
}

export interface NormalizedRecommendationCandidate<T> extends RecommendationCandidate<T> {
  position: number;
  originalRank: number | null;
}

export interface RecommendationNormalizationStats {
  inputCount: number;
  outputCount: number;
  duplicateBookCount: number;
  duplicateRankCount: number;
  invalidRankCount: number;
  invalidCandidateCount: number;
  truncatedCount: number;
}

export interface RecommendationNormalizationResult<T> {
  items: NormalizedRecommendationCandidate<T>[];
  reason: RecommendationTrackingReason;
  stats: RecommendationNormalizationStats;
}

function validRank(value: number | null | undefined): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function successReason(stats: RecommendationNormalizationStats): RecommendationTrackingReason {
  if (stats.duplicateBookCount > 0) return "DUPLICATE_BOOK_NORMALIZED";
  if (stats.invalidRankCount > 0) return "INVALID_RANK_NORMALIZED";
  if (stats.invalidCandidateCount > 0) return "REQUEST_VALIDATION_FAILED";
  return "TRACKED";
}

/**
 * Policy tập trung cho mọi recommendation surface.
 *
 * - Ưu tiên giữ thứ tự card production hiện có.
 * - Khi hai candidate thực sự cùng vị trí đầu vào, ưu tiên CURRENT > DAILY > LEGACY > FALLBACK.
 * - Dedupe Book trước, không cộng score và chỉ giữ evidence của candidate thắng.
 * - Rank nguồn chỉ dùng để ghi nhận chất lượng; position luôn được gán lại 1..N.
 */
export function normalizeRecommendationCandidates<T>(
  candidates: RecommendationCandidate<T>[],
  topK: number,
): RecommendationNormalizationResult<T> {
  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error("topK recommendation phải là số nguyên dương.");
  }

  let invalidCandidateCount = 0;
  const ordered = candidates
    .map((candidate, index) => ({
      ...candidate,
      bookId: candidate.bookId.trim(),
      _inputOrder: index,
      _productionOrder:
        Number.isInteger(candidate.productionOrder) && Number(candidate.productionOrder) >= 0
          ? Number(candidate.productionOrder)
          : index,
    }))
    .filter((candidate) => {
      const valid = Boolean(candidate.bookId) && Number.isFinite(candidate.score);
      if (!valid) invalidCandidateCount += 1;
      return valid;
    })
    .sort((left, right) => {
      const productionDelta = left._productionOrder - right._productionOrder;
      if (productionDelta !== 0) return productionDelta;

      const sourceDelta = SOURCE_PRIORITY[left.source] - SOURCE_PRIORITY[right.source];
      if (sourceDelta !== 0) return sourceDelta;

      const leftRank = validRank(left.rank) ? left.rank : Number.MAX_SAFE_INTEGER;
      const rightRank = validRank(right.rank) ? right.rank : Number.MAX_SAFE_INTEGER;
      const rankDelta = leftRank - rightRank;
      if (rankDelta !== 0) return rankDelta;

      const bookDelta = left.bookId.localeCompare(right.bookId);
      return bookDelta || left._inputOrder - right._inputOrder;
    });

  const uniqueBooks = new Set<string>();
  let duplicateBookCount = 0;
  const deduplicated = ordered.filter((candidate) => {
    if (uniqueBooks.has(candidate.bookId)) {
      duplicateBookCount += 1;
      return false;
    }
    uniqueBooks.add(candidate.bookId);
    return true;
  });

  const seenRanks = new Set<number>();
  let duplicateRankCount = 0;
  let invalidRankCount = 0;
  for (const candidate of deduplicated) {
    if (!validRank(candidate.rank)) {
      invalidRankCount += 1;
      continue;
    }
    if (seenRanks.has(candidate.rank)) duplicateRankCount += 1;
    seenRanks.add(candidate.rank);
  }

  const selected = deduplicated.slice(0, topK);
  const items = selected.map(({ _inputOrder, _productionOrder, ...candidate }, index) => ({
    ...candidate,
    originalRank: validRank(candidate.rank) ? candidate.rank : null,
    position: index + 1,
  }));
  const stats: RecommendationNormalizationStats = {
    inputCount: candidates.length,
    outputCount: items.length,
    duplicateBookCount,
    duplicateRankCount,
    invalidRankCount,
    invalidCandidateCount,
    truncatedCount: Math.max(0, deduplicated.length - selected.length),
  };

  return {
    items,
    reason: items.length === 0 ? "REQUEST_VALIDATION_FAILED" : successReason(stats),
    stats,
  };
}

export interface RecommendationEvidenceLike {
  type: string;
  label: string;
  sourceType?: string | null;
  sourceId?: string | null;
}

/** Giữ evidence đầu tiên theo đúng thứ tự nguồn và loại bản trùng nội dung. */
export function dedupeRecommendationEvidence<T extends RecommendationEvidenceLike>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [item.type, item.label.trim(), item.sourceType ?? "", item.sourceId ?? ""].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

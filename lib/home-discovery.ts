export interface HomeDiscoverySignal {
  bookId: string;
  actionType: string;
  createdAt: Date;
}

export interface HomeTrendingScore {
  bookId: string;
  score: number;
  signalCount: number;
}

const TRENDING_SIGNAL_WEIGHTS: Record<string, number> = {
  BOOK_VIEW: 1,
  READING_START: 2,
  READING_PROGRESS: 2,
  READING_COMPLETE: 5,
  BOOKMARK_ADD: 3,
  FAVORITE_ADD: 4,
  CART_ADD: 3,
  PURCHASE: 6,
  REVIEW_CREATE: 4,
};

function recencyMultiplier(createdAt: Date, now: Date): number {
  const ageInHours = Math.max(0, now.getTime() - createdAt.getTime()) / 3_600_000;

  if (ageInHours <= 24) return 1.5;
  if (ageInHours <= 72) return 1.2;
  return 1;
}

/**
 * Xếp hạng xu hướng dựa trên tín hiệu hành vi, không dùng Math.random để kết quả
 * ổn định và có thể giải thích khi demo.
 */
export function rankTrendingBooks(
  signals: HomeDiscoverySignal[],
  now = new Date(),
  limit = 10,
): HomeTrendingScore[] {
  const scores = new Map<string, HomeTrendingScore>();

  for (const signal of signals) {
    const bookId = signal.bookId.trim();
    const weight = TRENDING_SIGNAL_WEIGHTS[signal.actionType.trim().toUpperCase()];
    if (!bookId || !weight || Number.isNaN(signal.createdAt.getTime())) continue;

    const current = scores.get(bookId) ?? { bookId, score: 0, signalCount: 0 };
    current.score += weight * recencyMultiplier(signal.createdAt, now);
    current.signalCount += 1;
    scores.set(bookId, current);
  }

  return [...scores.values()]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.signalCount !== left.signalCount) return right.signalCount - left.signalCount;
      return left.bookId.localeCompare(right.bookId);
    })
    .slice(0, Math.max(0, limit));
}

/** Giữ lần xem mới nhất của mỗi sách theo đúng thứ tự lịch sử. */
export function uniqueRecentlyViewedBookIds(
  signals: HomeDiscoverySignal[],
  limit = 6,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const signal of signals) {
    const bookId = signal.bookId.trim();
    if (signal.actionType !== "BOOK_VIEW" || !bookId || seen.has(bookId)) continue;

    seen.add(bookId);
    result.push(bookId);
    if (result.length >= Math.max(0, limit)) break;
  }

  return result;
}

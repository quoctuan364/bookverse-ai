export interface DiversityCandidate {
  id: string;
  author: string;
  categoryId: string;
}

export interface RecommendationDiversityOptions {
  limit: number;
  maxPerCategory?: number;
  maxPerAuthor?: number;
}

/**
 * Giữ thứ tự relevance từ model nhưng ưu tiên phủ nhiều thể loại/tác giả.
 * Các ứng viên bị hoãn vẫn được dùng ở lượt hai để không làm thiếu kết quả.
 */
export function diversifyRecommendationCandidates<T extends DiversityCandidate>(
  candidates: T[],
  options: RecommendationDiversityOptions,
): T[] {
  const limit = Math.max(0, Math.floor(options.limit));
  if (limit === 0) return [];

  const maxPerCategory = Math.max(1, Math.floor(options.maxPerCategory ?? 2));
  const maxPerAuthor = Math.max(1, Math.floor(options.maxPerAuthor ?? 1));
  const selected: T[] = [];
  const deferred: T[] = [];
  const seenIds = new Set<string>();
  const categoryCounts = new Map<string, number>();
  const authorCounts = new Map<string, number>();

  for (const candidate of candidates) {
    if (!candidate.id || seenIds.has(candidate.id)) continue;
    seenIds.add(candidate.id);

    const categoryKey = candidate.categoryId.trim() || "__UNKNOWN_CATEGORY__";
    const authorKey = candidate.author.trim().toLocaleLowerCase("vi") || "__UNKNOWN_AUTHOR__";
    const categoryCount = categoryCounts.get(categoryKey) ?? 0;
    const authorCount = authorCounts.get(authorKey) ?? 0;

    if (categoryCount >= maxPerCategory || authorCount >= maxPerAuthor) {
      deferred.push(candidate);
      continue;
    }

    selected.push(candidate);
    categoryCounts.set(categoryKey, categoryCount + 1);
    authorCounts.set(authorKey, authorCount + 1);
    if (selected.length === limit) return selected;
  }

  // Nếu catalog chưa đủ đa dạng, bù theo relevance gốc thay vì trả thiếu sách.
  for (const candidate of deferred) {
    selected.push(candidate);
    if (selected.length === limit) break;
  }
  return selected;
}

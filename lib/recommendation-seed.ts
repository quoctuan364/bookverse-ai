/**
 * Tạo thứ tự ổn định theo một mã người dùng/phiên và mã sách.
 * Cùng một người sẽ thấy thứ tự nhất quán, nhưng hai người thường nhận thứ tự khác nhau.
 */
export function rankRecommendationBySeed(seed: string, bookId: string): number {
  const value = `${seed}:${bookId}`;
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function orderRecommendationsBySeed<T extends { id: string }>(
  items: T[],
  seed: string,
): T[] {
  return [...items].sort((left, right) => {
    const rankDifference =
      rankRecommendationBySeed(seed, left.id) -
      rankRecommendationBySeed(seed, right.id);

    return rankDifference || left.id.localeCompare(right.id);
  });
}

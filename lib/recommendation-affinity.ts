export interface RecommendationAffinitySignal {
  actionType: string;
  categoryName: string;
  canonicalName?: string | null;
}

export interface RecommendationPreferenceProfile {
  /** Nhãn thật dùng để lấy candidate từ database. */
  queryLabels: string[];
  /** Điểm 0..1, key đã được chuẩn hóa để rank nhanh và ổn định. */
  affinityByCategory: ReadonlyMap<string, number>;
}

const CATEGORY_FAMILIES = [
  [
    "Công nghệ",
    "Công nghệ thông tin",
    "Lập trình",
    "Trí tuệ nhân tạo",
    "Khoa học dữ liệu",
  ],
  [
    "Văn học",
    "Tiểu thuyết",
    "Văn học nước ngoài",
    "Văn học Việt Nam",
    "Trinh thám",
    "Kỳ ảo",
  ],
  ["Tâm lý", "Tâm lý học"],
  [
    "Kinh doanh",
    "Kinh tế",
    "Khởi nghiệp",
    "Kinh doanh và quản trị",
    "Quản trị",
    "Marketing",
    "Tài chính cá nhân",
  ],
] as const;

const ACTION_WEIGHTS: Readonly<Record<string, number>> = {
  BOOK_VIEW: 1,
  READING_START: 3,
  READING_PROGRESS: 4,
  READING_COMPLETE: 6,
  READING_HIGHLIGHT: 5,
  BOOKMARK_ADD: 6,
  FAVORITE_ADD: 7,
  CART_ADD: 5,
  PURCHASE: 8,
};

export function normalizeRecommendationCategory(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim()
    .toLowerCase();
}

function familyFor(label: string): readonly string[] | undefined {
  const normalized = normalizeRecommendationCategory(label);
  return CATEGORY_FAMILIES.find((family) =>
    family.some((item) => normalizeRecommendationCategory(item) === normalized),
  );
}

function expandLabel(label: string): readonly string[] {
  return familyFor(label) ?? [label];
}

/**
 * Kết hợp sở thích khai báo và hành vi thật. Hành vi mạnh như yêu thích,
 * bookmark hay mua hàng có điểm cao hơn một lượt xem đơn lẻ.
 */
export function buildRecommendationPreferenceProfile(
  declaredPreferences: readonly string[],
  signals: readonly RecommendationAffinitySignal[],
): RecommendationPreferenceProfile {
  const rawScores = new Map<string, number>();
  const labelsByNormalizedName = new Map<string, string>();

  const addScore = (label: string, score: number) => {
    for (const expandedLabel of expandLabel(label)) {
      const key = normalizeRecommendationCategory(expandedLabel);
      if (!key) continue;
      labelsByNormalizedName.set(key, expandedLabel);
      rawScores.set(key, Math.max(rawScores.get(key) ?? 0, score));
    }
  };

  for (const preference of declaredPreferences) {
    addScore(preference, 4);
  }

  for (const signal of signals) {
    const weight = ACTION_WEIGHTS[signal.actionType] ?? 0;
    if (weight <= 0) continue;

    // Category chính xác nhận toàn bộ trọng số; các category cùng họ nhận tín
    // hiệu lan truyền nhẹ hơn để còn đủ sách mới cho người dùng khám phá.
    const exactLabels = [signal.categoryName, signal.canonicalName].filter(
      (label): label is string => Boolean(label?.trim()),
    );
    for (const label of exactLabels) {
      const exactKey = normalizeRecommendationCategory(label);
      labelsByNormalizedName.set(exactKey, label);
      rawScores.set(exactKey, (rawScores.get(exactKey) ?? 0) + weight);

      for (const relatedLabel of expandLabel(label)) {
        const relatedKey = normalizeRecommendationCategory(relatedLabel);
        labelsByNormalizedName.set(relatedKey, relatedLabel);
        rawScores.set(relatedKey, Math.max(rawScores.get(relatedKey) ?? 0, weight * 0.65));
      }
    }
  }

  const maxScore = Math.max(0, ...rawScores.values());
  const affinityByCategory = new Map<string, number>();
  for (const [key, score] of rawScores) {
    affinityByCategory.set(key, maxScore > 0 ? Math.min(1, score / maxScore) : 0);
  }

  return {
    queryLabels: [...labelsByNormalizedName.values()],
    affinityByCategory,
  };
}


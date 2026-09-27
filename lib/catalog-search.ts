export interface CatalogSearchCandidate {
  id: string;
  title: string;
  originalTitle?: string;
  authorName: string;
  description?: string | null;
  categoryName?: string | null;
  publisher?: string | null;
  isbn?: string | null;
  price?: number | null;
  rating?: number | null;
  publishYear?: number | null;
}

export interface RankedCatalogSearch {
  id: string;
  score: number;
  matchedBy: "TITLE" | "AUTHOR" | "ISBN" | "CATEGORY" | "PUBLISHER" | "DESCRIPTION";
}

export type CatalogSearchSort =
  | "relevance"
  | "title"
  | "rating"
  | "price-low"
  | "price-high"
  | "newest";

const FIELD_WEIGHTS = {
  title: 100,
  authorName: 70,
  isbn: 65,
  categoryName: 45,
  publisher: 35,
  description: 15,
} as const;

type SearchField = keyof typeof FIELD_WEIGHTS;

/**
 * Chuẩn hóa tiếng Việt để "Đắc Nhân Tâm" vẫn khớp với "dac nhan tam".
 * Hàm thuần này không thay đổi dữ liệu lưu trong database.
 */
export function normalizeVietnameseSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function tokenMatches(queryToken: string, fieldToken: string): boolean {
  if (fieldToken.includes(queryToken)) return true;

  // Chỉ sửa lỗi gõ ở từ đủ dài để tránh các từ ngắn khớp quá rộng.
  const allowedDistance = queryToken.length >= 7 ? 2 : queryToken.length >= 4 ? 1 : 0;
  return allowedDistance > 0 && levenshteinDistance(queryToken, fieldToken) <= allowedDistance;
}

function scoreField(query: string, queryTokens: string[], value: string, weight: number): number {
  if (!value) return 0;
  const compactQuery = query.replace(/\s/g, "");
  const compactValue = value.replace(/\s/g, "");
  if (/^\d+$/.test(compactQuery) && compactValue === compactQuery) return weight + 50;
  if (value === query) return weight + 50;
  if (value.startsWith(query)) return weight + 30;
  if (value.includes(query)) return weight + 20;

  const fieldTokens = value.split(" ");
  const matchedTokens = queryTokens.filter((queryToken) =>
    fieldTokens.some((fieldToken) => tokenMatches(queryToken, fieldToken)),
  ).length;
  if (matchedTokens === 0) return 0;

  const coverage = matchedTokens / queryTokens.length;
  // Chỉ trả kết quả nhiều từ khi phần lớn ý định truy vấn đã khớp.
  if (queryTokens.length > 1 && coverage < 0.6) return 0;
  return Math.round(weight * coverage);
}

/**
 * Xếp hạng tìm kiếm tại tầng ứng dụng để hoạt động giống nhau trên PostgreSQL
 * local, Docker và database test mà không phụ thuộc extension `unaccent`.
 */
export function rankCatalogSearchCandidates(
  candidates: CatalogSearchCandidate[],
  rawQuery: string,
): RankedCatalogSearch[] {
  const query = normalizeVietnameseSearchText(rawQuery).slice(0, 120);
  if (!query) return [];
  const queryTokens = query.split(" ");

  return candidates
    .map((candidate) => {
      const normalizedFields: Record<SearchField, string> = {
        title: normalizeVietnameseSearchText(candidate.title),
        authorName: normalizeVietnameseSearchText(candidate.authorName),
        isbn: normalizeVietnameseSearchText(candidate.isbn ?? ""),
        categoryName: normalizeVietnameseSearchText(candidate.categoryName ?? ""),
        publisher: normalizeVietnameseSearchText(candidate.publisher ?? ""),
        description: normalizeVietnameseSearchText(candidate.description ?? ""),
      };
      const fieldScores = (Object.keys(FIELD_WEIGHTS) as SearchField[]).map((field) => ({
        field,
        score: Math.max(
          scoreField(query, queryTokens, normalizedFields[field], FIELD_WEIGHTS[field]),
          field === "title" && candidate.originalTitle
            ? scoreField(query, queryTokens, normalizeVietnameseSearchText(candidate.originalTitle), FIELD_WEIGHTS.title)
            : 0,
        ),
      }));
      fieldScores.sort((left, right) => right.score - left.score);
      const best = fieldScores[0];
      if (!best || best.score <= 0) return null;

      const matchedBy: RankedCatalogSearch["matchedBy"] =
        best.field === "authorName"
          ? "AUTHOR"
          : best.field === "categoryName"
            ? "CATEGORY"
            : best.field.toUpperCase() as RankedCatalogSearch["matchedBy"];
      return { id: candidate.id, score: best.score, matchedBy };
    })
    .filter((item): item is RankedCatalogSearch => item !== null)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

export function sortRankedCatalogSearch(
  ranked: RankedCatalogSearch[],
  candidates: CatalogSearchCandidate[],
  sort: CatalogSearchSort,
): RankedCatalogSearch[] {
  if (sort === "relevance") return ranked;
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const numberValue = (value: number | null | undefined): number =>
    typeof value === "number" && Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;

  return [...ranked].sort((left, right) => {
    const leftBook = byId.get(left.id);
    const rightBook = byId.get(right.id);
    let comparison = 0;

    switch (sort) {
      case "title":
        comparison = (leftBook?.title ?? "").localeCompare(rightBook?.title ?? "", "vi");
        break;
      case "rating":
        comparison = numberValue(rightBook?.rating) - numberValue(leftBook?.rating);
        break;
      case "price-low":
        comparison = numberValue(leftBook?.price) - numberValue(rightBook?.price);
        break;
      case "price-high":
        comparison = numberValue(rightBook?.price) - numberValue(leftBook?.price);
        break;
      case "newest":
        comparison = numberValue(rightBook?.publishYear) - numberValue(leftBook?.publishYear);
        break;
    }

    return comparison || right.score - left.score || left.id.localeCompare(right.id);
  });
}

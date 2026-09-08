import {
  getRecommendationEvidenceDisplay,
  type RecommendationEvidenceDisplay,
  type RecommendationEvidenceStatus,
} from "@/lib/recommendation-evidence-policy";

export type RecommendationEvidencePresentation = RecommendationEvidenceDisplay;

export function getRecommendationEvidencePresentation(
  recommendationEvidence?: string | null,
  status?: RecommendationEvidenceStatus,
): RecommendationEvidencePresentation {
  return getRecommendationEvidenceDisplay({ evidence: recommendationEvidence, status });
}

/** Nhãn demo chỉ hiển thị một lần ở cấp trang, không lặp trên từng BookCard. */
export function getBookCardMetadataBadge(label?: string | null): string | null {
  const cleanLabel = label?.trim();
  if (!cleanLabel || cleanLabel === "Dữ liệu demo") return null;
  return cleanLabel;
}

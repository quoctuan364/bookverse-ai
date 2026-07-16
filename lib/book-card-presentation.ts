export interface RecommendationEvidencePresentation {
  badgeLabel: "AI gợi ý" | "Sách trong danh mục";
  evidenceLabel: "Vì sao:" | "Trạng thái:";
  evidenceText: string;
  hasVerifiedEvidence: boolean;
}

export function getRecommendationEvidencePresentation(
  recommendationEvidence?: string | null,
): RecommendationEvidencePresentation {
  const evidence = recommendationEvidence?.trim();

  if (evidence) {
    return {
      badgeLabel: "AI gợi ý",
      evidenceLabel: "Vì sao:",
      evidenceText: evidence,
      hasVerifiedEvidence: true,
    };
  }

  return {
    badgeLabel: "Sách trong danh mục",
    evidenceLabel: "Trạng thái:",
    evidenceText: "Chưa có giải thích cá nhân hóa đã được xác minh.",
    hasVerifiedEvidence: false,
  };
}

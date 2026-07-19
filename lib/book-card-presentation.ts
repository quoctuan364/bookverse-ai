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

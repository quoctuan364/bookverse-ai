import { TAXONOMY_VERSION } from "@/lib/interaction-taxonomy";

export type RecommendationEvidenceStatus =
  | "VERIFIED_REAL_USER"
  | "SYNTHETIC_DATA"
  | "MISSING_PROVENANCE"
  | "INVALID_OWNER"
  | "POPULARITY_FALLBACK"
  | "CATEGORY_FALLBACK"
  | "TRENDING_FALLBACK"
  | "NEW_FALLBACK"
  | "QUALITY_FALLBACK"
  | "DISCOVERY_FALLBACK"
  | "DEGRADED_PROVIDER";

export interface RecommendationEvidenceProvenance {
  dataLabel: "REAL_USER_DATA";
  interactionId: string;
  userId: string;
  eventType: string;
  sourceBookId: string;
  sourceCategoryId: string | null;
  sourceAuthorName: string | null;
  occurredAt: string;
  taxonomyVersion: string;
  algorithmVersion: string;
}

export interface RecommendationEvidenceDisplay {
  badgeLabel:
    | "Gợi ý cho bạn"
    | "Sách mới"
    | "Đang được quan tâm"
    | "Được đánh giá tốt"
    | "Khám phá thêm"
    | "Theo danh mục"
    | "Theo sở thích"
    | "Sách khác";
  evidenceLabel: "Lý do:" | "Thông tin:";
  evidenceText: string;
  hasVerifiedEvidence: boolean;
  status: RecommendationEvidenceStatus;
}

export const RECOMMENDATION_ALGORITHM_VERSION = "fastapi_hybrid_v2";
export const RECOMMENDATION_TAXONOMY_VERSION = TAXONOMY_VERSION;

export function isVerifiedRealUserProvenance(
  value: unknown,
  expectedUserId?: string,
  expectedAlgorithmVersion = RECOMMENDATION_ALGORITHM_VERSION,
): value is RecommendationEvidenceProvenance {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RecommendationEvidenceProvenance>;
  return (
    candidate.dataLabel === "REAL_USER_DATA" &&
    typeof candidate.interactionId === "string" && candidate.interactionId.trim().length > 0 &&
    typeof candidate.userId === "string" && candidate.userId === expectedUserId &&
    typeof candidate.eventType === "string" && candidate.eventType.trim().length > 0 &&
    typeof candidate.sourceBookId === "string" && candidate.sourceBookId.trim().length > 0 &&
    (candidate.sourceCategoryId === null || typeof candidate.sourceCategoryId === "string") &&
    (candidate.sourceAuthorName === null || typeof candidate.sourceAuthorName === "string") &&
    typeof candidate.occurredAt === "string" && !Number.isNaN(Date.parse(candidate.occurredAt)) &&
    candidate.taxonomyVersion === RECOMMENDATION_TAXONOMY_VERSION &&
    candidate.algorithmVersion === expectedAlgorithmVersion
  );
}

export function getRecommendationEvidenceStatus(input: {
  evidence?: string | null;
  provenance?: unknown;
  expectedUserId?: string;
  fallback?: "POPULARITY_FALLBACK" | "CATEGORY_FALLBACK" | "DEGRADED_PROVIDER";
}): RecommendationEvidenceStatus {
  if (isVerifiedRealUserProvenance(input.provenance, input.expectedUserId)) return "VERIFIED_REAL_USER";
  if (input.fallback) return input.fallback;
  if (input.provenance && typeof input.provenance === "object" && (input.provenance as { dataLabel?: unknown }).dataLabel === "SYNTHETIC_DATA") return "SYNTHETIC_DATA";
  return input.evidence?.trim() ? "MISSING_PROVENANCE" : "POPULARITY_FALLBACK";
}

export function getRecommendationEvidenceDisplay(input: {
  evidence?: string | null;
  status?: RecommendationEvidenceStatus;
}): RecommendationEvidenceDisplay {
  const status = input.status ?? getRecommendationEvidenceStatus({ evidence: input.evidence });
  if (status === "VERIFIED_REAL_USER" && input.evidence?.trim()) {
    return { badgeLabel: "Gợi ý cho bạn", evidenceLabel: "Lý do:", evidenceText: input.evidence.trim(), hasVerifiedEvidence: true, status };
  }
  if (status === "POPULARITY_FALLBACK") {
    return {
      badgeLabel: "Sách mới",
      evidenceLabel: "Thông tin:",
      evidenceText: "Các sách mới được thêm vào BookVerse.",
      hasVerifiedEvidence: false,
      status,
    };
  }
  if (status === "CATEGORY_FALLBACK") {
    return {
      badgeLabel: "Theo sở thích",
      evidenceLabel: "Lý do:",
      evidenceText: input.evidence?.trim() || "Dựa trên thể loại bạn đã chọn.",
      hasVerifiedEvidence: false,
      status,
    };
  }
  if (status === "TRENDING_FALLBACK") {
    return {
      badgeLabel: "Đang được quan tâm",
      evidenceLabel: "Lý do:",
      evidenceText: input.evidence?.trim() || "Được nhiều độc giả quan tâm gần đây.",
      hasVerifiedEvidence: false,
      status,
    };
  }
  if (status === "NEW_FALLBACK") {
    return {
      badgeLabel: "Sách mới",
      evidenceLabel: "Thông tin:",
      evidenceText: input.evidence?.trim() || "Mới được cập nhật trên BookVerse.",
      hasVerifiedEvidence: false,
      status,
    };
  }
  if (status === "QUALITY_FALLBACK") {
    return {
      badgeLabel: "Được đánh giá tốt",
      evidenceLabel: "Lý do:",
      evidenceText: input.evidence?.trim() || "Nhận được đánh giá tốt từ độc giả.",
      hasVerifiedEvidence: false,
      status,
    };
  }
  if (status === "DISCOVERY_FALLBACK") {
    return {
      badgeLabel: "Khám phá thêm",
      evidenceLabel: "Thông tin:",
      evidenceText: input.evidence?.trim() || "Một lựa chọn khác trong kho sách BookVerse.",
      hasVerifiedEvidence: false,
      status,
    };
  }
  return { badgeLabel: "Sách khác", evidenceLabel: "Thông tin:", evidenceText: "Chưa có lý do gợi ý cho cuốn sách này.", hasVerifiedEvidence: false, status };
}

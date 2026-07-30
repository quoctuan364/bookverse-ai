import crypto from "node:crypto";

/**
 * Ngưỡng vận hành tối thiểu để chuyển sang bước đánh giá split.
 * Đây không phải power analysis và không tự động cho phép mở final_v2.
 */
export const OPERATIONAL_MINIMUM_DATA_READINESS_THRESHOLDS = {
  minimumConsentedUsers: 30,
  minimumUsersWithThreeEvents: 25,
  minimumUsersWithFiveEvents: 20,
  minimumUsersWithTenEvents: 10,
  minimumImpressions: 500,
  minimumOutcomeEvents: 50,
  minimumCollectionDays: 28,
} as const;

// Alias giữ tương thích cho artifact/config cũ; tên chuẩn nằm ở trên.
export const MODELING_READINESS_THRESHOLDS =
  OPERATIONAL_MINIMUM_DATA_READINESS_THRESHOLDS;

export interface RecommendationDataCounts {
  consentedUsers: number;
  exposedBooks: number;
  verifiedEvents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  usersWithThreeEvents: number;
  usersWithFiveEvents: number;
  usersWithTenEvents: number;
  collectionDays: number;
}

export interface RecommendationDataDecision {
  decision: "READY_FOR_FINAL_V2_ASSESSMENT" | "BLOCKED_BY_DATA";
  operationalMinimumMet: boolean;
  finalV2Eligible: boolean;
  statisticalPowerGuaranteed: false;
  failedChecks: string[];
}

export function assessRecommendationDataReadiness(
  counts: RecommendationDataCounts,
): RecommendationDataDecision {
  const checks: Array<[string, boolean]> = [
    [
      `consentedUsers>=${MODELING_READINESS_THRESHOLDS.minimumConsentedUsers}`,
      counts.consentedUsers >=
        MODELING_READINESS_THRESHOLDS.minimumConsentedUsers,
    ],
    [
      `usersWithThreeEvents>=${MODELING_READINESS_THRESHOLDS.minimumUsersWithThreeEvents}`,
      counts.usersWithThreeEvents >=
        MODELING_READINESS_THRESHOLDS.minimumUsersWithThreeEvents,
    ],
    [
      `usersWithFiveEvents>=${MODELING_READINESS_THRESHOLDS.minimumUsersWithFiveEvents}`,
      counts.usersWithFiveEvents >=
        MODELING_READINESS_THRESHOLDS.minimumUsersWithFiveEvents,
    ],
    [
      `usersWithTenEvents>=${MODELING_READINESS_THRESHOLDS.minimumUsersWithTenEvents}`,
      counts.usersWithTenEvents >=
        MODELING_READINESS_THRESHOLDS.minimumUsersWithTenEvents,
    ],
    [
      `impressions>=${MODELING_READINESS_THRESHOLDS.minimumImpressions}`,
      counts.impressions >= MODELING_READINESS_THRESHOLDS.minimumImpressions,
    ],
    [
      `outcomeEvents>=${MODELING_READINESS_THRESHOLDS.minimumOutcomeEvents}`,
      counts.clicks + counts.conversions >=
        MODELING_READINESS_THRESHOLDS.minimumOutcomeEvents,
    ],
    [
      `collectionDays>=${MODELING_READINESS_THRESHOLDS.minimumCollectionDays}`,
      counts.collectionDays >=
        MODELING_READINESS_THRESHOLDS.minimumCollectionDays,
    ],
  ];
  const failedChecks = checks
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  return {
    decision:
      failedChecks.length === 0
        ? "READY_FOR_FINAL_V2_ASSESSMENT"
        : "BLOCKED_BY_DATA",
    operationalMinimumMet: failedChecks.length === 0,
    // Chỉ locker có cutoff mới đánh giá được positive, cohort và exposure theo split.
    finalV2Eligible: false,
    statisticalPowerGuaranteed: false,
    failedChecks,
  };
}

export function pseudonymizeForExport(
  value: string,
  hmacKey: string,
  namespace: string,
): string {
  if (hmacKey.length < 32) {
    throw new Error("BOOKVERSE_EXPORT_HMAC_KEY phải có ít nhất 32 ký tự.");
  }
  const normalized = value.trim();
  if (!normalized) throw new Error("Không thể ẩn danh định danh rỗng.");
  return crypto
    .createHmac("sha256", hmacKey)
    .update(`${namespace}:${normalized}`)
    .digest("hex");
}

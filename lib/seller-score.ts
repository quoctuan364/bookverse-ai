export const SELLER_QUALITY_FORMULA_VERSION = "seller-quality-v1" as const;

export interface SellerQualityScoreInput {
  completedOrders: number;
  cancelledOrders: number;
  reportedListings: number;
  longDescriptionListings: number;
  approvedListings: number;
  totalListings: number;
}

export interface SellerQualityScoreResult {
  score: number;
  badge: "Chất lượng cao" | "Ổn định" | "Cần cải thiện" | "Rủi ro theo quy tắc";
  isHighQuality: boolean;
  formulaVersion: typeof SELLER_QUALITY_FORMULA_VERSION;
  facts: SellerQualityScoreInput;
  reasons: string[];
  suggestions: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function calculateSellerQualityScore(input: SellerQualityScoreInput): SellerQualityScoreResult {
  const facts: SellerQualityScoreInput = {
    completedOrders: normalizeCount(input.completedOrders),
    cancelledOrders: normalizeCount(input.cancelledOrders),
    reportedListings: normalizeCount(input.reportedListings),
    longDescriptionListings: normalizeCount(input.longDescriptionListings),
    approvedListings: normalizeCount(input.approvedListings),
    totalListings: normalizeCount(input.totalListings),
  };
  const completedBonus = Math.min(facts.completedOrders * 2, 20);
  const cancelledPenalty = Math.min(facts.cancelledOrders * 5, 20);
  const reportPenalty = Math.min(facts.reportedListings * 5, 20);
  const descriptionBonus =
    facts.totalListings > 0 && facts.longDescriptionListings / facts.totalListings >= 0.6 ? 5 : 0;
  const approvedBonus = facts.approvedListings >= 3 ? 5 : 0;
  const score = clamp(70 + completedBonus + descriptionBonus + approvedBonus - cancelledPenalty - reportPenalty, 0, 100);

  const reasons = [
    "Mốc khởi đầu 70 điểm.",
    `+${completedBonus} từ ${facts.completedOrders} đơn hoàn tất.`,
    `-${cancelledPenalty} từ ${facts.cancelledOrders} đơn đã hủy.`,
    `-${reportPenalty} từ ${facts.reportedListings} tin đăng bị báo cáo.`,
  ];

  if (descriptionBonus > 0) {
    reasons.push("+5 vì phần lớn listing có mô tả đủ rõ.");
  }

  if (approvedBonus > 0) {
    reasons.push("+5 vì có nhiều listing đã duyệt.");
  }

  const suggestions = [
    "Mô tả tình trạng sách rõ hơn.",
    "Thêm ảnh bìa hoặc ảnh tình trạng sách.",
    "Xử lý đơn đúng hạn.",
    "Giảm listing bị report.",
    "Hạn chế hủy đơn khi đã xác nhận.",
  ];

  let badge: SellerQualityScoreResult["badge"] = "Rủi ro theo quy tắc";
  if (score >= 80) {
    badge = "Chất lượng cao";
  } else if (score >= 60) {
    badge = "Ổn định";
  } else if (score >= 40) {
    badge = "Cần cải thiện";
  }

  return {
    score,
    badge,
    isHighQuality: score >= 80,
    formulaVersion: SELLER_QUALITY_FORMULA_VERSION,
    facts,
    reasons,
    suggestions,
  };
}

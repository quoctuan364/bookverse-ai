export interface SellerTrustScoreInput {
  completedOrders: number;
  cancelledOrders: number;
  reportedListings: number;
  longDescriptionListings: number;
  approvedListings: number;
  totalListings: number;
}

export interface SellerTrustScoreResult {
  score: number;
  badge: "Uy tín cao" | "Ổn định" | "Cần cải thiện" | "Rủi ro";
  reasons: string[];
  suggestions: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateSellerTrustScore(input: SellerTrustScoreInput): SellerTrustScoreResult {
  const completedBonus = Math.min(input.completedOrders * 2, 20);
  const cancelledPenalty = Math.min(input.cancelledOrders * 5, 20);
  const reportPenalty = Math.min(input.reportedListings * 5, 20);
  const descriptionBonus =
    input.totalListings > 0 && input.longDescriptionListings / input.totalListings >= 0.6 ? 5 : 0;
  const approvedBonus = input.approvedListings >= 3 ? 5 : 0;
  const score = clamp(70 + completedBonus + descriptionBonus + approvedBonus - cancelledPenalty - reportPenalty, 0, 100);

  const reasons = [
    `Base 70 điểm.`,
    `+${completedBonus} từ ${input.completedOrders} đơn completed.`,
    `-${cancelledPenalty} từ ${input.cancelledOrders} đơn cancelled.`,
    `-${reportPenalty} từ ${input.reportedListings} listing bị report.`,
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

  let badge: SellerTrustScoreResult["badge"] = "Rủi ro";
  if (score >= 80) {
    badge = "Uy tín cao";
  } else if (score >= 60) {
    badge = "Ổn định";
  } else if (score >= 40) {
    badge = "Cần cải thiện";
  }

  return {
    score,
    badge,
    reasons,
    suggestions,
  };
}

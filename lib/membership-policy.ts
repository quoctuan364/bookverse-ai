export interface MembershipPolicyInput {
  hasPurchasedEntitlement: boolean;
  subscriptionStatus: string | null;
  subscriptionStartsAt: Date | null;
  subscriptionEndsAt: Date | null;
  /**
   * Hai trường dưới được giữ để tương thích dữ liệu/checkpoint cũ.
   * Gói hội viên hiện mở toàn bộ kho đọc nên không còn phụ thuộc từng sách.
   */
  planIsActive: boolean;
  bookIsIncluded: boolean;
  now: Date;
}

export type MembershipAccessSource = "PURCHASE" | "MEMBERSHIP" | "NONE";

/** Hàm thuần để kiểm thử đầy đủ quy tắc quyền đọc mà không cần database. */
export function decideMembershipAccess(input: MembershipPolicyInput): MembershipAccessSource {
  if (input.hasPurchasedEntitlement) return "PURCHASE";
  // isActive chỉ biểu thị gói còn mở bán, không được tước quyền của kỳ đã trả tiền.
  // Sách mới được thêm vào kho cũng tự động thuộc quyền lợi của kỳ đang hoạt động.
  const active =
    input.subscriptionStatus === "ACTIVE" &&
    Boolean(input.subscriptionStartsAt && input.subscriptionStartsAt <= input.now) &&
    Boolean(input.subscriptionEndsAt && input.subscriptionEndsAt > input.now);
  return active ? "MEMBERSHIP" : "NONE";
}

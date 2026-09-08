const SUPPORT_ROUTE_LABELS: Record<string, string> = {
  "/assistant": "Mở Trợ lý AI",
  "/cart": "Mở giỏ hàng",
  "/catalog": "Mở danh mục",
  "/community": "Mở cộng đồng",
  "/community/new": "Tạo bài viết",
  "/discover": "Khám phá sách",
  "/forgot-password": "Khôi phục mật khẩu",
  "/help": "Mở trung tâm trợ giúp",
  "/library": "Mở thư viện của tôi",
  "/marketplace": "Mở chợ sách",
  "/membership": "Xem các gói hội viên",
  "/membership/benefits": "Xem quyền lợi hội viên",
  "/notifications": "Mở thông báo",
  "/orders": "Xem đơn hàng",
  "/privacy": "Xem chính sách riêng tư",
  "/profile": "Mở hồ sơ",
  "/profile/addresses": "Quản lý địa chỉ",
  "/profile/membership": "Quản lý hội viên",
  "/profile/settings": "Cập nhật hồ sơ",
  "/read": "Mở kho đọc",
  "/reading/goals": "Đặt mục tiêu đọc",
  "/reading/insights": "Xem thống kê đọc",
  "/seller": "Mở trung tâm người bán",
  "/seller/apply": "Đăng ký người bán",
};

export interface AssistantInternalLink {
  href: string;
  label: string;
}

/** Chỉ biến các route BookVerse đã duyệt thành liên kết có thể bấm. */
export function extractAssistantInternalLinks(content: string): AssistantInternalLink[] {
  const matches = content
    .split(/\s+/u)
    .map((value) => value.replace(/^[('"“]+/u, "").replace(/[)'"”.,;:!?]+$/u, ""))
    .filter((value) => /^\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*$/u.test(value));
  const uniqueRoutes = [...new Set(matches)];

  return uniqueRoutes.flatMap((href) => {
    const label = SUPPORT_ROUTE_LABELS[href];
    return label ? [{ href, label }] : [];
  });
}

export interface AiDiscoveryPrompt {
  id: string;
  label: string;
  description: string;
  query: string;
}

export const AI_DISCOVERY_PROMPTS: AiDiscoveryPrompt[] = [
  {
    id: "learn-ai",
    label: "Nhập môn trí tuệ nhân tạo",
    description: "Kiến thức cơ bản dành cho người mới.",
    query: "Tôi muốn học AI từ số 0, hãy gợi ý sách dễ tiếp cận cho người mới.",
  },
  {
    id: "vietnamese-relax",
    label: "Sách dễ đọc",
    description: "Sách tiếng Việt có nội dung gần gũi.",
    query: "Gợi ý cho tôi sách tiếng Việt nhẹ nhàng để đọc thư giãn cuối tuần.",
  },
  {
    id: "business-budget",
    label: "Kinh doanh dưới 200.000đ",
    description: "Nội dung thực tế, giá dưới 200.000đ.",
    query: "Tìm sách kinh doanh thực tế, dễ áp dụng và có giá dưới 200.000 đồng.",
  },
  {
    id: "mystery",
    label: "Truyện trinh thám",
    description: "Các vụ án và câu chuyện bất ngờ.",
    query: "Tôi muốn một cuốn trinh thám hoặc tiểu thuyết nhiều bất ngờ, khó đặt xuống.",
  },
  {
    id: "most-read",
    label: "Đọc nhiều nhất",
    description: "Nhiều người đang đọc.",
    query: "Những cuốn sách tiếng Việt nào đang được nhiều người đọc nhất?",
  },
  {
    id: "top-rated",
    label: "Được đánh giá cao",
    description: "Nhận nhiều đánh giá tốt từ người đọc.",
    query: "Những cuốn sách tiếng Việt nào đang được đánh giá cao nhất?",
  },
  {
    id: "best-selling",
    label: "Bán chạy",
    description: "Có nhiều đơn hàng đã hoàn tất.",
    query: "Những cuốn sách tiếng Việt nào đang bán chạy nhất trên BookVerse?",
  },
];

export function buildAssistantDiscoveryHref(query: string): string {
  const cleanQuery = query.replace(/\s+/gu, " ").trim();
  return cleanQuery ? `/assistant?q=${encodeURIComponent(cleanQuery)}` : "/assistant";
}

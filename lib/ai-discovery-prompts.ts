export interface AiDiscoveryPrompt {
  id: string;
  label: string;
  description: string;
  query: string;
}

export const AI_DISCOVERY_PROMPTS: AiDiscoveryPrompt[] = [
  {
    id: "learn-ai",
    label: "Học AI từ số 0",
    description: "Dễ tiếp cận, ưu tiên sách nền tảng.",
    query: "Tôi muốn học AI từ số 0, hãy gợi ý sách dễ tiếp cận cho người mới.",
  },
  {
    id: "vietnamese-relax",
    label: "Đọc nhẹ cuối tuần",
    description: "Sách tiếng Việt, nhịp đọc thư giãn.",
    query: "Gợi ý cho tôi sách tiếng Việt nhẹ nhàng để đọc thư giãn cuối tuần.",
  },
  {
    id: "business-budget",
    label: "Kinh doanh dưới 200K",
    description: "Thực tế và phù hợp ngân sách.",
    query: "Tìm sách kinh doanh thực tế, dễ áp dụng và có giá dưới 200.000 đồng.",
  },
  {
    id: "mystery",
    label: "Một cuốn thật cuốn",
    description: "Trinh thám hoặc câu chuyện nhiều bất ngờ.",
    query: "Tôi muốn một cuốn trinh thám hoặc tiểu thuyết nhiều bất ngờ, khó đặt xuống.",
  },
];

export function buildAssistantDiscoveryHref(query: string): string {
  const cleanQuery = query.replace(/\s+/gu, " ").trim();
  return cleanQuery ? `/assistant?q=${encodeURIComponent(cleanQuery)}` : "/assistant";
}

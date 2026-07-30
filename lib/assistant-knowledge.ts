export type BookVerseIntent =
  | "MEMBERSHIP"
  | "READING"
  | "ORDERS"
  | "MARKETPLACE"
  | "ACCOUNT"
  | "AI"
  | "POLICY"
  | "CATALOG"
  | "DISCOVERY"
  | "GENERAL";

export interface BookVerseKnowledgeArticle {
  id: string;
  intent: BookVerseIntent;
  title: string;
  summary: string;
  details: string[];
  href: string;
  keywords: string[];
}

export interface AssistantStoreContext {
  activeBooks: number;
  readableBooks: number;
  categories: number;
  activePlans: number;
  approvedListings: number;
}

export interface AssistantAccountContext {
  authenticated: boolean;
  displayName: string | null;
  role: string | null;
  membership: {
    active: boolean;
    planName: string | null;
    endsAt: Date | null;
  } | null;
  cartItemCount: number;
  orderCount: number;
  readingBooks: number;
  completedBooks: number;
}

export const ASSISTANT_STORE_QUICK_QUESTIONS = [
  {
    id: "membership",
    label: "Quyền lợi hội viên",
    query: "Gói hội viên mở được những gì và tôi có đang còn hạn không?",
  },
  {
    id: "orders",
    label: "Kiểm tra đơn hàng",
    query: "Tài khoản của tôi đang có bao nhiêu đơn và xem trạng thái ở đâu?",
  },
  {
    id: "reading",
    label: "Tiến độ đọc",
    query: "Tôi đã đọc bao nhiêu sách và có thể xem lịch đọc ở đâu?",
  },
  {
    id: "marketplace",
    label: "Bán sách cũ",
    query: "Làm sao để đăng bán sách cũ trên BookVerse?",
  },
  {
    id: "payment-sandbox",
    label: "Thanh toán Sandbox",
    query: "Thanh toán hội viên Sandbox hoạt động thế nào và có trừ tiền thật không?",
  },
  {
    id: "catalog-status",
    label: "Quy mô kho sách",
    query: "Hiện BookVerse có bao nhiêu sách đọc được và bao nhiêu gói hội viên?",
  },
] as const;

export const BOOKVERSE_KNOWLEDGE_BASE: BookVerseKnowledgeArticle[] = [
  {
    id: "membership-access",
    intent: "MEMBERSHIP",
    title: "Hội viên và quyền đọc Ebook",
    summary:
      "Người chưa có quyền chỉ nhận phần đọc thử. Một gói hội viên ACTIVE còn hạn mở toàn bộ kho Ebook đang hoạt động.",
    details: [
      "Sách mới được thêm vào kho cũng tự động mở cho hội viên còn hạn.",
      "Quyền Ebook đã mua riêng vẫn được giữ, kể cả khi hội viên hết hạn.",
      "Thanh toán hội viên hỗ trợ ví và chuyển khoản Sandbox, không phải giao dịch tiền thật.",
    ],
    href: "/membership/benefits",
    keywords: ["hoi vien", "goi", "subscription", "doc full", "mo khoa", "gia han", "het han"],
  },
  {
    id: "membership-payment-sandbox",
    intent: "MEMBERSHIP",
    title: "Quy trình thanh toán hội viên Sandbox",
    summary:
      "Checkout hội viên tạo giao dịch PENDING trước, sau đó cổng Sandbox mô phỏng phản hồi thành công hoặc thất bại và chỉ kích hoạt gói khi thanh toán thành công.",
    details: [
      "Mỗi yêu cầu có mã UUID và transactionRef duy nhất để chống gửi trùng.",
      "Nhánh thành công ghi PAID_DEMO, tạo kỳ hội viên và thông báo cho tài khoản.",
      "Nhánh thất bại ghi FAILED, không tạo quyền đọc và cho phép người dùng tạo giao dịch mới.",
    ],
    href: "/membership",
    keywords: [
      "thanh toan hoi vien",
      "thanh toan sandbox",
      "giao dich sandbox",
      "vi sandbox",
      "chuyen khoan sandbox",
      "paid demo",
      "pending",
      "that bai",
    ],
  },
  {
    id: "reading-tools",
    intent: "READING",
    title: "Công cụ đọc và theo dõi tiến độ",
    summary:
      "Trình đọc hỗ trợ lưu trang/chương, bookmark, highlight và tiếp tục từ vị trí gần nhất.",
    details: [
      "Lịch đọc tổng hợp phiên đọc theo ngày.",
      "Trang Insights hiển thị thời gian, streak, sách bắt đầu và hoàn thành.",
      "Mục tiêu cá nhân theo dõi phút đọc mỗi tuần và số sách trong năm.",
    ],
    href: "/reading/insights",
    keywords: ["doc sach", "bookmark", "highlight", "tien do", "lich doc", "muc tieu", "streak"],
  },
  {
    id: "orders-checkout",
    intent: "ORDERS",
    title: "Giỏ hàng, đơn hàng và thanh toán",
    summary:
      "Người mua có thể thêm listing còn hàng vào giỏ, tạo đơn và theo dõi trạng thái trong trang Đơn hàng.",
    details: [
      "Trạng thái đơn gồm chờ xử lý, đã thanh toán, đang giao, hoàn tất, hủy hoặc hoàn tiền.",
      "Mỗi người chỉ được xem đơn hàng thuộc tài khoản của mình.",
      "Thanh toán demo được ghi nhãn rõ và không đại diện giao dịch ngân hàng thật.",
    ],
    href: "/orders",
    keywords: ["gio hang", "don hang", "thanh toan", "giao hang", "huy don", "mua sach"],
  },
  {
    id: "marketplace",
    intent: "MARKETPLACE",
    title: "Chợ sách cũ và người bán",
    summary:
      "Chợ sách chỉ hiển thị tin đã duyệt và còn hàng; tồn kho được kiểm tra khi đặt mua.",
    details: [
      "Người dùng có thể đăng ký trở thành người bán.",
      "Người bán quản lý tin, đơn nhận được và doanh thu trong khu vực Seller.",
      "Chất lượng người bán được tính theo dữ liệu đơn và báo cáo hiện có.",
    ],
    href: "/marketplace",
    keywords: ["cho sach", "sach cu", "nguoi ban", "seller", "dang ban", "tin ban", "ton kho"],
  },
  {
    id: "account-library",
    intent: "ACCOUNT",
    title: "Tài khoản và thư viện cá nhân",
    summary:
      "Thư viện cá nhân tập hợp sách đang đọc, đã mua, yêu thích, bookmark và highlight của tài khoản.",
    details: [
      "Người dùng có thể cập nhật hồ sơ, mục tiêu đọc và bảo mật tài khoản.",
      "Dữ liệu cá nhân chỉ được truy xuất sau khi đăng nhập.",
      "Tài khoản bị khóa không được tiếp tục sử dụng các luồng được bảo vệ.",
    ],
    href: "/library",
    keywords: ["tai khoan", "thu vien", "cua toi", "yeu thich", "ho so", "mat khau", "bao mat"],
  },
  {
    id: "account-security",
    intent: "ACCOUNT",
    title: "Đăng nhập và khôi phục tài khoản",
    summary:
      "BookVerse hỗ trợ đăng nhập email/mật khẩu, Google OAuth khi được cấu hình và luồng yêu cầu đặt lại mật khẩu an toàn.",
    details: [
      "Sau đăng nhập, callback nội bộ đưa người dùng về đúng trang đã yêu cầu.",
      "Link đặt lại mật khẩu không được trả trực tiếp ra giao diện production.",
      "Google chỉ được liên kết khi nhà cung cấp xác nhận email đã xác minh.",
    ],
    href: "/forgot-password",
    keywords: [
      "quen mat khau",
      "khoi phuc tai khoan",
      "google login",
      "dang nhap google",
      "reset password",
    ],
  },
  {
    id: "ai-transparency",
    intent: "AI",
    title: "AI, gợi ý và tính minh bạch",
    summary:
      "Trợ lý chỉ nhắc tới sách đã được truy xuất từ catalog và luôn có fallback nội bộ khi provider ngoài không sẵn sàng.",
    details: [
      "Vector RAG được ưu tiên khi embedding hoạt động; keyword RAG là phương án dự phòng.",
      "Mock bị vô hiệu trong production và luôn được gắn nhãn ở môi trường phát triển.",
      "Gợi ý cá nhân hóa chỉ được tuyên bố khi có provenance dữ liệu người dùng thật đã xác minh.",
    ],
    href: "/assistant",
    keywords: ["chatbot", "tro ly ai", "ca nhan hoa", "rag", "provider ai", "du lieu ai"],
  },
  {
    id: "book-recommendations",
    intent: "DISCOVERY",
    title: "Cách nhận gợi ý sách phù hợp",
    summary:
      "Hãy nêu chủ đề, trình độ, ngôn ngữ, độ dài hoặc mục tiêu đọc để trợ lý tìm sách trong catalog BookVerse.",
    details: [
      "Kết quả chỉ chứa sách có ID và đường dẫn tồn tại trong database.",
      "Nếu không có sách khớp, trợ lý sẽ yêu cầu làm rõ thay vì bịa hoặc trả sách ngẫu nhiên.",
      "Bạn có thể mở trang Khám phá để lọc thêm theo tâm trạng và metadata.",
    ],
    href: "/discover",
    keywords: ["goi y sach", "tim sach", "sach nao", "nen doc", "muon doc"],
  },
  {
    id: "policies",
    intent: "POLICY",
    title: "Chính sách và hỗ trợ",
    summary:
      "BookVerse có trang trợ giúp, điều khoản, quyền riêng tư, hoàn tiền và bản quyền riêng biệt.",
    details: [
      "Nội dung và giá demo được ghi nhãn để không gây hiểu nhầm.",
      "Yêu cầu hoàn tiền cần đối chiếu trạng thái đơn và chính sách hiện hành.",
      "Vấn đề bản quyền cần được gửi qua kênh hỗ trợ với thông tin tác phẩm cụ thể.",
    ],
    href: "/help",
    keywords: ["chinh sach", "hoan tien", "bao mat", "rieng tu", "ban quyen", "tro giup", "dieu khoan"],
  },
  {
    id: "catalog-discovery",
    intent: "CATALOG",
    title: "Catalog và khám phá sách",
    summary:
      "Catalog hỗ trợ tìm theo tên, tác giả và chủ đề; trang Khám phá lọc theo tâm trạng, độ dài, ngôn ngữ, năm và thể loại.",
    details: [
      "Kho đọc chỉ hiển thị sách đang hoạt động và chưa bị xóa.",
      "Chất lượng bìa và metadata được kiểm tra theo chính sách riêng.",
      "Trợ lý có thể gợi ý sách nhưng không được tự tạo mã sách, giá hoặc đường dẫn.",
    ],
    href: "/discover",
    keywords: ["catalog", "danh muc", "tim sach", "the loai", "ngon ngu", "xuat ban", "kham pha"],
  },
];

export function normalizeAssistantQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const intentSignals: Record<BookVerseIntent, string[]> = {
  MEMBERSHIP: [
    "hoi vien",
    "goi",
    "subscription",
    "doc full",
    "mo khoa",
    "gia han",
    "het han",
    "thanh toan hoi vien",
    "thanh toan sandbox",
    "giao dich sandbox",
    "vi sandbox",
  ],
  READING: [
    "bookmark",
    "highlight",
    "tien do",
    "lich doc",
    "muc tieu",
    "streak",
    "doc tiep",
    "da doc",
    "doc bao nhieu",
    "hoan thanh",
    "lich su doc",
  ],
  ORDERS: ["gio hang", "don hang", "thanh toan", "giao hang", "huy don", "hoan don"],
  MARKETPLACE: ["cho sach", "sach cu", "nguoi ban", "seller", "dang ban", "tin ban"],
  ACCOUNT: [
    "tai khoan",
    "thu vien cua toi",
    "ho so",
    "mat khau",
    "dang nhap",
    "yeu thich",
    "google login",
    "quen mat khau",
  ],
  AI: ["chatbot", "tro ly ai", "ca nhan hoa", "rag", "goi y ai"],
  POLICY: ["chinh sach", "hoan tien", "rieng tu", "ban quyen", "dieu khoan", "tro giup"],
  CATALOG: ["catalog", "danh muc", "bao nhieu sach", "kho sach", "the loai"],
  DISCOVERY: ["goi y sach", "tim sach", "sach nao", "nen doc", "muon doc", "tac gia"],
  GENERAL: [],
};

export function classifyBookVerseIntent(query: string): BookVerseIntent {
  const normalized = normalizeAssistantQuery(query);
  let best: { intent: BookVerseIntent; score: number } = { intent: "GENERAL", score: 0 };

  for (const [intent, signals] of Object.entries(intentSignals) as Array<
    [BookVerseIntent, string[]]
  >) {
    const score = signals.reduce(
      (total, signal) => total + (normalized.includes(signal) ? signal.split(" ").length : 0),
      0,
    );
    if (score > best.score) best = { intent, score };
  }

  return best.intent;
}

export function retrieveBookVerseKnowledge(
  query: string,
  limit = 3,
): BookVerseKnowledgeArticle[] {
  const normalized = normalizeAssistantQuery(query);
  const intent = classifyBookVerseIntent(query);

  return BOOKVERSE_KNOWLEDGE_BASE.map((article) => {
    const intentScore = article.intent === intent ? 8 : 0;
    const keywordScore = article.keywords.reduce(
      (score, keyword) => score + (normalized.includes(keyword) ? 3 : 0),
      0,
    );
    const titleScore = normalizeAssistantQuery(article.title)
      .split(" ")
      .filter((term) => term.length >= 4 && normalized.includes(term)).length;
    return { article, score: intentScore + keywordScore + titleScore };
  })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.article.id.localeCompare(right.article.id))
    .slice(0, Math.max(0, limit))
    .map((item) => item.article);
}

export function shouldRetrieveBooks(query: string, intent: BookVerseIntent): boolean {
  if (intent === "DISCOVERY") return true;
  const normalized = normalizeAssistantQuery(query);
  if (
    intent === "CATALOG" &&
    ["bao nhieu", "so luong", "co may"].some((signal) => normalized.includes(signal))
  ) {
    return false;
  }
  return [
    "sach nao",
    "goi y sach",
    "tim sach",
    "tac gia",
    "the loai",
    "cuon sach",
  ].some((signal) => normalized.includes(signal));
}

export function queryWantsAccountData(query: string): boolean {
  const normalized = normalizeAssistantQuery(query);
  return [
    "cua toi",
    "tai khoan toi",
    "toi co",
    "toi da",
    "don cua toi",
    "gio cua toi",
    "con han khong",
    "trang thai cua minh",
    "cua minh",
  ].some((signal) => normalized.includes(signal));
}

export function formatStoreFacts(context: AssistantStoreContext): string {
  return [
    `${context.activeBooks} sách đang hoạt động`,
    `${context.readableBooks} sách có nội dung đọc`,
    `${context.categories} thể loại`,
    `${context.activePlans} gói hội viên đang mở bán`,
    `${context.approvedListings} tin bán đã duyệt còn hàng`,
  ].join(", ");
}

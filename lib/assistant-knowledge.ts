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
  | "COMMUNITY"
  | "ADMIN"
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
    id: "account",
    label: "Hồ sơ & avatar",
    query: "Làm sao cập nhật hồ sơ, tải ảnh đại diện và chọn thể loại yêu thích?",
  },
  {
    id: "catalog-status",
    label: "Quy mô kho sách",
    query: "Hiện BookVerse có bao nhiêu sách đọc được và bao nhiêu gói hội viên?",
  },
  {
    id: "find-book",
    label: "Tìm sách phù hợp",
    query: "Gợi ý cho tôi một cuốn sách phù hợp và giải thích lý do.",
  },
  {
    id: "seller",
    label: "Quản lý bán sách",
    query: "Người bán quản lý tin đăng, đơn nhận được và doanh thu ở đâu?",
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
      "BookVerse hỗ trợ đăng nhập bằng email/mật khẩu và luồng yêu cầu đặt lại mật khẩu an toàn.",
    details: [
      "Sau đăng nhập, callback nội bộ đưa người dùng về đúng trang đã yêu cầu.",
      "Link đặt lại mật khẩu không được trả trực tiếp ra giao diện production.",
      "Mật khẩu được kiểm tra an toàn và tài khoản bị khóa sẽ bị từ chối đăng nhập.",
    ],
    href: "/forgot-password",
    keywords: [
      "quen mat khau",
      "khoi phuc tai khoan",
      "reset password",
    ],
  },
  {
    id: "account-profile-preferences",
    intent: "ACCOUNT",
    title: "Hồ sơ, ảnh đại diện và sở thích đọc",
    summary:
      "Người dùng có thể cập nhật tên, tiểu sử, tải ảnh đại diện từ thiết bị và chọn thể loại yêu thích để BookVerse hiểu nhu cầu đọc tốt hơn.",
    details: [
      "Ảnh đại diện nhận JPEG, PNG hoặc WebP tối đa 2 MB; hệ thống kiểm tra chữ ký tệp thay vì tin phần mở rộng.",
      "Thể loại yêu thích có thể chọn khi onboarding và chỉnh lại trong Cấu hình sở thích đọc.",
      "Mật khẩu và địa chỉ giao hàng được quản lý ở các trang riêng để biểu mẫu hồ sơ luôn gọn và rõ.",
    ],
    href: "/profile/settings",
    keywords: [
      "anh dai dien",
      "avatar",
      "tai anh len",
      "cap nhat ho so",
      "thong tin ca nhan",
      "the loai yeu thich",
      "so thich doc",
      "onboarding",
    ],
  },
  {
    id: "account-addresses",
    intent: "ACCOUNT",
    title: "Địa chỉ giao hàng",
    summary:
      "Địa chỉ nhận sách được thêm, sửa, đặt mặc định hoặc xóa trong khu vực Địa chỉ của hồ sơ.",
    details: [
      "Khi checkout, người mua chọn một địa chỉ đã lưu trước khi tạo đơn.",
      "Mỗi người chỉ truy cập được địa chỉ thuộc tài khoản của mình.",
      "Địa chỉ mặc định giúp giảm thao tác trong những lần mua tiếp theo.",
    ],
    href: "/profile/addresses",
    keywords: [
      "dia chi",
      "dia chi giao hang",
      "dia chi mac dinh",
      "noi nhan sach",
      "them dia chi",
      "sua dia chi",
    ],
  },
  {
    id: "catalog-search-filters",
    intent: "CATALOG",
    title: "Tìm kiếm, lọc và sắp xếp catalog",
    summary:
      "Trang Danh mục hỗ trợ tìm sách theo tên, tác giả, chủ đề hoặc ISBN và lọc theo thể loại, ngôn ngữ, năm xuất bản.",
    details: [
      "Tìm kiếm tiếng Việt không dấu vẫn khớp tiêu đề có dấu và chịu được một số lỗi gõ ở từ đủ dài.",
      "Có thể sắp xếp theo độ liên quan, giá, rating nguồn hoặc năm xuất bản.",
      "Catalog công khai chỉ hiển thị sách thật đã qua quality gate và có bìa local hợp lệ.",
    ],
    href: "/catalog",
    keywords: [
      "tim kiem",
      "bo loc",
      "sap xep",
      "tim khong dau",
      "isbn",
      "loc ngon ngu",
      "loc nam xuat ban",
      "rating nguon",
    ],
  },
  {
    id: "favorites-and-cart",
    intent: "ORDERS",
    title: "Yêu thích và giỏ hàng",
    summary:
      "Nút yêu thích lưu sách vào thư viện cá nhân; nút thêm giỏ chỉ dùng listing đã duyệt và còn tồn kho.",
    details: [
      "Sách yêu thích nằm trong Thư viện của tôi để mở lại nhanh.",
      "Giỏ hàng hiển thị số lượng, giá BookVerse, địa chỉ nhận và các vấn đề cần xử lý trước checkout.",
      "Hệ thống kiểm tra tồn kho lần nữa khi tạo đơn để tránh mua vượt số lượng còn lại.",
    ],
    href: "/cart",
    keywords: [
      "them gio",
      "gio hang",
      "yeu thich",
      "luu sach",
      "bo khoi gio",
      "xoa khoi gio",
      "mua sach",
    ],
  },
  {
    id: "orders-shipping-refund",
    intent: "ORDERS",
    title: "Theo dõi đơn, hủy và hoàn tiền",
    summary:
      "Trang Đơn hàng hiển thị từng đơn của tài khoản, sản phẩm, người bán, địa chỉ và trạng thái xử lý hiện tại.",
    details: [
      "Quyền chuyển trạng thái phụ thuộc vai trò người mua, người bán và quản trị viên.",
      "Đơn hủy hợp lệ hoàn tồn kho theo state machine; đơn hoàn tiền được ghi trạng thái riêng.",
      "Điều kiện và quy trình yêu cầu hoàn tiền được trình bày tại trang Chính sách hoàn tiền.",
    ],
    href: "/orders",
    keywords: [
      "don cua toi",
      "don dang giao",
      "theo doi don",
      "huy don",
      "hoan tien",
      "refund",
      "trang thai don",
    ],
  },
  {
    id: "reading-goals-calendar",
    intent: "READING",
    title: "Mục tiêu, lịch đọc và chuỗi ngày đọc",
    summary:
      "BookVerse cho đặt mục tiêu phút đọc mỗi tuần và số sách mỗi năm, đồng thời tổng hợp lịch, heatmap và streak từ phiên đọc thật.",
    details: [
      "Mục tiêu được chỉnh tại trang Mục tiêu đọc và phản ánh trong dashboard cá nhân.",
      "Lịch đọc gộp nhiều phiên trong cùng ngày và phân mức theo tỷ lệ hoàn thành mục tiêu.",
      "Streak vẫn được giữ nếu hôm nay chưa đọc nhưng chuỗi liên tục đến ngày hôm qua.",
    ],
    href: "/reading/goals",
    keywords: [
      "muc tieu doc",
      "dat muc tieu",
      "lich doc",
      "heatmap",
      "streak",
      "chuoi ngay doc",
      "phut moi tuan",
      "sach moi nam",
    ],
  },
  {
    id: "notifications-center",
    intent: "ACCOUNT",
    title: "Trung tâm thông báo",
    summary:
      "Trang Thông báo tập hợp cập nhật về đơn hàng, hội viên, hoạt động cộng đồng và các sự kiện liên quan đến tài khoản.",
    details: [
      "Số chưa đọc xuất hiện trên thanh điều hướng sau khi đăng nhập.",
      "Người dùng có thể mở thông báo để tới đúng khu vực cần xử lý.",
      "Thông báo chỉ hiển thị cho chủ tài khoản và không công khai dữ liệu riêng tư.",
    ],
    href: "/notifications",
    keywords: [
      "thong bao",
      "chuong thong bao",
      "chua doc",
      "cap nhat don hang",
      "notification",
    ],
  },
  {
    id: "membership-management",
    intent: "MEMBERSHIP",
    title: "Quản lý hội viên và lịch sử thanh toán",
    summary:
      "Khu Hội viên trong hồ sơ cho biết gói hiện tại, thời hạn và lịch sử giao dịch Sandbox của tài khoản.",
    details: [
      "Chỉ giao dịch Sandbox thành công mới kích hoạt hoặc gia hạn quyền đọc.",
      "Lịch sử thanh toán tách riêng trạng thái PENDING, PAID_DEMO, FAILED và REFUNDED.",
      "Khi hết hạn, quyền mua Ebook riêng vẫn còn nhưng quyền đọc toàn kho sẽ đóng.",
    ],
    href: "/profile/membership",
    keywords: [
      "quan ly hoi vien",
      "goi hien tai",
      "lich su thanh toan",
      "hoa don hoi vien",
      "ngay het han",
      "gia han goi",
    ],
  },
  {
    id: "seller-registration-listing",
    intent: "MARKETPLACE",
    title: "Đăng ký người bán và tạo tin",
    summary:
      "Người dùng bắt đầu tại trang Đăng ký bán hàng; sau khi có quyền Seller có thể tạo tin cho sách thật trong catalog.",
    details: [
      "Tin đăng cần tiêu đề, mô tả, tình trạng, giá, tồn kho và sách liên kết.",
      "Tin mới không xuất hiện công khai cho đến khi được duyệt.",
      "Seller chỉ được sửa tin và xử lý đơn thuộc gian hàng của mình.",
    ],
    href: "/seller/apply",
    keywords: [
      "dang ky nguoi ban",
      "tro thanh seller",
      "tao tin dang",
      "dang sach ban",
      "ban sach nhu the nao",
      "kiem duyet tin",
    ],
  },
  {
    id: "community-create-post",
    intent: "COMMUNITY",
    title: "Tạo bài viết và thảo luận cộng đồng",
    summary:
      "Người dùng đã đăng nhập có thể tạo bài chia sẻ cảm nhận, liên kết sách và tham gia thảo luận tại Cộng đồng.",
    details: [
      "Bài viết cần tiêu đề và nội dung rõ ràng; sách liên kết phải tồn tại trong catalog.",
      "Các hoạt động liên quan có thể tạo thông báo cho đúng tài khoản.",
      "Nội dung cộng đồng không được dùng làm bằng chứng nghiên cứu AI nếu chưa có provenance phù hợp.",
    ],
    href: "/community/new",
    keywords: [
      "tao bai viet",
      "dang bai",
      "viet cam nhan",
      "chia se sach",
      "binh luan bai viet",
      "thao luan cong dong",
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
  {
    id: "reader-ai-grounding",
    intent: "READING",
    title: "Trợ lý AI có trích dẫn trong trang đọc",
    summary:
      "Trợ lý Reader chỉ trả lời từ những đoạn nội dung mà tài khoản đang được phép đọc và gắn trích dẫn chương, trang tương ứng.",
    details: [
      "Người đọc thử chỉ có thể hỏi trong phần nội dung đang mở; hội viên hoặc người đã mua được truy xuất toàn bộ sách.",
      "Nếu không tìm thấy bằng chứng liên quan, trợ lý nói chưa đủ dữ liệu thay vì tự bịa câu trả lời.",
      "Câu trả lời từ provider ngoài vẫn phải qua hậu kiểm trích dẫn; sai nguồn sẽ bị thay bằng bản trả lời nội bộ có căn cứ.",
    ],
    href: "/read",
    keywords: [
      "ai trong reader",
      "tro ly doc sach",
      "hoi noi dung sach",
      "trich dan",
      "citation",
      "nguon tra loi",
    ],
  },
  {
    id: "reading-notes-export",
    intent: "READING",
    title: "Bookmark, highlight và ghi chú",
    summary:
      "Reader cho phép đánh dấu trang, bôi đen nội dung, chọn màu, thêm ghi chú và xuất lại dữ liệu đọc đã lưu.",
    details: [
      "Highlight gắn với đúng sách, trang và tài khoản đang đăng nhập.",
      "Bookmark giúp quay lại nhanh; tiến độ tự động lưu vị trí gần nhất.",
      "Lịch đọc, heatmap, streak và mục tiêu được tổng hợp từ phiên đọc có thật.",
    ],
    href: "/library",
    keywords: [
      "xuat ghi chu",
      "ghi chu",
      "bookmark",
      "highlight",
      "boi den",
      "mau highlight",
      "heatmap",
    ],
  },
  {
    id: "reading-original-content",
    intent: "READING",
    title: "Nội dung đọc nguyên bản BookVerse",
    summary:
      "Các bản đọc minh họa được BookVerse biên soạn nguyên bản theo chủ đề và metadata để demo Reader, không mạo nhận là nguyên tác hoặc bản dịch chính thức.",
    details: [
      "Nội dung có cấu trúc chương, trang, ví dụ, bài tập và câu hỏi suy ngẫm.",
      "Ảnh bìa, metadata catalog và nội dung đọc là các lớp dữ liệu tách biệt.",
      "Nhãn nguồn được hiển thị trong Reader để người dùng biết đang đọc nội dung BookVerse.",
    ],
    href: "/read",
    keywords: [
      "noi dung sach",
      "noi dung nguyen ban",
      "ban dich",
      "nguyen tac",
      "sach demo",
      "noi dung minh hoa",
    ],
  },
  {
    id: "seller-operations",
    intent: "MARKETPLACE",
    title: "Trung tâm vận hành người bán",
    summary:
      "Người bán quản lý hồ sơ, tin đăng, tồn kho, đơn nhận được và doanh thu trong khu vực Seller riêng.",
    details: [
      "Tin mới phải qua trạng thái kiểm duyệt trước khi xuất hiện công khai.",
      "Tồn kho được trừ an toàn khi checkout và hoàn lại theo quy tắc hủy đơn.",
      "Điểm chất lượng người bán được tính từ đơn hoàn tất, đơn hủy và báo cáo hiện có.",
    ],
    href: "/seller",
    keywords: [
      "trung tam nguoi ban",
      "quan ly tin dang",
      "don nhan duoc",
      "doanh thu nguoi ban",
      "ton kho",
      "seller dashboard",
    ],
  },
  {
    id: "community-features",
    intent: "COMMUNITY",
    title: "Cộng đồng đọc sách",
    summary:
      "Khu Cộng đồng cho phép chia sẻ cảm nhận, thảo luận theo bài viết và mở lại sách được nhắc đến.",
    details: [
      "Nội dung cộng đồng gắn với tài khoản và tuân theo trạng thái kiểm duyệt của hệ thống.",
      "Thông báo giúp theo dõi hoạt động liên quan mà không công khai dữ liệu riêng tư.",
      "Đánh giá cảm nhận của người dùng không được trình bày như bằng chứng hiệu quả mô hình AI.",
    ],
    href: "/community",
    keywords: [
      "cong dong",
      "bai viet",
      "chia se cam nhan",
      "binh luan",
      "thao luan",
      "thong bao",
    ],
  },
  {
    id: "recommendation-evidence",
    intent: "AI",
    title: "Bằng chứng và giới hạn của hệ gợi ý",
    summary:
      "BookVerse tách rõ khả năng triển khai recommender với bằng chứng hiệu quả: chỉ tuyên bố cá nhân hóa khi dữ liệu và provenance đủ điều kiện.",
    details: [
      "Behavior, Content và Hybrid được đánh giá theo temporal split, rolling window và decision gate tái lập.",
      "Khi dữ liệu tương tác thật chưa đủ, trạng thái nghiên cứu là BLOCKED_BY_DATA và không tự tạo CTR hoặc UAT giả.",
      "Telemetry recommendation chỉ ghi nhận impression đủ điều kiện, click được attribution và consent hợp lệ.",
    ],
    href: "/discover",
    keywords: [
      "hybrid",
      "behavior",
      "content based",
      "block by data",
      "blocked by data",
      "ctr",
      "impression",
      "do hieu qua ai",
      "recommender",
    ],
  },
  {
    id: "privacy-telemetry",
    intent: "POLICY",
    title: "Quyền riêng tư và telemetry",
    summary:
      "Telemetry phục vụ đánh giá chỉ hoạt động theo cấu hình consent; thiếu đồng thuận phải fail-closed và không gửi sự kiện.",
    details: [
      "Impression cần hiển thị ít nhất 50% liên tục một giây mới được ghi nhận.",
      "Click được nối với đúng request và sách đã hiển thị.",
      "Dữ liệu nghiên cứu, TEST_FIXTURE và dữ liệu demo được phân biệt bằng provenance.",
    ],
    href: "/privacy",
    keywords: [
      "consent",
      "dong thuan",
      "telemetry",
      "theo doi",
      "quyen rieng tu",
      "impression",
      "fail closed",
    ],
  },
  {
    id: "admin-governance",
    intent: "ADMIN",
    title: "Quản trị và kiểm soát dữ liệu",
    summary:
      "Admin Center cung cấp tổng quan vận hành, kiểm tra tích hợp, chất lượng dữ liệu và các thao tác có phân quyền.",
    details: [
      "Độc giả và người bán không thể truy cập trang quản trị.",
      "Thao tác nhạy cảm phải có quyền phù hợp, audit log và kiểm tra đầu vào.",
      "Database demo, E2E fixture và dữ liệu nghiên cứu được cô lập để tránh sửa nhầm dữ liệu trình diễn.",
    ],
    href: "/admin",
    keywords: [
      "admin",
      "quan tri",
      "kiem tra tich hop",
      "chat luong du lieu",
      "audit log",
      "phan quyen",
    ],
  },
  {
    id: "platform-navigation",
    intent: "GENERAL",
    title: "Bản đồ tính năng BookVerse",
    summary:
      "BookVerse kết hợp catalog, Reader, hội viên, thư viện cá nhân, chợ sách, cộng đồng, trợ lý AI và khu quản trị trong một nền tảng.",
    details: [
      "Danh mục và Khám phá dùng để tìm sách; Kho đọc và Thư viện dùng để tiếp tục đọc.",
      "Hội viên mở kho Ebook; Chợ sách xử lý mua bán bản in và tồn kho.",
      "Trợ lý AI trả lời nghiệp vụ và gợi ý catalog bằng dữ liệu đã xác minh.",
    ],
    href: "/help",
    keywords: [
      "bookverse co gi",
      "tinh nang nen tang",
      "huong dan su dung",
      "bat dau tu dau",
      "gioi thieu bookverse",
      "ban do tinh nang",
    ],
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
    "anh dai dien",
    "avatar",
    "dia chi",
    "thong bao",
    "so thich doc",
    "thong tin ca nhan",
  ],
  AI: [
    "chatbot",
    "tro ly ai",
    "ca nhan hoa",
    "rag",
    "goi y ai",
    "recommender",
    "hybrid",
    "impression",
  ],
  POLICY: [
    "chinh sach",
    "hoan tien",
    "rieng tu",
    "ban quyen",
    "dieu khoan",
    "tro giup",
    "consent",
    "telemetry",
  ],
  CATALOG: [
    "catalog",
    "danh muc",
    "bao nhieu sach",
    "kho sach",
    "the loai",
    "bo loc",
    "sap xep",
    "isbn",
  ],
  DISCOVERY: ["goi y sach", "tim sach", "sach nao", "nen doc", "muon doc", "tac gia"],
  COMMUNITY: ["cong dong", "bai viet", "binh luan", "chia se cam nhan", "thao luan"],
  ADMIN: ["admin", "quan tri", "audit log", "chat luong du lieu", "phan quyen"],
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
  const queryTerms = new Set(
    normalized.split(" ").filter((term) => term.length >= 3),
  );

  return BOOKVERSE_KNOWLEDGE_BASE.map((article) => {
    const searchable = normalizeAssistantQuery(
      [
        article.title,
        article.summary,
        ...article.details,
        ...article.keywords,
      ].join(" "),
    );
    const intentScore = article.intent === intent ? 5 : 0;
    const keywordScore = article.keywords.reduce(
      (score, keyword) =>
        score +
        (normalized.includes(normalizeAssistantQuery(keyword))
          ? 6 + keyword.split(" ").length
          : 0),
      0,
    );
    const titleScore = normalizeAssistantQuery(article.title)
      .split(" ")
      .filter((term) => term.length >= 4 && normalized.includes(term)).length * 2;
    const tokenScore = [...queryTerms].filter((term) =>
      searchable.includes(term),
    ).length;
    return {
      article,
      score: intentScore + keywordScore + titleScore + tokenScore,
    };
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
  const explicitBookRequest = [
    "sach nao",
    "goi y sach",
    "tim sach",
    "cuon sach",
  ].some((signal) => normalized.includes(signal));

  // "Thể loại" cũng xuất hiện trong phần sở thích hồ sơ. Chỉ dùng tín hiệu
  // catalog rộng này khi câu hỏi thực sự được phân loại là catalog.
  if (intent === "CATALOG") {
    return (
      explicitBookRequest ||
      ["tac gia", "the loai"].some((signal) => normalized.includes(signal))
    );
  }

  return explicitBookRequest;
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

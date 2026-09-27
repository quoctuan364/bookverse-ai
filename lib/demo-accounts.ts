export const DEMO_ACCOUNT_PASSWORD = "123456";

export const DEMO_ACCOUNT_EMAILS = {
  U001: "reader.bookverse.demo@gmail.com",
  U008: "seller.bookverse.demo@gmail.com",
  U009: "admin.bookverse.demo@gmail.com",
  U010: "moderator.bookverse.demo@gmail.com",
} as const;

/**
 * Ba tài khoản độc giả chức năng để demo cá nhân hóa.
 * Đây là hồ sơ demo có thể đăng nhập thật trong hệ thống, không đại diện người thật.
 */
export const DEMO_READER_PERSONAS = [
  {
    id: "DEMO-READER-TECH",
    name: "Minh Anh",
    email: "reader.tech.bookverse.demo@gmail.com",
    role: "Độc giả công nghệ",
    persona: "Sinh viên công nghệ thông tin.",
    bio: "Thích sách về công nghệ, lập trình và dữ liệu.",
    categoryIds: ["C002"],
    preferredGenres: ["Trí tuệ nhân tạo"],
    budget: 250_000,
    dailyReadingGoalMinutes: 30,
    dailyReadingGoalPages: 20,
  },
  {
    id: "DEMO-READER-LITERATURE",
    name: "Thu Hà",
    email: "reader.literature.bookverse.demo@gmail.com",
    role: "Độc giả văn học",
    persona: "Nhân viên văn phòng.",
    bio: "Thường đọc văn học, truyện trinh thám và kỳ ảo.",
    categoryIds: ["C011", "C012"],
    preferredGenres: ["Văn học nước ngoài", "Trinh thám"],
    budget: 180_000,
    dailyReadingGoalMinutes: 45,
    dailyReadingGoalPages: 30,
  },
  {
    id: "DEMO-READER-BUSINESS",
    name: "Quang Huy",
    email: "reader.business.bookverse.demo@gmail.com",
    role: "Độc giả kinh doanh",
    persona: "Đang tìm hiểu về kinh doanh.",
    bio: "Thích sách kinh doanh, tài chính, marketing và quản trị.",
    categoryIds: ["C005", "C007", "C006", "C029"],
    preferredGenres: ["Kinh doanh", "Tài chính cá nhân", "Marketing", "Quản trị"],
    budget: 350_000,
    dailyReadingGoalMinutes: 25,
    dailyReadingGoalPages: 15,
  },
] as const;

export const DEMO_LOGIN_ACCOUNTS = [
  ...DEMO_READER_PERSONAS.map((account) => ({
    role: account.role,
    email: account.email,
    description: account.preferredGenres.join(" · "),
  })),
  { role: "Người bán", email: DEMO_ACCOUNT_EMAILS.U008, description: "Đăng bán và quản lý đơn C2C" },
  { role: "Quản trị", email: DEMO_ACCOUNT_EMAILS.U009, description: "Vận hành và xem thống kê" },
  { role: "Kiểm duyệt", email: DEMO_ACCOUNT_EMAILS.U010, description: "Xử lý báo cáo nội dung" },
] as const;

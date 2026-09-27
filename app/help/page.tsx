import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  CreditCard,
  LibraryBig,
  LockKeyhole,
  MessageCircle,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

interface GuideStep {
  icon: LucideIcon;
  title: string;
  description: string;
  tips: string[];
  action: { label: string; href: string };
}

const guideSteps: GuideStep[] = [
  {
    icon: UserPlus,
    title: "1. Tạo tài khoản",
    description: "Đăng ký để lưu sách, mua hàng, tham gia cộng đồng và nhận gợi ý phù hợp.",
    tips: ["Chọn Đăng ký và điền thông tin cần thiết.", "Đăng nhập bằng email và mật khẩu đã tạo.", "Cập nhật hồ sơ, địa chỉ nhận hàng trong trang Tài khoản."],
    action: { label: "Tạo tài khoản", href: "/register" },
  },
  {
    icon: Search,
    title: "2. Tìm và chọn sách",
    description: "Tìm theo tên sách, tác giả hoặc chủ đề; dùng bộ lọc để thu hẹp kết quả.",
    tips: ["Mở Khám phá sách trên thanh điều hướng.", "Nhập từ khóa hoặc chọn thể loại phù hợp.", "Mở trang chi tiết để xem mô tả, giá và đánh giá."],
    action: { label: "Khám phá sách", href: "/catalog" },
  },
  {
    icon: ShoppingCart,
    title: "3. Mua sách",
    description: "Thêm sách vào giỏ, kiểm tra số lượng và hoàn tất thông tin đặt hàng.",
    tips: ["Chọn Thêm vào giỏ tại sách muốn mua.", "Kiểm tra sản phẩm và mã ưu đãi trong Giỏ hàng.", "Xác nhận địa chỉ, phương thức thanh toán và đơn hàng."],
    action: { label: "Mở giỏ hàng", href: "/cart" },
  },
  {
    icon: BookOpen,
    title: "4. Đọc sách điện tử",
    description: "Đọc thử nội dung được phép hoặc mở toàn bộ sách điện tử khi đã có quyền truy cập.",
    tips: ["Sách đã mua hoặc được cấp quyền nằm trong Thư viện của tôi.", "Màn hình đọc sách có mục lục, đánh dấu trang và ghi chú.", "Không chia sẻ tệp hoặc nội dung sách trái phép."],
    action: { label: "Vào thư viện", href: "/library" },
  },
  {
    icon: Store,
    title: "5. Trao đổi sách cũ",
    description: "Khám phá tin đăng, liên hệ người bán và theo dõi trao đổi tại Chợ sách.",
    tips: ["Kiểm tra kỹ mô tả và tình trạng sách.", "Dùng tính năng nhắn tin để thống nhất giao nhận.", "Không công khai mật khẩu hoặc thông tin thanh toán."],
    action: { label: "Đến chợ sách", href: "/marketplace" },
  },
  {
    icon: Bot,
    title: "6. Nhờ Nova hỗ trợ",
    description: "Hỏi Nova để tìm sách, khám phá chủ đề hoặc được hướng dẫn sử dụng BookVerse.",
    tips: ["Nêu rõ thể loại, sở thích hoặc mục đích đọc.", "Kiểm tra lại thông tin quan trọng trước khi quyết định.", "Không nhập mật khẩu, mã thanh toán hay dữ liệu nhạy cảm."],
    action: { label: "Hỏi Nova", href: "/assistant" },
  },
];

const quickLinks = [
  { icon: LibraryBig, title: "Kho đọc", text: "Đọc và quản lý tiến độ", href: "/read" },
  { icon: CreditCard, title: "Hội viên", text: "Xem quyền lợi và gói dịch vụ", href: "/membership" },
  { icon: MessageCircle, title: "Cộng đồng", text: "Đăng bài và chia sẻ cảm nhận", href: "/community" },
  { icon: ShieldCheck, title: "Bảo mật", text: "Đổi mật khẩu và bảo vệ tài khoản", href: "/profile/security" },
] as const;

const commonQuestions = [
  ["Tôi quên mật khẩu thì làm sao?", "Tại trang Đăng nhập, chọn “Quên mật khẩu”, nhập email tài khoản và làm theo hướng dẫn đặt lại mật khẩu.", "/forgot-password", "Đặt lại mật khẩu"],
  ["Tôi xem đơn hàng ở đâu?", "Đăng nhập rồi mở mục Đơn hàng để xem trạng thái, sản phẩm, địa chỉ nhận hàng và chi tiết thanh toán.", "/orders", "Xem đơn hàng"],
  ["Vì sao tôi chỉ đọc được một phần sách điện tử?", "Khách được đọc thử phần nội dung cho phép. Bạn cần mua sách hoặc có gói hội viên phù hợp để đọc toàn bộ.", "/membership/faq", "Xem câu hỏi hội viên"],
  ["Làm sao chỉnh thông tin cá nhân?", "Mở Tài khoản để cập nhật hồ sơ; thông tin nhận hàng được quản lý riêng trong phần Địa chỉ.", "/profile", "Mở tài khoản"],
] as const;

export default function HelpPage() {
  return (
    <main className="bv-page min-h-[70vh]">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="rounded-3xl bg-gradient-to-br from-[#173F3A] via-bv-primary-dark to-bv-primary px-6 py-10 text-center text-white shadow-lg sm:px-10 sm:py-14">
          <CircleHelp className="mx-auto h-11 w-11 text-bv-gold" aria-hidden="true" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-[#F7D983]">Hướng dẫn sử dụng BookVerse</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-black sm:text-5xl">Cách sử dụng BookVerse</h1>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-[#DCEDE9]">Từ tạo tài khoản, tìm sách, đặt mua đến đọc sách điện tử — mọi thao tác cơ bản đều có ở đây.</p>
          <nav aria-label="Đi đến nội dung hướng dẫn" className="mt-7 flex flex-wrap justify-center gap-3">
            <a className="inline-flex min-h-11 items-center rounded-xl bg-bv-gold px-5 py-3 font-black text-bv-heading transition hover:brightness-105" href="#bat-dau">Xem hướng dẫn</a>
            <a className="inline-flex min-h-11 items-center rounded-xl border border-white/35 px-5 py-3 font-bold text-white transition hover:bg-white/10" href="#cau-hoi">Câu hỏi thường gặp</a>
          </nav>
        </header>

        <section aria-labelledby="quick-links-title" className="mt-8">
          <h2 className="sr-only" id="quick-links-title">Truy cập nhanh</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map(({ icon: Icon, title, text, href }) => (
              <Link className="group flex min-h-24 items-center gap-4 rounded-2xl border border-bv-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-bv-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary" href={href} key={href}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bv-primary/10 text-bv-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className="min-w-0"><span className="block font-black text-bv-heading">{title}</span><span className="mt-0.5 block text-sm text-bv-text-muted">{text}</span></span>
                <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-bv-text-muted transition group-hover:translate-x-0.5 group-hover:text-bv-primary" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="bat-dau" className="mt-14 scroll-mt-24">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.15em] text-bv-accent">Dành cho người dùng mới</p>
            <h2 className="mt-2 text-3xl font-black text-bv-heading" id="bat-dau">6 bước sử dụng BookVerse</h2>
            <p className="mt-3 leading-7 text-bv-text-muted">Bạn có thể thực hiện lần lượt hoặc chọn đúng chức năng đang cần.</p>
          </div>
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {guideSteps.map(({ icon: Icon, title, description, tips, action }) => (
              <article className="rounded-2xl border border-bv-border bg-white p-6 shadow-sm" key={title}>
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-bv-primary/10 text-bv-primary"><Icon className="h-6 w-6" aria-hidden="true" /></span>
                  <div><h3 className="text-xl font-black text-bv-heading">{title}</h3><p className="mt-1.5 leading-6 text-bv-text-muted">{description}</p></div>
                </div>
                <ol className="mt-5 space-y-3">
                  {tips.map((tip) => <li className="flex gap-3 text-sm leading-6 text-bv-text" key={tip}><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-bv-primary" aria-hidden="true" /><span>{tip}</span></li>)}
                </ol>
                <Link className="mt-5 inline-flex min-h-11 items-center gap-1 font-black text-bv-primary hover:text-bv-primary-dark" href={action.href}>{action.label}<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </section>

        <aside className="mt-10 flex gap-4 rounded-2xl border border-bv-gold/50 bg-bv-gold/10 p-5 sm:p-6">
          <LockKeyhole className="mt-0.5 h-6 w-6 shrink-0 text-bv-primary-dark" aria-hidden="true" />
          <div><h2 className="font-black text-bv-heading">Mẹo an toàn</h2><p className="mt-1 text-sm leading-6 text-bv-text">BookVerse không yêu cầu bạn gửi mật khẩu qua tin nhắn. Hãy kiểm tra kỹ thông tin đơn hàng và chỉ trao đổi trong các kênh có trên website.</p></div>
        </aside>

        <section aria-labelledby="cau-hoi" className="mt-14 scroll-mt-24">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-bv-accent">Giải đáp nhanh</p>
          <h2 className="mt-2 text-3xl font-black text-bv-heading" id="cau-hoi">Câu hỏi thường gặp</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {commonQuestions.map(([question, answer, href, label]) => (
              <article className="rounded-2xl border border-bv-border bg-white p-6" key={question}>
                <h3 className="text-lg font-black text-bv-heading">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-bv-text-muted">{answer}</p>
                <Link className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-black text-bv-primary" href={href}>{label}<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl bg-[#173F3A] p-7 text-center text-white sm:p-9">
          <CircleHelp className="mx-auto h-8 w-8 text-bv-gold" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-black">Bạn vẫn cần trợ giúp?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#CFE5DF]">Hãy mô tả điều bạn muốn làm cho Nova. Trợ lý có thể hướng dẫn chức năng và hỗ trợ tìm sách phù hợp.</p>
          <Link className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-bv-gold px-5 py-3 font-black text-bv-heading" href="/assistant"><Bot className="h-5 w-5" aria-hidden="true" />Mở trợ lý Nova</Link>
        </section>
      </section>
    </main>
  );
}

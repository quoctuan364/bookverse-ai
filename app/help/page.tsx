import { BookOpen, CreditCard, HelpCircle, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

const topics = [
  [BookOpen, "Đọc Ebook", "Khách đọc thử tối đa 10%; người mua hoặc hội viên hợp lệ được mở toàn bộ nội dung đã cấp quyền.", "/membership/faq"],
  [CreditCard, "Hội viên và thanh toán", "Xem gói, xác nhận bằng ví demo, theo dõi kỳ đang dùng và lịch sử giao dịch.", "/profile/membership"],
  [ShieldCheck, "Tài khoản và bảo mật", "Đổi mật khẩu, kiểm tra hồ sơ và bảo vệ thông tin đăng nhập.", "/profile/security"],
  [MessageCircle, "Cộng đồng và marketplace", "Tìm hiểu quy tắc đăng bài, mua bán và xử lý nội dung vi phạm.", "/terms"],
] as const;

export default function HelpPage() {
  return (
    <main className="bv-page min-h-[70vh]">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="text-center"><HelpCircle className="mx-auto h-10 w-10 text-bv-primary" aria-hidden="true" /><p className="mt-4 text-sm font-black uppercase tracking-[0.15em] text-bv-accent">Trung tâm hỗ trợ</p><h1 className="mt-2 text-4xl font-black text-bv-heading">Bạn cần trợ giúp gì?</h1><p className="mx-auto mt-3 max-w-2xl leading-7 text-bv-text-muted">Chọn đúng nhóm vấn đề để xem hướng dẫn và đường dẫn xử lý nhanh.</p></header>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {topics.map(([Icon, title, text, href]) => <Link className="cursor-pointer rounded-2xl border border-bv-border bg-white p-6 transition hover:border-bv-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary" href={href} key={title}><Icon className="h-6 w-6 text-bv-primary" aria-hidden="true" /><h2 className="mt-4 text-xl font-black text-bv-heading">{title}</h2><p className="mt-2 text-sm leading-6 text-bv-text-muted">{text}</p><span className="mt-4 inline-flex min-h-11 items-center font-bold text-bv-primary">Xem hướng dẫn →</span></Link>)}
        </div>
        <div className="mt-8 rounded-2xl bg-[#173F3A] p-6 text-center text-white"><h2 className="text-2xl font-black">Chưa tìm thấy câu trả lời?</h2><p className="mt-2 text-sm leading-6 text-[#CFE5DF]">Trong phạm vi đồ án, bạn có thể dùng trợ lý AI để tìm sách và hướng dẫn tính năng. Không gửi mật khẩu hoặc dữ liệu nhạy cảm vào hội thoại.</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-bv-gold px-5 py-3 font-black text-bv-heading" href="/assistant">Mở trợ lý AI</Link></div>
      </section>
    </main>
  );
}

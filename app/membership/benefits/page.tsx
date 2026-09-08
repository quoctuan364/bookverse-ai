import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  Crown,
  Highlighter,
  LibraryBig,
} from "lucide-react";

const benefits = [
  {
    icon: LibraryBig,
    title: "Mở nội dung BookVerse",
    description:
      "Một gói đang hoạt động mở toàn bộ nội dung đọc minh họa được BookVerse cấp quyền trong thời hạn.",
  },
  {
    icon: BookOpen,
    title: "Đọc liên tục trên trình duyệt",
    description:
      "Lưu trang đang đọc, mục tiêu phiên đọc, giao diện sáng/tối và cỡ chữ phù hợp.",
  },
  {
    icon: Highlighter,
    title: "Highlight và ghi chú",
    description:
      "Đánh dấu đoạn quan trọng, thêm ghi chú cá nhân và xuất lại dữ liệu học tập.",
  },
  {
    icon: BrainCircuit,
    title: "Trợ lý đọc AI",
    description:
      "Hỏi theo nội dung đã được nạp, nhận câu trả lời có trích dẫn và hạn chế suy đoán ngoài sách.",
  },
];

export default function MembershipBenefitsPage() {
  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-bv-gold/15 px-4 py-2 text-sm font-black text-bv-gold">
            <Crown className="h-4 w-4" aria-hidden="true" />
            Quyền lợi BookVerse Member
          </span>
          <h1 className="bv-editorial mt-5 text-4xl font-bold leading-tight sm:text-6xl">
            Một gói cho toàn bộ hành trình đọc
          </h1>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-bv-mint-soft">
            Bạn luôn có thể đọc thử trước. Khi cần học sâu hoặc đọc hết sách, gói hội
            viên mở khóa toàn bộ công cụ và nội dung hiện có.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-bv-gold px-6 font-black text-bv-heading transition hover:bg-[#F7D875] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              href="/membership"
            >
              Chọn gói hội viên
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-white/25 px-6 font-black text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              href="/read"
            >
              Vào kho đọc thử
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {benefits.map(({ icon: Icon, title, description }) => (
            <article className="bv-card rounded-2xl p-6 sm:p-7" key={title}>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-bv-mint text-bv-primary">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-2xl font-black text-bv-heading">{title}</h2>
              <p className="mt-2 leading-7 text-bv-text-muted">{description}</p>
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-bv-primary/15 bg-bv-mint p-6 sm:p-8">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-bv-accent">
                Cách hoạt động
              </p>
              <h2 className="mt-2 text-3xl font-black text-bv-heading">
                Rõ ràng từ lúc đọc thử đến khi mở khóa
              </h2>
              <ul className="mt-5 space-y-3">
                {[
                  "Không cần đăng ký vẫn xem được tối đa 10% mỗi cuốn.",
                  "Gói đang hoạt động mở toàn bộ nội dung BookVerse cấp quyền, không phải mua từng sách.",
                  "Sách mới tự động được mở trong thời hạn hội viên.",
                  "Khi hết hạn, tiến độ và ghi chú vẫn được lưu để dùng lại.",
                ].map((item) => (
                  <li className="flex gap-3 text-[#364152]" key={item}>
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-bv-primary" aria-hidden="true" />
                    <span className="leading-6">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-bv-primary px-6 font-black text-white transition hover:bg-bv-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2"
              href="/membership"
            >
              <Crown className="h-5 w-5" aria-hidden="true" />
              Xem giá các gói
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

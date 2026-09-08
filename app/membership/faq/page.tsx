import Link from "next/link";

const questions = [
  ["Tài khoản miễn phí đọc được bao nhiêu?", "Bạn được đọc thử tối đa 10% nội dung của mỗi Ebook có bản đọc BookVerse."],
  ["Hội viên có đọc được mọi cuốn sách không?", "Không. Hội viên đọc toàn bộ những Ebook đang nằm trong kho của gói đã đăng ký."],
  ["Hủy gia hạn có bị khóa ngay không?", "Không. Bạn tiếp tục sử dụng quyền lợi đến hết ngày đã thanh toán."],
  ["Ebook mua riêng có mất khi gói hết hạn không?", "Không. Quyền mua riêng được lưu độc lập và không phụ thuộc gói hội viên."],
  ["Thanh toán hiện có trừ tiền thật không?", "Không. Đây là thanh toán ví demo phục vụ đồ án và trình diễn học thuật."],
  ["Tôi có thể gia hạn gói không?", "Có. Chọn lại một gói trên trang Hội viên; kỳ mới sẽ được nối sau thời hạn hiện tại."],
];

export default function MembershipFaqPage() {
  return (
    <main className="bv-page">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="font-black uppercase tracking-[0.15em] text-bv-accent">Hỗ trợ</p>
        <h1 className="mt-2 text-4xl font-black text-bv-heading">Câu hỏi thường gặp</h1>
        <div className="mt-8 space-y-3">{questions.map(([question, answer]) => <details className="bv-card group rounded-xl p-5" key={question}><summary className="cursor-pointer list-none font-black text-bv-heading">{question}<span className="float-right text-bv-primary group-open:rotate-45">+</span></summary><p className="mt-3 leading-7 text-bv-text-muted">{answer}</p></details>)}</div>
        <div className="mt-8 flex gap-3"><Link className="rounded-lg bg-bv-primary px-5 py-3 font-black text-white" href="/membership">Xem các gói</Link><Link className="rounded-lg border bg-white px-5 py-3 font-black" href="/profile/membership">Gói của tôi</Link></div>
      </section>
    </main>
  );
}

import { BookX, Home, Search } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="bv-page flex min-h-[70vh] items-center justify-center px-4 py-12">
      <section className="max-w-xl rounded-2xl border border-[#D8D0C2] bg-white p-7 text-center shadow-sm sm:p-10">
        <BookX className="mx-auto h-12 w-12 text-[#C65D43]" aria-hidden="true" />
        <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-[#C65D43]">Lỗi 404</p>
        <h1 className="mt-2 text-3xl font-black text-[#17202A]">Không tìm thấy trang</h1>
        <p className="mt-3 leading-7 text-[#66706B]">Đường dẫn có thể đã thay đổi, nội dung bị ẩn hoặc mã sách không còn tồn tại.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#176B62] px-5 py-3 font-black text-white transition hover:bg-[#104C47]" href="/"><Home className="h-4 w-4" aria-hidden="true" />Về trang chủ</Link>
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#D8D0C2] px-5 py-3 font-black text-[#17202A] transition hover:bg-[#F7F4ED]" href="/catalog"><Search className="h-4 w-4" aria-hidden="true" />Tìm sách</Link>
        </div>
      </section>
    </main>
  );
}

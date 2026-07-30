import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function MembershipSuccessPage() {
  return (
    <main className="bv-page">
      <section className="mx-auto flex min-h-[65vh] max-w-2xl items-center px-4 py-12">
        <div className="bv-card w-full rounded-2xl p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-[#176B62]" />
          <h1 className="mt-5 text-3xl font-black text-[#17202A]">Đăng ký hội viên thành công</h1>
          <p className="mt-3 leading-7 text-[#66706B]">
            Thanh toán demo đã được ghi nhận. Bạn có thể đọc ngay các sách nằm trong gói đã chọn.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link className="rounded-lg bg-[#176B62] px-5 py-3 font-black text-white" href="/membership/books">Mở kho hội viên</Link>
            <Link className="rounded-lg border border-[#17202A]/15 bg-white px-5 py-3 font-black text-[#17202A]" href="/profile/membership">Xem gói của tôi</Link>
          </div>
        </div>
      </section>
    </main>
  );
}


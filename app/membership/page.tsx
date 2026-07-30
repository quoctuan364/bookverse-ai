import Link from "next/link";
import { Check, Crown, LibraryBig, ShieldCheck } from "lucide-react";
import { getMembershipPlans } from "@/actions/membership.actions";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function money(value: unknown) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default async function MembershipPage() {
  const [plans, user] = await Promise.all([getMembershipPlans(), getCurrentUser()]);

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#F2C14E]/15 px-4 py-2 text-sm font-black text-[#F2C14E]">
            <Crown className="h-4 w-4" /> BookVerse Member
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">Đọc nhiều hơn, học sâu hơn</h1>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-[#EAF5F1]">
            Đọc thử mọi cuốn sách miễn phí tối đa 10%. Chỉ cần một gói hội viên đang hoạt động để
            mở toàn bộ kho đọc, kể cả sách mới được bổ sung trong thời hạn của bạn.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article className={`bv-card relative flex flex-col rounded-2xl p-6 ${plan.slug === "bookverse-premium-3-thang" ? "ring-2 ring-[#176B62]" : ""}`} key={plan.id}>
              {plan.slug === "bookverse-premium-3-thang" ? (
                <span className="absolute -top-3 right-5 rounded-full bg-[#176B62] px-3 py-1 text-xs font-black text-white">Được chọn nhiều</span>
              ) : null}
              {plan.billingPeriod === "YEARLY" ? (
                <span className="absolute -top-3 right-5 rounded-full bg-[#C65D43] px-3 py-1 text-xs font-black text-white">Tiết kiệm dài hạn</span>
              ) : null}
              <p className="text-sm font-black uppercase tracking-[0.15em] text-[#C65D43]">
                {plan.billingPeriod === "YEARLY" ? "Theo năm" : "Theo tháng"}
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#17202A]">{plan.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-[#66706B]">
                {plan.description ?? "Truy cập kho Ebook tuyển chọn dành cho hội viên."}
              </p>
              <p className="mt-5 text-3xl font-black text-[#176B62]">{money(plan.price)}</p>
              <p className="mt-1 text-sm text-[#66706B]">{plan.durationDays} ngày sử dụng</p>
              <ul className="mt-6 flex-1 space-y-3">
                {[`Mở toàn bộ ${plan._count.books} sách đang có`, "Tự động nhận sách mới trong thời hạn", ...plan.features].map((feature) => (
                  <li className="flex gap-2 text-sm text-[#364152]" key={feature}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#176B62]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                className="mt-7 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-[#176B62] px-4 py-3 font-black text-white transition hover:bg-[#104C47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] focus-visible:ring-offset-2"
                href={user ? `/membership/checkout?planId=${encodeURIComponent(plan.id)}` : `/login?callbackUrl=${encodeURIComponent(`/membership/checkout?planId=${plan.id}`)}`}
              >
                {user ? "Chọn gói này" : "Đăng nhập để đăng ký"}
              </Link>
            </article>
          ))}
        </div>

        {plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#176B62]/30 bg-white p-8 text-center">
            <Crown className="mx-auto h-10 w-10 text-[#176B62]" />
            <h2 className="mt-3 text-xl font-black text-[#17202A]">Chưa có gói đang mở bán</h2>
            <p className="mt-2 text-sm text-[#66706B]">Quản trị viên cần tạo gói và thêm sách vào kho hội viên.</p>
          </div>
        ) : null}

        {plans.length > 0 ? (
          <section className="mt-12">
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-[0.15em] text-[#C65D43]">So sánh</p>
              <h2 className="mt-2 text-3xl font-black text-[#17202A]">Chọn gói phù hợp với nhịp đọc</h2>
            </div>
            <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#F7F4ED]">
                  <tr><th className="p-4">Quyền lợi</th>{plans.map((plan) => <th className="p-4 text-center" key={plan.id}>{plan.name}</th>)}</tr>
                </thead>
                <tbody>
                  <tr className="border-t"><th className="p-4">Thời hạn</th>{plans.map((plan) => <td className="p-4 text-center font-bold" key={plan.id}>{plan.durationDays} ngày</td>)}</tr>
                  <tr className="border-t"><th className="p-4">Kho đọc</th>{plans.map((plan) => <td className="p-4 text-center font-bold" key={plan.id}>{plan._count.books} cuốn</td>)}</tr>
                  <tr className="border-t"><th className="p-4">Lưu tiến độ, bookmark</th>{plans.map((plan) => <td className="p-4 text-center text-[#176B62]" key={plan.id}>✓</td>)}</tr>
                  <tr className="border-t"><th className="p-4">Highlight và ghi chú</th>{plans.map((plan) => <td className="p-4 text-center text-[#176B62]" key={plan.id}>✓</td>)}</tr>
                  <tr className="border-t"><th className="p-4">Trợ lý đọc AI</th>{plans.map((plan, index) => <td className="p-4 text-center font-bold" key={plan.id}>{index === 0 ? "Cơ bản" : "Đầy đủ"}</td>)}</tr>
                  <tr className="border-t"><th className="p-4">Giá</th>{plans.map((plan) => <td className="p-4 text-center font-black text-[#176B62]" key={plan.id}>{money(plan.price)}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            [LibraryBig, "Một gói, toàn bộ kho", "Mọi Ebook đang hoạt động và sách mới bổ sung đều được mở trong thời hạn."],
            [ShieldCheck, "Kiểm tra ở server", "Không thể lấy toàn văn chỉ bằng cách bỏ khóa trên giao diện."],
            [Crown, "Quyền lợi minh bạch", "Hủy gia hạn vẫn đọc đến hết ngày đã thanh toán."],
          ].map(([Icon, title, text]) => (
            <div className="rounded-xl bg-white p-5 shadow-sm" key={String(title)}>
              <Icon className="h-5 w-5 text-[#176B62]" />
              <h3 className="mt-3 font-black text-[#17202A]">{String(title)}</h3>
              <p className="mt-1 text-sm leading-6 text-[#66706B]">{String(text)}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-[#66706B]">
          Bằng việc đăng ký, bạn đồng ý với <Link className="inline-flex min-h-11 items-center rounded-lg px-2 font-bold text-[#176B62] underline hover:bg-[#EAF2EF]" href="/membership/terms">điều khoản hội viên</Link>
          {" · "}<Link className="inline-flex min-h-11 items-center rounded-lg px-2 font-bold text-[#176B62] underline hover:bg-[#EAF2EF]" href="/membership/faq">Câu hỏi thường gặp</Link>.
        </p>
      </section>
    </main>
  );
}

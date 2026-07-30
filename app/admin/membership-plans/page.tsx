import { redirect } from "next/navigation";
import {
  createMembershipPlan,
  toggleMembershipPlanActive,
  updateMembershipPlan,
} from "@/actions/membership.actions";
import { getCurrentUser, requireAdminUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMembershipPlansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin/membership-plans");
  if (user.role !== "ADMIN") redirect("/");
  await requireAdminUser();
  const [plans, readableBookCount] = await Promise.all([
    prisma.membershipPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { subscriptions: true } } },
    }),
    prisma.book.count({
      where: { status: "ACTIVE", deletedAt: null },
    }),
  ]);

  async function create(formData: FormData) {
    "use server";
    const result = await createMembershipPlan(formData);
    redirect(`/admin/membership-plans?${result.success ? "message" : "error"}=${encodeURIComponent(result.message)}`);
  }
  async function update(formData: FormData) {
    "use server";
    const result = await updateMembershipPlan(formData);
    redirect(`/admin/membership-plans?${result.success ? "message" : "error"}=${encodeURIComponent(result.message)}`);
  }
  async function toggleActive(formData: FormData) {
    "use server";
    const result = await toggleMembershipPlanActive(String(formData.get("planId")));
    redirect(`/admin/membership-plans?message=${encodeURIComponent(result.message)}`);
  }

  return (
    <main className="bv-page">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-4xl font-black text-[#17202A]">Quản lý gói hội viên</h1><p className="mt-2 text-[#66706B]">Mọi gói đang hoạt động đều mở toàn bộ kho Ebook; quản trị viên chỉ cần quản lý giá và thời hạn.</p></div>
          <a className="rounded-lg border bg-white px-4 py-3 font-bold" href="/admin/subscriptions">Xem thuê bao</a>
        </div>
        <div className="mt-8 grid gap-7 lg:grid-cols-[380px_1fr]">
          <form action={create} className="bv-card h-fit space-y-4 rounded-2xl p-6">
            <h2 className="text-xl font-black">Tạo gói mới</h2>
            <label className="grid gap-2 text-sm font-bold text-[#364152]">
              Tên gói
              <input className="h-11 w-full rounded-lg border px-3 font-normal" name="name" placeholder="Ví dụ: BookVerse Premium" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#364152]">
              Đường dẫn gói
              <input className="h-11 w-full rounded-lg border px-3 font-normal" name="slug" pattern="[a-z0-9-]{3,50}" placeholder="bookverse-premium" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#364152]">
              Mô tả
              <textarea className="min-h-20 w-full rounded-lg border p-3 font-normal" name="description" placeholder="Mô tả ngắn về đối tượng phù hợp" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm font-bold text-[#364152]">
                Giá (VNĐ)
                <input className="h-11 min-w-0 rounded-lg border px-3 font-normal" min="1000" name="price" placeholder="99000" required type="number" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#364152]">
                Số ngày
                <input className="h-11 min-w-0 rounded-lg border px-3 font-normal" min="1" name="durationDays" placeholder="90" required type="number" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-bold text-[#364152]">
              Chu kỳ
              <select className="h-11 w-full rounded-lg border px-3 font-normal" name="billingPeriod"><option value="MONTHLY">Theo tháng</option><option value="YEARLY">Theo năm</option></select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#364152]">
              Quyền lợi
              <textarea className="min-h-24 w-full rounded-lg border p-3 font-normal" name="features" placeholder={"Mỗi dòng một quyền lợi\nLưu tiến độ đọc\nGhi chú và highlight"} />
            </label>
            <button className="h-11 w-full rounded-lg bg-[#176B62] font-black text-white" type="submit">Tạo gói</button>
          </form>
          <div className="space-y-6">
            {plans.map((plan) => {
              return (
                <section className="bv-card rounded-2xl p-6" key={plan.id}>
                  <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-black">{plan.name}</h2><p className="text-sm text-[#66706B]">Toàn bộ {readableBookCount} sách · {plan._count.subscriptions} lượt đăng ký</p></div><form action={toggleActive}><input name="planId" type="hidden" value={plan.id} /><button className={`min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] ${plan.isActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`} type="submit">{plan.isActive ? "Đang bán · bấm để ẩn" : "Đã ẩn · bấm để mở"}</button></form></div>
                  <details className="mt-4 rounded-xl bg-[#F7F4ED] p-4">
                    <summary className="cursor-pointer font-black">Chỉnh sửa thông tin gói</summary>
                    <form action={update} className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input name="planId" type="hidden" value={plan.id} />
                      <label className="grid gap-1.5 text-xs font-bold text-[#536071]">
                        Tên gói
                        <input className="h-11 rounded-lg border px-3 text-sm font-normal text-[#17202A]" defaultValue={plan.name} name="name" required />
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-[#536071]">
                        Giá (VNĐ)
                        <input className="h-11 rounded-lg border px-3 text-sm font-normal text-[#17202A]" defaultValue={Number(plan.price)} min="1000" name="price" required type="number" />
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-[#536071]">
                        Số ngày
                        <input className="h-11 rounded-lg border px-3 text-sm font-normal text-[#17202A]" defaultValue={plan.durationDays} min="1" name="durationDays" required type="number" />
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-[#536071] sm:col-span-2">
                        Mô tả
                        <input className="h-11 rounded-lg border px-3 text-sm font-normal text-[#17202A]" defaultValue={plan.description ?? ""} name="description" placeholder="Mô tả" />
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-[#536071] sm:col-span-2">
                        Quyền lợi
                        <textarea className="min-h-24 rounded-lg border p-3 text-sm font-normal text-[#17202A]" defaultValue={plan.features.join("\n")} name="features" />
                      </label>
                      <button className="min-h-11 cursor-pointer rounded-lg bg-[#17202A] font-black text-white transition hover:bg-[#2C3848] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] sm:col-span-2" type="submit">Lưu thay đổi</button>
                    </form>
                  </details>
                  <div className="mt-5 rounded-xl border border-[#176B62]/15 bg-[#E6F3F0] p-4 text-sm leading-6 text-[#0F3F3C]">
                    Mọi sách mới có trạng thái ACTIVE sẽ tự động được đưa vào quyền lợi của gói. Không cần thêm từng cuốn thủ công.
                  </div>
                </section>
              );
            })}
            {plans.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-[#66706B]">Chưa có gói. Hãy tạo gói đầu tiên.</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

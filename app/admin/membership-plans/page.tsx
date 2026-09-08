import { redirect } from "next/navigation";
import {
  createMembershipPlan,
  deleteMembershipPlan,
  toggleMembershipPlanActive,
  updateMembershipPlan,
} from "@/actions/membership.actions";
import { getCurrentUser, requireAdminUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMembershipPlansPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin/membership-plans");
  if (user.role !== "ADMIN") redirect("/");
  await requireAdminUser();
  const [plans, readableBookCount] = await Promise.all([
    prisma.membershipPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { subscriptions: true, payments: true } } },
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
  async function remove(formData: FormData) {
    "use server";
    const result = await deleteMembershipPlan(String(formData.get("planId")));
    redirect(`/admin/membership-plans?${result.success ? "message" : "error"}=${encodeURIComponent(result.message)}`);
  }

  return (
    <main className="bv-page">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-4xl font-black text-bv-heading">Quản lý gói hội viên</h1><p className="mt-2 text-bv-text-muted">Mọi gói đang hoạt động đều mở toàn bộ kho Ebook; quản trị viên chỉ cần quản lý giá và thời hạn.</p></div>
          <a className="rounded-lg border bg-white px-4 py-3 font-bold" href="/admin/subscriptions">Xem thuê bao</a>
        </div>

        {params?.message ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800" role="status">
            {params.message}
          </div>
        ) : null}
        {params?.error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800" role="alert">
            {params.error}
          </div>
        ) : null}

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
            <button className="h-11 w-full rounded-lg bg-bv-primary font-black text-white" type="submit">Tạo gói</button>
          </form>
          <div className="space-y-6">
            {plans.map((plan) => {
              return (
                <section className="bv-card rounded-2xl p-6" key={plan.id}>
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">{plan.name}</h2>
                      <p className="text-sm text-bv-text-muted">Toàn bộ {readableBookCount} sách · {plan._count.subscriptions} lượt đăng ký</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={toggleActive}>
                        <input name="planId" type="hidden" value={plan.id} />
                        <button className={`min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary ${plan.isActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`} type="submit">
                          {plan.isActive ? "Đang bán · bấm để ẩn" : "Đã ẩn · bấm để mở"}
                        </button>
                      </form>
                      <form action={remove}>
                        <input name="planId" type="hidden" value={plan.id} />
                        <button className="min-h-11 cursor-pointer rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" type="submit">
                          Xóa gói
                        </button>
                      </form>
                    </div>
                  </div>
                  <details className="mt-4 rounded-xl bg-bv-surface p-4">
                    <summary className="cursor-pointer font-black">Chỉnh sửa thông tin gói</summary>
                    <form action={update} className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input name="planId" type="hidden" value={plan.id} />
                      <label className="grid gap-1.5 text-xs font-bold text-bv-text">
                        Tên gói
                        <input className="h-11 rounded-lg border px-3 text-sm font-normal text-bv-heading" defaultValue={plan.name} name="name" required />
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-bv-text">
                        Giá (VNĐ)
                        <input className="h-11 rounded-lg border px-3 text-sm font-normal text-bv-heading" defaultValue={Number(plan.price)} min="1000" name="price" required type="number" />
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-bv-text">
                        Số ngày
                        <input className="h-11 rounded-lg border px-3 text-sm font-normal text-bv-heading" defaultValue={plan.durationDays} min="1" name="durationDays" required type="number" />
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-bv-text sm:col-span-2">
                        Mô tả
                        <input className="h-11 rounded-lg border px-3 text-sm font-normal text-bv-heading" defaultValue={plan.description ?? ""} name="description" placeholder="Mô tả" />
                      </label>
                      <label className="grid gap-1.5 text-xs font-bold text-bv-text sm:col-span-2">
                        Quyền lợi
                        <textarea className="min-h-24 rounded-lg border p-3 text-sm font-normal text-bv-heading" defaultValue={plan.features.join("\n")} name="features" />
                      </label>
                      <button className="min-h-11 cursor-pointer rounded-lg bg-bv-heading font-black text-white transition hover:bg-[#2C3848] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary sm:col-span-2" type="submit">Lưu thay đổi</button>
                    </form>
                  </details>
                  <div className="mt-5 rounded-xl border border-bv-primary/15 bg-bv-mint p-4 text-sm leading-6 text-[#0F3F3C]">
                    Mọi sách mới có trạng thái ACTIVE sẽ tự động được đưa vào quyền lợi của gói. Không cần thêm từng cuốn thủ công.
                  </div>
                </section>
              );
            })}
            {plans.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-bv-text-muted">Chưa có gói. Hãy tạo gói đầu tiên.</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

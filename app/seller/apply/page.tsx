import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { becomeSeller, getSellerGateData } from "@/actions/seller.actions";
import {
  primaryButton,
  secondaryButton,
  SellerAlert,
  SellerHero,
} from "@/app/seller/_components/seller-ui";

export const dynamic = "force-dynamic";

interface SellerApplyPageProps {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
}

async function becomeSellerAction() {
  "use server";

  const result = await becomeSeller();

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect("/login?callbackUrl=/seller/apply");
    }

    redirect(`/seller/apply?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/seller?message=${encodeURIComponent(result.message)}`);
}

export default async function SellerApplyPage({ searchParams }: SellerApplyPageProps) {
  const [params, gate] = await Promise.all([searchParams, getSellerGateData()]);

  if (gate.status === "UNAUTHENTICATED") {
    redirect("/login?callbackUrl=/seller/apply");
  }

  if (gate.status === "SELLER") {
    redirect("/seller");
  }

  return (
    <main className="bv-page">
      <SellerHero
        description="Bật vai trò người bán để tạo listing chờ duyệt, theo dõi đơn hàng từ listing của mình và xem doanh thu demo."
        title="Đăng ký Seller"
      />

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <form action={becomeSellerAction} className="bv-card rounded-lg p-6">
          <SellerAlert message={params?.message} tone="success" />
          <SellerAlert message={params?.error} tone="error" />

          <div className="mt-1">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">Tài khoản hiện tại</p>
            <h1 className="mt-2 text-2xl font-black text-white">{gate.user?.name}</h1>
            <p className="mt-1 text-sm text-zinc-400">{gate.user?.email ?? gate.user?.id}</p>
          </div>

          <div className="mt-6 grid gap-4">
            {[
              "Listing mới hoặc listing đã chỉnh sửa sẽ ở trạng thái chờ admin duyệt.",
              "Seller chỉ được xem và xử lý đơn có item thuộc listing của mình.",
              "Các thao tác tạo listing, ẩn/hiện listing và cập nhật đơn đều ghi audit log.",
            ].map((item) => (
              <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.05] p-4" key={item}>
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#F2C14E]" aria-hidden="true" />
                <p className="text-sm leading-6 text-zinc-300">{item}</p>
              </div>
            ))}
          </div>

          <label className="mt-6 flex gap-3 rounded-lg border border-white/10 bg-white/[0.05] p-4 text-sm leading-6 text-zinc-300">
            <input className="mt-1 h-4 w-4 accent-[#0F766E]" name="accepted" required type="checkbox" />
            Tôi hiểu rằng listing sẽ cần kiểm duyệt và BookVerse có thể ẩn listing vi phạm trong bản demo.
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className={primaryButton} type="submit">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Bật vai trò seller
            </button>
            <Link className={secondaryButton} href="/seller">
              Quay lại
            </Link>
          </div>
        </form>

        <aside className="bv-card h-fit rounded-lg p-6">
          <h2 className="text-xl font-black text-white">Sau khi bật seller</h2>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-zinc-300">
            <p>Bạn sẽ vào được `/seller`, `/seller/listings`, `/seller/orders` và `/seller/revenue`.</p>
            <p>Navbar sẽ hiện link Seller Dashboard cho role SELLER hoặc ADMIN.</p>
            <p>Không cần thêm bảng SellerApplication vì yêu cầu hiện tại cho phép đăng ký đơn giản.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

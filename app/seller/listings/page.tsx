import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, EyeOff, Filter, Pencil, Plus, Search } from "lucide-react";
import { ListingStatus } from "@prisma/client";
import { getSellerListingsData, setSellerListingVisibility } from "@/actions/seller.actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { SafeBookCover } from "@/components/shared/SafeBookCover";
import { Input } from "@/components/ui/input";
import {
  conditionLabel,
  dangerButton,
  formatDate,
  formatPrice,
  listingStatusLabel,
  neutralButton,
  primaryButton,
  secondaryButton,
  selectClass,
  SellerAlert,
  SellerGatePanel,
  SellerHero,
  SellerNav,
  StatusBadge,
} from "@/app/seller/_components/seller-ui";

export const dynamic = "force-dynamic";

interface SellerListingsPageProps {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    q?: string;
    status?: string;
  }>;
}

async function updateVisibilityAction(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listingId") ?? "");
  const nextVisibility = String(formData.get("nextVisibility") ?? "") as "HIDE" | "SHOW";
  const result = await setSellerListingVisibility(listingId, nextVisibility);

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect("/login?callbackUrl=/seller/listings");
    }

    redirect(`/seller/listings?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/seller/listings?message=${encodeURIComponent(result.message)}`);
}

export default async function SellerListingsPage({ searchParams }: SellerListingsPageProps) {
  const params = await searchParams;
  const data = await getSellerListingsData({
    q: params?.q,
    status: params?.status,
  });

  return (
    <main className="bv-page">
      <SellerHero
        action={
          data.gate.status === "SELLER" ? (
            <Link className={primaryButton} href="/seller/listings/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tạo listing
            </Link>
          ) : null
        }
        description="Tạo, sửa, ẩn hoặc gửi duyệt lại listing. Mọi truy vấn chỉ trả về listing thuộc seller hiện tại."
        title="Quản lý listing"
      />

      {data.gate.status !== "SELLER" ? (
        <SellerGatePanel gate={data.gate} />
      ) : (
        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <SellerNav />
          <SellerAlert message={params?.message} tone="success" />
          <SellerAlert message={params?.error} tone="error" />

          <form className="bv-card grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_220px_auto]" method="get">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <Input
                className="h-11 pl-10"
                defaultValue={data.filters.q}
                name="q"
                placeholder="Tìm tiêu đề, sách, mô tả..."
                type="search"
              />
            </div>
            <select className={selectClass} defaultValue={data.filters.status} name="status">
              <option value="ALL">Tất cả trạng thái</option>
              {Object.values(ListingStatus).map((status) => (
                <option key={status} value={status}>
                  {listingStatusLabel(status)}
                </option>
              ))}
            </select>
            <button className={primaryButton} type="submit">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Lọc
            </button>
          </form>

          <div className="grid gap-4">
            {data.listings.map((listing) => (
              <article className="bv-card rounded-lg p-5" key={listing.id}>
                <div className="grid gap-4 lg:grid-cols-[120px_1fr_auto]">
                  <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-white/[0.06] lg:w-[120px]">
                    <SafeBookCover alt={listing.title} className="h-full w-full object-cover" src={listing.imageUrl} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="line-clamp-1 text-xl font-black text-white">{listing.title}</h2>
                      <StatusBadge label={listingStatusLabel(listing.status)} value={listing.status} />
                      <StatusBadge label={conditionLabel(listing.condition)} value={listing.condition} />
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                      {formatPrice(listing.price)} - {listing.book?.title ?? "Không liên kết catalog"} - Cập nhật{" "}
                      {formatDate(listing.updatedAt)}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-300">{listing.description}</p>
                    {listing.rejectionReason ? (
                      <p className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        Lý do từ chối: {listing.rejectionReason}
                      </p>
                    ) : null}
                    {listing.moderationNote ? (
                      <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-zinc-300">
                        Ghi chú duyệt: {listing.moderationNote}
                      </p>
                    ) : null}
                    <div className="mt-4 grid gap-2 text-xs text-zinc-400 sm:grid-cols-4">
                      <span>Lượt xem: {listing.views.toLocaleString("vi-VN")}</span>
                      <span>Vào giỏ: {listing.cartAdds.toLocaleString("vi-VN")}</span>
                      <span>Mua: {listing.purchases.toLocaleString("vi-VN")}</span>
                      <span>Order item: {listing.orderCount.toLocaleString("vi-VN")}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                    <Link className={neutralButton} href={`/seller/listings/${listing.id}/edit`}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Sửa
                    </Link>
                    <form action={updateVisibilityAction}>
                      <input name="listingId" type="hidden" value={listing.id} />
                      <input
                        name="nextVisibility"
                        type="hidden"
                        value={listing.status === ListingStatus.HIDDEN ? "SHOW" : "HIDE"}
                      />
                      {listing.status === ListingStatus.HIDDEN ? (
                        <ConfirmSubmitButton className={secondaryButton} confirmMessage="Gửi listing này duyệt lại?">
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          Hiện lại
                        </ConfirmSubmitButton>
                      ) : (
                        <ConfirmSubmitButton className={dangerButton} confirmMessage="Ẩn listing này khỏi marketplace?">
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                          Ẩn
                        </ConfirmSubmitButton>
                      )}
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {data.listings.length === 0 ? (
            <div className="bv-card rounded-lg p-8 text-center">
              <p className="text-sm text-zinc-400">Chưa có listing phù hợp với bộ lọc.</p>
              <Link className={`${primaryButton} mt-4`} href="/seller/listings/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tạo listing đầu tiên
              </Link>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}

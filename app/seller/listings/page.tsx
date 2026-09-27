import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, EyeOff, Filter, Pencil, Plus, Search } from "lucide-react";
import { ListingStatus } from "@prisma/client";
import { getSellerListingsData, setSellerListingVisibility } from "@/actions/seller.actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { BookCover } from "@/components/shared/BookCover";
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
    <main className="bv-page bv-seller">
      <SellerHero
        action={
          data.gate.canSell ? (
            <Link className={primaryButton} href="/seller/listings/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Đăng bán sách
            </Link>
          ) : null
        }
        description="Đăng sách cũ và tự quản lý tin. Tin đủ thông tin được kiểm tra tự động và hiển thị ngay."
        title="Tin đăng của tôi"
      />

      {!data.gate.canSell ? (
        <SellerGatePanel gate={data.gate} />
      ) : (
        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <SellerNav />
          <SellerAlert message={params?.message} tone="success" />
          <SellerAlert message={params?.error} tone="error" />

          <form className="bv-card grid gap-3 rounded-2xl p-4 shadow-sm md:grid-cols-[1fr_220px_auto]" method="get">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bv-text-muted"
                aria-hidden="true"
              />
              <Input
                aria-label="Tìm tin bán sách của tôi"
                className="h-12 pl-10"
                defaultValue={data.filters.q}
                name="q"
                placeholder="Tìm tiêu đề, sách, mô tả..."
                type="search"
              />
            </div>
            <select aria-label="Lọc tin bán sách theo trạng thái" className={selectClass} defaultValue={data.filters.status} name="status">
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
              <article className="bv-card rounded-2xl p-5 shadow-sm" key={listing.id}>
                <div className="grid gap-4 lg:grid-cols-[120px_1fr_auto]">
                  <div className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-bv-surface lg:w-[120px]">
                    <BookCover
                      alt={listing.title}
                      author={listing.book?.author}
                      bookId={listing.book?.id ?? listing.id}
                      className="h-full w-full object-cover"
                      src={listing.book?.coverImage ?? listing.imageUrl}
                      title={listing.book?.title ?? listing.title}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="line-clamp-1 text-xl font-black text-bv-heading">{listing.title}</h2>
                      <StatusBadge label={listingStatusLabel(listing.status)} value={listing.status} />
                      <StatusBadge label={conditionLabel(listing.condition)} value={listing.condition} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-bv-text-muted">
                      <span className="font-bold text-bv-primary">{formatPrice(listing.price)}</span> · {listing.book?.title ?? "Không liên kết danh mục sách"} · Cập nhật{" "}
                      {formatDate(listing.updatedAt)}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-bv-heading/80">{listing.description}</p>
                    {listing.rejectionReason ? (
                      <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        Lý do từ chối: {listing.rejectionReason}
                      </p>
                    ) : null}
                    {listing.moderationNote ? (
                      <p className="mt-2 rounded-xl border border-bv-ink/10 bg-bv-surface px-3 py-2 text-sm text-bv-heading">
                        Ghi chú duyệt: {listing.moderationNote}
                      </p>
                    ) : null}
                    <div className="mt-4 grid gap-2 text-xs font-medium text-bv-text-muted sm:grid-cols-4">
                      <span>Lượt xem: {listing.views.toLocaleString("vi-VN")}</span>
                      <span>Vào giỏ: {listing.cartAdds.toLocaleString("vi-VN")}</span>
                      <span>Mua: {listing.purchases.toLocaleString("vi-VN")}</span>
                      <span>Đơn hàng: {listing.orderCount.toLocaleString("vi-VN")}</span>
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
                        <ConfirmSubmitButton className={secondaryButton} confirmMessage="Gửi tin này qua kiểm tra tự động để hiển thị lại?">
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          Hiện lại
                        </ConfirmSubmitButton>
                      ) : (
                        <ConfirmSubmitButton className={dangerButton} confirmMessage="Ẩn tin bán sách này khỏi marketplace?">
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
            <div className="bv-card rounded-2xl p-8 text-center shadow-sm">
              <p className="text-sm font-semibold text-bv-text-muted">Chưa có tin bán sách phù hợp với bộ lọc.</p>
              <Link className={`${primaryButton} mt-4`} href="/seller/listings/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tạo tin bán sách đầu tiên
              </Link>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}

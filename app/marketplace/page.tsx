import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, MessageCircle, Plus, ShieldCheck, ShoppingCart, Star } from "lucide-react";
import {
  addListingToCart,
  createDemoOrder,
  getMarketplacePageData,
} from "@/actions/marketplace.actions";
import { Badge } from "@/components/ui/badge";
import { BookCover } from "@/components/shared/BookCover";
import { MarketplaceFilters } from "@/components/marketplace/MarketplaceFilters";
import { Button } from "@/components/ui/button";
import { normalizeCatalogLanguageFilter } from "@/lib/book-language";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chợ sách | BookVerse AI",
  description: "Khám phá các tin bán sách đã được duyệt và mua sách qua luồng thanh toán demo BookVerse.",
};

interface MarketplacePageProps {
  searchParams?: Promise<{
    message?: string;
    error?: string;
    q?: string;
    condition?: string;
    language?: string;
  }>;
}

const conditionOptions = [
  { value: "", label: "Tất cả tình trạng" },
  { value: "NEW", label: "Mới" },
  { value: "LIKE_NEW", label: "Như mới" },
  { value: "GOOD", label: "Tốt" },
  { value: "FAIR", label: "Đã dùng" },
  { value: "POOR", label: "Cũ" },
  { value: "DIGITAL", label: "Ebook" },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function getConditionLabel(condition: string): string {
  switch (condition) {
    case "NEW":
      return "Mới";
    case "LIKE_NEW":
      return "Như mới";
    case "GOOD":
      return "Tốt";
    case "FAIR":
      return "Đã dùng";
    case "POOR":
      return "Cũ";
    case "DIGITAL":
      return "Ebook";
    default:
      return condition;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "APPROVED":
      return "Đã duyệt";
    case "PENDING_REVIEW":
      return "Chờ duyệt";
    case "SOLD":
      return "Đã bán";
    case "REJECTED":
      return "Từ chối";
    default:
      return status;
  }
}

async function addToCartAction(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listingId") ?? "");
  const result = await addListingToCart(listingId);

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect("/login?callbackUrl=/marketplace");
    }

    redirect(`/marketplace?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/marketplace?message=${encodeURIComponent(result.message)}`);
}

async function buyNowAction(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listingId") ?? "");
  const result = await createDemoOrder(listingId);

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect("/login?callbackUrl=/marketplace");
    }

    redirect(`/marketplace?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/cart?message=${encodeURIComponent(result.message)}`);
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = await searchParams;
  const query = params?.q ?? "";
  const condition = params?.condition ?? "";
  const language = normalizeCatalogLanguageFilter(params?.language) ?? "";
  const { listings, totalListings, visibleListings } = await getMarketplacePageData({
    query,
    condition,
    language,
  });

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-gold">
              Gian hàng sách BookVerse
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Mua bán và trao đổi sách</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bv-mint-soft">
              Chọn sách thật từ catalog BookVerse, xem tình trạng, thêm vào giỏ hoặc mua ngay.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/25 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10" href="/marketplace/messages">
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> Tin nhắn
            </Link>
            <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-bv-ivory px-4 py-2 text-sm font-bold text-[#0F3F3C] shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition hover:bg-bv-gold/95" href="/seller/listings/new">
              <Plus className="h-4 w-4" aria-hidden="true" /> Đăng bán sách
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {params?.message ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {params.message}
          </div>
        ) : null}

        {params?.error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}

        <MarketplaceFilters
          condition={condition}
          conditionOptions={conditionOptions}
          language={language}
          query={query}
        />

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-bv-text-muted">
            Hiển thị <span className="font-black text-bv-heading">{visibleListings}</span> /{" "}
            <span className="font-black text-bv-heading">
              {totalListings.toLocaleString("vi-VN")}
            </span>{" "}
            tin bán đang mở.
          </p>
          <Link className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-black text-bv-focus transition hover:bg-bv-muted hover:underline" href="/marketplace">
            Xóa bộ lọc
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="bv-card mt-6 rounded-lg p-8 text-center text-sm text-bv-text-muted">
            Chưa có sách phù hợp. Hãy thử từ khóa hoặc tình trạng khác.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <article
                className="overflow-hidden rounded-lg border border-[#17191F]/10 bg-bv-ivory shadow-[0_12px_34px_rgba(39,44,51,0.08)] transition hover:-translate-y-1 hover:border-bv-focus/30 hover:shadow-[0_22px_46px_rgba(39,44,51,0.12)]"
                key={listing.id}
              >
                <div className="flex gap-4 p-4">
                  <div className="aspect-[2/3] w-28 shrink-0 self-start overflow-hidden rounded-lg bg-[#EDE3D5] shadow-[0_12px_26px_rgba(39,44,51,0.12)]">
                    <BookCover
                      alt={`Bìa sách ${listing.book?.title ?? listing.title}`}
                      author={listing.book?.author}
                      bookId={listing.book?.id ?? listing.id}
                      category={listing.book?.category}
                      className="h-full w-full object-cover"
                      src={listing.images[0] ?? listing.book?.coverImage}
                      title={listing.book?.title ?? listing.title}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge className="bg-bv-focus text-bv-ivory">
                        {getConditionLabel(listing.condition)}
                      </Badge>
                      <Badge
                        className={
                          listing.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                          }
                      >
                        {getStatusLabel(listing.status)}
                      </Badge>
                      {listing.sellerQualityScore.isHighQuality ? (
                        <Badge className="gap-1 bg-bv-gold text-bv-heading">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Chất lượng cao theo quy tắc
                        </Badge>
                      ) : null}
                    </div>

                    <h2 className="line-clamp-2 text-lg font-black text-bv-heading">
                      {listing.title}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-bv-text-muted">
                      Người bán: <span className="font-medium">{listing.seller.name}</span>
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg border border-[#17191F]/10 bg-bv-surface p-3 text-xs">
                      <div>
                        <p className="text-bv-text-muted">Điểm chất lượng</p>
                        <p className="mt-1 inline-flex items-center gap-1 font-black text-[#8A5C00]">
                          <Star className="h-3.5 w-3.5 fill-bv-gold text-bv-gold" aria-hidden="true" />
                          {listing.sellerQualityScore.score}/100
                        </p>
                      </div>
                      <div>
                        <p className="text-bv-text-muted">Đơn tốt</p>
                        <p className="mt-1 font-black text-bv-heading">
                          {listing.sellerQualityScore.completedOrders}
                        </p>
                      </div>
                      <div>
                        <p className="text-bv-text-muted">Đơn hủy</p>
                        <p className="mt-1 font-black text-bv-heading">
                          {listing.sellerQualityScore.cancelledOrders}
                        </p>
                      </div>
                    </div>
                    {listing.book ? (
                      <p className="mt-1 text-sm font-medium text-bv-text-muted">
                        Sách gốc: {listing.book.title} - {listing.book.category}
                      </p>
                    ) : null}
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#42524D]">
                      {listing.description}
                    </p>
                    <p className="mt-3 text-lg font-black text-bv-accent">{formatPrice(listing.price)}</p>
                  </div>
                </div>

                {listing.images.length > 1 ? (
                  <div className="flex gap-2 overflow-x-auto border-t border-[#17191F]/10 px-4 py-3" aria-label="Ảnh tình trạng sách">
                    {listing.images.slice(1).map((image, index) => (
                      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md border border-black/10 bg-bv-muted" key={`${image}-${index}`}>
                        <BookCover className="h-full w-full object-cover" src={image} title={`${listing.title} - ảnh ${index + 2}`} bookId={`${listing.id}-${index}`} />
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="grid grid-cols-3 gap-2 border-t border-[#17191F]/10 bg-bv-surface p-4 text-sm">
                  <div>
                    <p className="font-black text-bv-heading">{listing.views}</p>
                    <p className="text-bv-text-muted">Lượt xem</p>
                  </div>
                  <div>
                    <p className="font-black text-bv-heading">{listing.cartAdds}</p>
                    <p className="text-bv-text-muted">Vào giỏ</p>
                  </div>
                  <div>
                    <p className="font-black text-bv-heading">{listing.purchases}</p>
                    <p className="text-bv-text-muted">Mua</p>
                  </div>
                </div>

                <div className="grid gap-2 p-4 sm:grid-cols-3">
                  <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-bv-focus/30 px-3 py-2 text-sm font-black text-bv-focus transition hover:bg-bv-focus/5" href={`/marketplace/messages/new?listingId=${listing.id}`}>
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> Nhắn người bán
                  </Link>
                  <form action={addToCartAction}>
                    <input name="listingId" type="hidden" value={listing.id} />
                    <Button
                      className="w-full gap-2"
                      disabled={listing.status !== "APPROVED"}
                      type="submit"
                      variant="outline"
                    >
                      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                      Thêm giỏ
                    </Button>
                  </form>

                  <form action={buyNowAction}>
                    <input name="listingId" type="hidden" value={listing.id} />
                    <Button
                      className="w-full gap-2"
                      disabled={listing.status !== "APPROVED"}
                      type="submit"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Mua ngay
                    </Button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

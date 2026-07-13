import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Save } from "lucide-react";
import { ListingCondition, ListingStatus } from "@prisma/client";
import {
  getSellerListingEditorData,
  setSellerListingVisibility,
  updateSellerListing,
} from "@/actions/seller.actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { Input } from "@/components/ui/input";
import {
  conditionLabel,
  dangerButton,
  formatDate,
  formatPrice,
  listingStatusLabel,
  primaryButton,
  secondaryButton,
  selectClass,
  SellerAlert,
  SellerGatePanel,
  SellerHero,
  SellerNav,
  StatusBadge,
  textareaClass,
} from "@/app/seller/_components/seller-ui";

export const dynamic = "force-dynamic";

interface EditSellerListingPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
}

async function updateListingAction(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listingId") ?? "");
  const result = await updateSellerListing(listingId, {
    bookId: String(formData.get("bookId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: String(formData.get("price") ?? ""),
    condition: String(formData.get("condition") ?? ""),
    targetAudience: String(formData.get("targetAudience") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
  });

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect(`/login?callbackUrl=/seller/listings/${encodeURIComponent(listingId)}/edit`);
    }

    if (result.reason === "FORBIDDEN") {
      redirect("/seller/apply");
    }

    redirect(`/seller/listings/${encodeURIComponent(listingId)}/edit?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/seller/listings/${encodeURIComponent(listingId)}/edit?message=${encodeURIComponent(result.message)}`);
}

async function updateVisibilityAction(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listingId") ?? "");
  const nextVisibility = String(formData.get("nextVisibility") ?? "") as "HIDE" | "SHOW";
  const result = await setSellerListingVisibility(listingId, nextVisibility);

  if (!result.success) {
    redirect(`/seller/listings/${encodeURIComponent(listingId)}/edit?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/seller/listings/${encodeURIComponent(listingId)}/edit?message=${encodeURIComponent(result.message)}`);
}

export default async function EditSellerListingPage({ params, searchParams }: EditSellerListingPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await getSellerListingEditorData(id);

  if (data.gate.status === "SELLER" && !data.listing) {
    notFound();
  }

  const listing = data.listing;

  return (
    <main className="bv-page">
      <SellerHero
        description="Cập nhật listing của chính seller hiện tại. Nếu listing đã được duyệt, việc sửa nội dung sẽ chuyển về trạng thái chờ duyệt."
        title="Sửa listing"
      />

      {data.gate.status !== "SELLER" || !listing ? (
        <SellerGatePanel gate={data.gate} />
      ) : (
        <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <SellerNav />

          <form action={updateListingAction} className="bv-card rounded-lg p-6">
            <input name="listingId" type="hidden" value={listing.id} />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">Listing seller</p>
                  <StatusBadge label={listingStatusLabel(listing.status)} value={listing.status} />
                </div>
                <h1 className="mt-2 text-2xl font-black text-white">{listing.title}</h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Tạo {formatDate(listing.createdAt)} - Cập nhật {formatDate(listing.updatedAt)}
                </p>
              </div>
              <Link className={secondaryButton} href="/seller/listings">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Danh sách
              </Link>
            </div>

            <div className="grid gap-3">
              <SellerAlert message={query?.message} tone="success" />
              <SellerAlert message={query?.error} tone="error" />
            </div>

            {listing.status === ListingStatus.APPROVED || listing.status === ListingStatus.REJECTED ? (
              <p className="mt-5 rounded-lg border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                Nếu bấm lưu, listing sẽ chuyển về chờ admin duyệt lại.
              </p>
            ) : null}

            {listing.rejectionReason ? (
              <p className="mt-5 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                Lý do từ chối: {listing.rejectionReason}
              </p>
            ) : null}

            <div className="mt-6 grid gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-white" htmlFor="bookId">
                  Liên kết sách trong catalog
                </label>
                <select className={selectClass} defaultValue={listing.book?.id ?? ""} id="bookId" name="bookId">
                  <option value="">Không liên kết sách có sẵn</option>
                  {data.bookOptions.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} - {book.author}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-white" htmlFor="title">
                  Tiêu đề listing
                </label>
                <Input id="title" maxLength={180} name="title" required defaultValue={listing.title} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-white" htmlFor="price">
                    Giá bán
                  </label>
                  <Input
                    id="price"
                    min={1000}
                    name="price"
                    required
                    type="number"
                    defaultValue={String(Math.round(listing.price))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-white" htmlFor="condition">
                    Tình trạng
                  </label>
                  <select className={selectClass} defaultValue={listing.condition} id="condition" name="condition">
                    {Object.values(ListingCondition).map((condition) => (
                      <option key={condition} value={condition}>
                        {conditionLabel(condition)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-white" htmlFor="targetAudience">
                    Nhóm độc giả mục tiêu
                  </label>
                  <Input id="targetAudience" name="targetAudience" defaultValue={listing.targetAudience ?? ""} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-white" htmlFor="imageUrl">
                    URL ảnh bìa hoặc ảnh tình trạng
                  </label>
                  <Input id="imageUrl" name="imageUrl" placeholder="https://... hoặc /covers/..." defaultValue={listing.imageUrl ?? ""} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-white" htmlFor="description">
                  Mô tả
                </label>
                <textarea
                  className={textareaClass}
                  id="description"
                  maxLength={2000}
                  name="description"
                  required
                  defaultValue={listing.description ?? ""}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <div className="flex flex-wrap gap-3">
                <p className="inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-[#F2C14E]">
                  {formatPrice(listing.price)}
                </p>
                <button className={primaryButton} type="submit">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </form>

          <form action={updateVisibilityAction} className="bv-card flex flex-wrap items-center justify-between gap-3 rounded-lg p-5">
            <div>
              <h2 className="font-black text-white">Hiển thị listing</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Ẩn listing khỏi marketplace hoặc gửi lại quy trình duyệt nếu listing đang bị ẩn.
              </p>
            </div>
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
                Ẩn listing
              </ConfirmSubmitButton>
            )}
          </form>
        </section>
      )}
    </main>
  );
}

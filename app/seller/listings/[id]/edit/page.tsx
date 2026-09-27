import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Save } from "lucide-react";
import { ListingCondition, ListingStatus } from "@prisma/client";
import {
  getSellerGateData,
  getSellerListingEditorData,
  setSellerListingVisibility,
  updateSellerListing,
} from "@/actions/seller.actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { ListingImageUploadField } from "@/components/seller/ListingImageUploadField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Input } from "@/components/ui/input";
import { prepareListingUpload, storeListingUpload } from "@/lib/listing-upload";
import { MAX_LISTING_IMAGES } from "@/lib/listing-upload-policy";
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
  const gate = await getSellerGateData();
  if (!gate.authenticated || !gate.user) {
    redirect(`/login?callbackUrl=/seller/listings/${encodeURIComponent(listingId)}/edit`);
  }
  if (!gate.canSell) {
    redirect(`/seller?error=${encodeURIComponent("Tài khoản chưa được phép bán sách.")}`);
  }

  const existingImageUrls = formData
    .getAll("existingImageUrls")
    .map((item) => String(item).trim())
    .filter(Boolean);

  const rawImageFiles = formData.getAll("imageFiles");
  const imageFiles = rawImageFiles.filter((item): item is File => item instanceof File && item.size > 0);

  const uploadedUrls: string[] = [];
  const remainingSlots = Math.max(0, MAX_LISTING_IMAGES - existingImageUrls.length);

  for (const file of imageFiles.slice(0, remainingSlots)) {
    try {
      const prepared = await prepareListingUpload(file);
      const url = await storeListingUpload(gate.user.id, prepared);
      uploadedUrls.push(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tệp ảnh không hợp lệ.";
      redirect(`/seller/listings/${encodeURIComponent(listingId)}/edit?error=${encodeURIComponent(msg)}`);
    }
  }

  const finalImageUrls = [...existingImageUrls, ...uploadedUrls].slice(0, MAX_LISTING_IMAGES);

  const result = await updateSellerListing(listingId, {
    bookId: String(formData.get("bookId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: String(formData.get("price") ?? ""),
    condition: String(formData.get("condition") ?? ""),
    targetAudience: String(formData.get("targetAudience") ?? ""),
    imageUrls: finalImageUrls,
  });

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect(`/login?callbackUrl=/seller/listings/${encodeURIComponent(listingId)}/edit`);
    }

    if (result.reason === "FORBIDDEN") {
      redirect(`/seller?error=${encodeURIComponent(result.message)}`);
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

  if (data.gate.canSell && !data.listing) {
    notFound();
  }

  const listing = data.listing;

  return (
    <main className="bv-page bv-seller">
      <SellerHero
        description="Cập nhật tin bán của chính bạn. Sau khi lưu, hệ thống tự kiểm tra lại chất lượng và chỉ chuyển ngoại lệ cho admin."
        title="Sửa tin bán sách"
      />

      {!data.gate.canSell || !listing ? (
        <SellerGatePanel gate={data.gate} />
      ) : (
        <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <SellerNav />

          <form action={updateListingAction} className="bv-card rounded-2xl p-6 shadow-sm">
            <input name="listingId" type="hidden" value={listing.id} />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-bv-ink/10 pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-primary">Tin bán sách</p>
                  <StatusBadge label={listingStatusLabel(listing.status)} value={listing.status} />
                </div>
                <h1 className="mt-2 text-2xl font-black text-bv-heading">{listing.title}</h1>
                <p className="mt-1 text-sm text-bv-text-muted">
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
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Sau khi lưu, tin đủ thông tin sẽ tiếp tục hiển thị; tin thiếu dữ liệu sẽ vào hàng chờ kiểm tra ngoại lệ.
              </p>
            ) : null}

            {listing.rejectionReason ? (
              <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Lý do từ chối: {listing.rejectionReason}
              </p>
            ) : null}

            <div className="mt-6 grid gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-bv-heading" htmlFor="bookId">
                  Chọn sách có sẵn trong BookVerse <span className="font-normal text-bv-text-muted">(không bắt buộc)</span>
                </label>
                <p className="text-sm leading-6 text-bv-text-muted" id="bookId-help">
                  Lựa chọn này giúp tin bán hiển thị đúng tác giả, ảnh bìa và đường dẫn tới trang sách. BookVerse không
                  tham gia sở hữu hay bán thay cuốn sách của bạn.
                </p>
                <select
                  aria-describedby="bookId-help bookId-note"
                  className={selectClass}
                  defaultValue={listing.book?.id ?? ""}
                  id="bookId"
                  name="bookId"
                >
                  <option value="">Không tìm thấy sách - dùng thông tin và ảnh do tôi cung cấp</option>
                  {data.bookOptions.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} - {book.author}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-5 text-bv-text-muted" id="bookId-note">
                  Khi không chọn sách có sẵn, hãy giữ ít nhất một ảnh thể hiện rõ cuốn sách và tình trạng thực tế.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-bv-heading" htmlFor="title">
                  Tiêu đề tin bán sách
                </label>
                <Input id="title" maxLength={180} name="title" required defaultValue={listing.title} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-bv-heading" htmlFor="price">
                    Giá bán (VNĐ)
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
                  <label className="text-sm font-bold text-bv-heading" htmlFor="condition">
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

              <div className="space-y-2">
                <label className="text-sm font-bold text-bv-heading" htmlFor="targetAudience">
                  Nhóm độc giả mục tiêu
                </label>
                <Input id="targetAudience" name="targetAudience" defaultValue={listing.targetAudience ?? ""} />
              </div>

              <div className="rounded-xl border border-bv-ink/10 bg-bv-surface/50 p-4 sm:p-5">
                <ListingImageUploadField initialImages={listing.imageUrls} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-bv-heading" htmlFor="description">
                  Mô tả chi tiết
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

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-bv-ink/10 pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="inline-flex h-11 items-center rounded-xl border border-bv-primary/20 bg-bv-mint px-4 text-sm font-black text-bv-primary">
                  {formatPrice(listing.price)}
                </p>
                <SubmitButton
                  className={primaryButton}
                  pendingLabel="Đang lưu thay đổi..."
                  size="default"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Lưu thay đổi
                </SubmitButton>
              </div>
            </div>
          </form>

          <form action={updateVisibilityAction} className="bv-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5 shadow-sm">
            <div>
              <h2 className="font-black text-bv-heading">Hiển thị tin bán sách</h2>
              <p className="mt-1 text-sm text-bv-text-muted">
                Ẩn tin bán sách khỏi marketplace hoặc gửi lại quy trình duyệt nếu tin bán sách đang bị ẩn.
              </p>
            </div>
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
                Ẩn tin bán sách
              </ConfirmSubmitButton>
            )}
          </form>
        </section>
      )}
    </main>
  );
}

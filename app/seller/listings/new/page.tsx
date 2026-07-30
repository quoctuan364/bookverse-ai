import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { ListingCondition } from "@prisma/client";
import { createSellerListing, getSellerListingEditorData } from "@/actions/seller.actions";
import { Input } from "@/components/ui/input";
import {
  conditionLabel,
  primaryButton,
  secondaryButton,
  selectClass,
  SellerAlert,
  SellerGatePanel,
  SellerHero,
  SellerNav,
  textareaClass,
} from "@/app/seller/_components/seller-ui";

export const dynamic = "force-dynamic";

interface NewSellerListingPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

async function createListingAction(formData: FormData) {
  "use server";

  const result = await createSellerListing({
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
      redirect("/login?callbackUrl=/seller/listings/new");
    }

    if (result.reason === "FORBIDDEN") {
      redirect("/seller/apply");
    }

    redirect(`/seller/listings/new?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/seller/listings?message=${encodeURIComponent(result.message)}`);
}

export default async function NewSellerListingPage({ searchParams }: NewSellerListingPageProps) {
  const [params, data] = await Promise.all([searchParams, getSellerListingEditorData()]);

  return (
    <main className="bv-page bv-seller">
      <SellerHero
        description="Listing mới được tạo ở trạng thái chờ duyệt. Admin duyệt xong thì listing mới xuất hiện ở marketplace."
        title="Tạo listing seller"
      />

      {data.gate.status !== "SELLER" ? (
        <SellerGatePanel gate={data.gate} />
      ) : (
        <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <SellerNav />
          <form action={createListingAction} className="bv-card rounded-lg p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">Listing mới</p>
                <h2 className="mt-2 text-2xl font-black text-white">Thông tin sách đăng bán</h2>
              </div>
              <Link className={secondaryButton} href="/seller/listings">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Quay lại
              </Link>
            </div>

            <SellerAlert message={params?.error} tone="error" />

            <div className="mt-5 grid gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-white" htmlFor="bookId">
                  Liên kết sách trong catalog
                </label>
                <select className={selectClass} id="bookId" name="bookId">
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
                <Input
                  id="title"
                  maxLength={180}
                  name="title"
                  placeholder="Ví dụ: Sách thiết kế hệ thống còn mới 90%"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-white" htmlFor="price">
                    Giá bán
                  </label>
                  <Input id="price" min={1000} name="price" placeholder="120000" required type="number" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-white" htmlFor="condition">
                    Tình trạng
                  </label>
                  <select className={selectClass} defaultValue={ListingCondition.GOOD} id="condition" name="condition">
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
                  <Input
                    id="targetAudience"
                    name="targetAudience"
                    placeholder="Ví dụ: sinh viên CNTT, người mới đi làm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-white" htmlFor="imageUrl">
                    URL ảnh bìa hoặc ảnh tình trạng
                  </label>
                  <Input id="imageUrl" name="imageUrl" placeholder="https://... hoặc /covers/..." />
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
                  placeholder="Mô tả tình trạng sách, trang bị ghi chú, góc bìa, lý do bán và khu vực giao hàng..."
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button className={primaryButton} type="submit">
                <Send className="h-4 w-4" aria-hidden="true" />
                Gửi duyệt listing
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}

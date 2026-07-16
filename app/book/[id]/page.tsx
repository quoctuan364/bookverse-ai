import { notFound } from "next/navigation";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CheckCircle2, Heart, MessageSquarePlus, ShoppingCart, Star } from "lucide-react";
import { createBookReview, getBookById } from "@/actions/book-detail.actions";
import { toggleFavoriteBook } from "@/actions/library.actions";
import { addListingToCart, createDemoOrder } from "@/actions/marketplace.actions";
import { BookViewTracker } from "@/components/shared/BookViewTracker";
import { ReviewSection } from "@/components/shared/ReviewSection";
import { BookCover } from "@/components/shared/BookCover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
}

export const dynamic = "force-dynamic";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatBookFormat(format: string): string {
  switch (format) {
    case "PAPER":
      return "Sách giấy";
    case "BOTH":
      return "Ebook và sách giấy";
    default:
      return "Ebook";
  }
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

async function addBookListingToCartAction(formData: FormData) {
  "use server";

  const bookId = String(formData.get("bookId") ?? "");
  const listingId = String(formData.get("listingId") ?? "");
  const result = await addListingToCart(listingId);

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect(`/login?callbackUrl=/book/${encodeURIComponent(bookId)}`);
    }

    redirect(`/book/${encodeURIComponent(bookId)}?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/book/${encodeURIComponent(bookId)}?message=${encodeURIComponent(result.message)}`);
}

async function buyBookListingNowAction(formData: FormData) {
  "use server";

  const bookId = String(formData.get("bookId") ?? "");
  const listingId = String(formData.get("listingId") ?? "");
  const result = await createDemoOrder(listingId);

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect(`/login?callbackUrl=/book/${encodeURIComponent(bookId)}`);
    }

    redirect(`/book/${encodeURIComponent(bookId)}?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/cart?message=${encodeURIComponent(result.message)}`);
}

async function toggleFavoriteAction(formData: FormData) {
  "use server";

  const bookId = String(formData.get("bookId") ?? "");
  const result = await toggleFavoriteBook(bookId);

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect(`/login?callbackUrl=/book/${encodeURIComponent(bookId)}`);
    }

    redirect(`/book/${encodeURIComponent(bookId)}?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/book/${encodeURIComponent(bookId)}?message=${encodeURIComponent(result.message)}`);
}

async function submitReviewAction(formData: FormData) {
  "use server";

  const bookId = String(formData.get("bookId") ?? "");
  const result = await createBookReview(
    bookId,
    Number(formData.get("rating") ?? 5),
    String(formData.get("reviewText") ?? ""),
  );

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect(`/login?callbackUrl=/book/${encodeURIComponent(bookId)}`);
    }

    redirect(`/book/${encodeURIComponent(bookId)}?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/book/${encodeURIComponent(bookId)}?message=${encodeURIComponent(result.message)}`);
}

export default async function BookDetailPage({ params, searchParams }: BookDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const book = await getBookById(id);

  if (!book) {
    notFound();
  }

  const details = [
    { label: "Danh mục", value: book.category.name },
    { label: "Định dạng", value: formatBookFormat(book.format) },
    { label: "Số trang", value: book.pages ? `${book.pages} trang` : "Đang cập nhật" },
    { label: "Năm xuất bản", value: book.publishYear?.toString() ?? "Đang cập nhật" },
    { label: "Nhà xuất bản", value: "BookVerse AI" },
    { label: "Giá ebook", value: formatPrice(book.price) },
  ];

  return (
    <main className="bv-page">
      <BookViewTracker bookId={book.id} />
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-12">
          <aside className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-[#17191F]/10 bg-[#EDE3D5] shadow-[0_24px_55px_rgba(39,44,51,0.16)]">
              <BookCover
                alt={`Bìa sách ${book.title}`}
                author={book.author}
                bookId={book.id}
                category={book.category.name}
                className="aspect-[2/3] h-full w-full object-cover"
                src={book.coverImage}
                title={book.title}
              />
            </div>

            <div className="grid gap-3">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 text-base font-bold text-white shadow-[0_12px_28px_rgba(15,118,110,0.22)] transition hover:bg-[#0F5F59]"
                href={`/read/${book.id}`}
              >
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                Đọc thử
              </Link>
              <form action={toggleFavoriteAction}>
                <input name="bookId" type="hidden" value={book.id} />
                <Button className="h-12 w-full gap-2 text-base" type="submit" variant="outline">
                  <Heart
                    className={cn("h-5 w-5", book.isFavorite && "fill-[#E76F51] text-[#E76F51]")}
                    aria-hidden="true"
                  />
                  {book.isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
                </Button>
              </form>
              {book.availableListing ? (
                <>
                  <form action={addBookListingToCartAction}>
                    <input name="bookId" type="hidden" value={book.id} />
                    <input name="listingId" type="hidden" value={book.availableListing.id} />
                    <Button className="h-12 w-full gap-2 text-base" type="submit" variant="outline">
                      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                      Thêm vào giỏ
                    </Button>
                  </form>
                  <form action={buyBookListingNowAction}>
                    <input name="bookId" type="hidden" value={book.id} />
                    <input name="listingId" type="hidden" value={book.availableListing.id} />
                    <Button
                      className="h-12 w-full gap-2 bg-[#E76F51] text-white shadow-[0_12px_28px_rgba(231,111,81,0.22)] hover:bg-[#CC5D42]"
                      type="submit"
                    >
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      Mua demo
                    </Button>
                  </form>
                </>
              ) : (
                <Button className="h-12 gap-2 text-base" disabled variant="outline">
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  Chưa có tin bán
                </Button>
              )}
            </div>
          </aside>

          <section className="bv-card rounded-lg p-6 sm:p-8">
            {query?.message ? (
              <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {query.message}
              </div>
            ) : null}

            {query?.error ? (
              <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {query.error}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#EAF2EF] px-3 py-1 text-sm font-bold text-[#0F3F3C]">
                {book.category.name}
              </span>
              {book.rating ? (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-[#17202A]">
                  <Star className="h-4 w-4 fill-[#F2C14E] text-[#F2C14E]" aria-hidden="true" />
                  {book.rating.toFixed(1)}
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-[#17202A] sm:text-4xl lg:text-5xl">
              {book.title}
            </h1>
            <p className="mt-3 text-lg font-medium text-[#66706B]">{book.author}</p>

            <div className="mt-6 rounded-lg border border-[#17191F]/10 bg-[#F7F4ED] p-5">
              <p className="text-2xl font-black text-[#E76F51]">{formatPrice(book.price)}</p>
              {book.availableListing ? (
                <p className="mt-2 text-sm font-medium text-[#66706B]">
                  Chợ sách cũ khả dụng: {formatPrice(book.availableListing.price)} -{" "}
                  {getConditionLabel(book.availableListing.condition)}
                </p>
              ) : (
                <p className="mt-2 text-sm font-medium text-[#66706B]">
                  Sách hiện chưa có tin bán được duyệt để mua demo.
                </p>
              )}
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-black text-[#17202A]">Mô tả sách</h2>
              <p className="mt-3 leading-8 text-[#42524D]">
                {book.description ?? "Cuốn sách này chưa có mô tả chi tiết."}
              </p>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-black text-[#17202A]">Thông tin chi tiết</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {details.map((item) => (
                  <div className="rounded-lg border border-[#17191F]/10 bg-[#FFFDF8] p-4" key={item.label}>
                    <dt className="text-sm font-medium text-[#66706B]">{item.label}</dt>
                    <dd className="mt-1 font-black text-[#17202A]">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-center gap-2">
            <MessageSquarePlus className="h-6 w-6 text-[#E76F51]" aria-hidden="true" />
            <h2 className="text-2xl font-black text-[#17202A]">Đánh giá từ cộng đồng</h2>
          </div>
          <form
            action={submitReviewAction}
            className="bv-card mb-5 rounded-lg p-5"
          >
            <input name="bookId" type="hidden" value={book.id} />
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div>
                <label className="text-sm font-bold text-[#17202A]" htmlFor="rating">
                  Số sao
                </label>
                <select
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm font-medium text-[#17202A] outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/30"
                  defaultValue="5"
                  id="rating"
                  name="rating"
                >
                  <option value="5">5 sao</option>
                  <option value="4">4 sao</option>
                  <option value="3">3 sao</option>
                  <option value="2">2 sao</option>
                  <option value="1">1 sao</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-[#17202A]" htmlFor="reviewText">
                  Nội dung đánh giá
                </label>
                <textarea
                  className={cn(
                    "mt-2 min-h-24 w-full resize-y rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-3 text-sm leading-6 text-[#17202A] outline-none transition placeholder:text-[#7C8581] focus-visible:ring-2 focus-visible:ring-[#0F766E]/30",
                  )}
                  id="reviewText"
                  name="reviewText"
                  placeholder="Viết cảm nhận ngắn về nội dung, độ hữu ích hoặc trải nghiệm đọc..."
                  required
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit">
                Gửi đánh giá
              </Button>
            </div>
          </form>
          <ReviewSection reviews={book.reviews} />
        </section>
      </div>
    </main>
  );
}

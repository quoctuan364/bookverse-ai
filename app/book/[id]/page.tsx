import { notFound } from "next/navigation";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  BookCopy,
  BookMarked,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Crown,
  Heart,
  MessageSquarePlus,
  ShoppingCart,
  Star,
  UsersRound,
} from "lucide-react";
import { createBookReview, getBookById, getRelatedBooks } from "@/actions/book-detail.actions";
import { toggleFavoriteBook } from "@/actions/library.actions";
import { addListingToCart, createDemoOrder } from "@/actions/marketplace.actions";
import { BookCard } from "@/components/shared/BookCard";
import { BookShareButton } from "@/components/shared/BookShareButton";
import { SubmitButton } from "@/components/shared/SubmitButton";
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

function formatLanguage(language: string): string {
  const labels: Record<string, string> = {
    eng: "Tiếng Anh",
    vie: "Tiếng Việt",
    fra: "Tiếng Pháp",
    deu: "Tiếng Đức",
    spa: "Tiếng Tây Ban Nha",
  };

  return labels[language.toLowerCase()] ?? language;
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

  const isCurated = Boolean(book.sourceMetadata);
  const salePrice = book.availableListing?.price ?? book.price;
  const relatedBooks = await getRelatedBooks(book.id, book.category.id, isCurated);
  const reviewAverage =
    book.reviews.length > 0
      ? book.reviews.reduce((total, review) => total + review.rating, 0) / book.reviews.length
      : book.rating;
  const details = [
    { label: "Danh mục", value: book.category.name },
    { label: "Định dạng", value: formatBookFormat(book.format) },
    { label: "Số trang", value: book.pages ? `${book.pages} trang` : "Đang cập nhật" },
    { label: "Năm xuất bản", value: book.publishYear?.toString() ?? "Đang cập nhật" },
    { label: "Nhà xuất bản", value: book.sourceMetadata?.publisher ?? (isCurated ? "Đang cập nhật" : "BookVerse AI") },
    ...(isCurated
      ? [
          { label: "ISBN", value: book.sourceMetadata?.isbn ?? "Đang cập nhật" },
          {
            label: "Ngôn ngữ",
            value: book.sourceMetadata?.languages.map(formatLanguage).join(", ") || "Đang cập nhật",
          },
        ]
      : []),
    { label: isCurated ? "Giá bán" : "Giá ebook", value: formatPrice(salePrice) },
  ];

  return (
    <main className="bv-page">
      <BookViewTracker bookId={book.id} />
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Đường dẫn" className="mb-7 flex flex-wrap items-center gap-2 text-sm text-[#687083]">
          <Link className="font-semibold transition hover:text-[#176B62]" href="/">Trang chủ</Link>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <Link className="font-semibold transition hover:text-[#176B62]" href={`/catalog?q=${encodeURIComponent(book.category.name)}`}>
            {book.category.name}
          </Link>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span aria-current="page" className="max-w-56 truncate font-semibold text-[#1D2433]">{book.title}</span>
        </nav>
        <section className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-12">
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-[#1D2433]/10 bg-[#EDE3D5] shadow-[0_24px_55px_rgba(39,44,51,0.16)]">
              <BookCover
                alt={`Bìa sách ${book.title}`}
                author={book.author}
                bookId={book.id}
                category={book.category.name}
                className="aspect-[2/3] h-full w-full object-cover"
                src={book.coverImage}
                title={book.title}
                useBookVerseArtwork={isCurated}
              />
            </div>

            <div className="grid gap-3">
              <Link
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 text-base font-bold text-white shadow-[0_12px_28px_rgba(15,118,110,0.22)] transition hover:bg-[#0F5F59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] focus-visible:ring-offset-2"
                href={`/read/${book.id}`}
              >
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                Đọc thử ngay
              </Link>
              <p className="rounded-xl border border-[#176B62]/15 bg-[#E6F3F0] px-4 py-3 text-sm leading-6 text-[#0F3F3C]">
                Đọc thử miễn phí tối đa 10%. Gói hội viên đang hoạt động mở toàn bộ kho sách.
              </p>
              <form action={toggleFavoriteAction}>
                <input name="bookId" type="hidden" value={book.id} />
                <SubmitButton className="h-12 w-full gap-2 text-base" pendingLabel="Đang cập nhật..." variant="outline">
                  <Heart
                    className={cn("h-5 w-5", book.isFavorite && "fill-[#E76F51] text-[#E76F51]")}
                    aria-hidden="true"
                  />
                  {book.isFavorite ? "Bỏ khỏi thư viện" : "Lưu vào thư viện"}
                </SubmitButton>
              </form>
              {book.availableListing ? (
                <>
                  <form action={addBookListingToCartAction}>
                    <input name="bookId" type="hidden" value={book.id} />
                    <input name="listingId" type="hidden" value={book.availableListing.id} />
                    <SubmitButton className="h-12 w-full gap-2 text-base" pendingLabel="Đang thêm..." variant="outline">
                      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                      Thêm vào giỏ
                    </SubmitButton>
                  </form>
                  <form action={buyBookListingNowAction}>
                    <input name="bookId" type="hidden" value={book.id} />
                    <input name="listingId" type="hidden" value={book.availableListing.id} />
                    <SubmitButton
                      className="h-12 w-full gap-2 bg-[#E76F51] text-white shadow-[0_12px_28px_rgba(231,111,81,0.22)] hover:bg-[#CC5D42]"
                      pendingLabel="Đang xử lý..."
                    >
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      Mua ngay
                    </SubmitButton>
                  </form>
                </>
              ) : (
                <Button className="h-12 gap-2 text-base" disabled variant="outline">
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  Tạm hết hàng
                </Button>
              )}
              <BookShareButton title={book.title} />
            </div>
          </aside>

          <section className="bv-card rounded-2xl p-6 sm:p-8">
            {query?.message ? (
              <div aria-live="polite" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                {query.message}
              </div>
            ) : null}

            {query?.error ? (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {query.error}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#EAF2EF] px-3 py-1 text-sm font-bold text-[#0F3F3C]">
                {book.category.name}
              </span>
              {isCurated ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF2EF] px-3 py-1 text-sm font-bold text-[#0F3F3C]">
                  <BookMarked className="h-4 w-4" aria-hidden="true" /> Sách tuyển chọn
                </span>
              ) : null}
              {book.sourceMetadata?.isVietnameseEdition ? (
                <span className="rounded-full bg-[#FFF1D6] px-3 py-1 text-sm font-bold text-[#7A4D00]">Ấn bản tiếng Việt</span>
              ) : null}
              {book.isInMembership ? (
                <Link className="inline-flex items-center gap-1 rounded-full bg-[#F2C14E]/20 px-3 py-1 text-sm font-black text-[#7A4D00]" href="/membership">
                  <Crown className="h-4 w-4" aria-hidden="true" /> Có trong gói hội viên
                </Link>
              ) : null}
              {!isCurated && book.rating ? (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-[#17202A]">
                  <Star className="h-4 w-4 fill-[#F2C14E] text-[#F2C14E]" aria-hidden="true" />
                  {book.rating.toFixed(1)}
                </span>
              ) : null}
            </div>

            <h1 className="bv-editorial mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-[#1D2433] sm:text-5xl lg:text-6xl">
              {book.title}
            </h1>
            <p className="mt-3 text-lg font-medium text-[#66706B]">{book.author}</p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#176B62]/15 bg-[#EAF2EF] p-4">
                <Star className="h-5 w-5 fill-[#F2C14E] text-[#B17700]" aria-hidden="true" />
                <p className="mt-3 text-xl font-black text-[#17202A]">
                  {reviewAverage ? reviewAverage.toFixed(1) : "Mới"}
                </p>
                <p className="mt-1 text-xs font-bold text-[#56645F]">
                  {book.reviews.length > 0 ? `${book.reviews.length} đánh giá` : "Chưa có đánh giá"}
                </p>
              </div>
              <div className="rounded-xl border border-[#176B62]/15 bg-[#FFFDF8] p-4">
                <BookCopy className="h-5 w-5 text-[#176B62]" aria-hidden="true" />
                <p className="mt-3 text-xl font-black text-[#17202A]">
                  {book.pages ? book.pages.toLocaleString("vi-VN") : "—"}
                </p>
                <p className="mt-1 text-xs font-bold text-[#66706B]">Số trang</p>
              </div>
              <div className="rounded-xl border border-[#C65D43]/15 bg-[#FFF0EB] p-4">
                <BadgeCheck className="h-5 w-5 text-[#C65D43]" aria-hidden="true" />
                <p className="mt-3 text-xl font-black text-[#17202A]">
                  {book.isInMembership ? "Toàn bộ" : "10%"}
                </p>
                <p className="mt-1 text-xs font-bold text-[#765B54]">
                  {book.isInMembership ? "Quyền đọc hội viên" : "Đọc thử miễn phí"}
                </p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#1D2433]/10 bg-[#F7F4ED] p-5">
              <p className="text-sm font-black uppercase tracking-[0.12em] text-[#66706B]">
                Giá bán
              </p>
              <p className="mt-1 text-2xl font-black text-[#E76F51]">{formatPrice(salePrice)}</p>
              {book.availableListing ? (
                <p className="mt-2 text-sm font-medium text-[#66706B]">
                  Còn hàng · {getConditionLabel(book.availableListing.condition)} · Giao bởi BookVerse
                </p>
              ) : (
                <p className="mt-2 text-sm font-medium text-[#66706B]">
                  Sách hiện chưa có tin bán còn hàng.
                </p>
              )}
            </div>

            <div className="mt-8">
              <h2 className="bv-editorial text-2xl font-bold text-[#1D2433]">Mô tả sách</h2>
              <p className="mt-3 leading-8 text-[#42524D]">
                {isCurated
                  ? `${book.title} là tác phẩm của ${book.author}, thuộc thể loại ${book.category.name}. Bạn có thể xem thông tin xuất bản, đọc thử hoặc chọn mua sách ngay trên trang này.`
                  : book.description ?? "Cuốn sách này chưa có mô tả chi tiết."}
              </p>
            </div>

            <div className="mt-8">
              <h2 className="bv-editorial text-2xl font-bold text-[#1D2433]">Thông tin chi tiết</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {details.map((item) => (
                  <div className="rounded-xl border border-[#1D2433]/10 bg-[#FFFDF8] p-4" key={item.label}>
                    <dt className="text-sm font-medium text-[#66706B]">{item.label}</dt>
                    <dd className="mt-1 font-black text-[#17202A]">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </section>

        {relatedBooks.length > 0 ? (
          <section className="mt-14">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.15em] text-[#176B62]">Khám phá thêm</p>
                <h2 className="bv-editorial mt-2 text-3xl font-bold text-[#1D2433]">Sách cùng thể loại</h2>
              </div>
              <Link className="text-sm font-black text-[#176B62] transition hover:underline" href={`/catalog?q=${encodeURIComponent(book.category.name)}`}>
                Xem toàn bộ {book.category.name}
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {relatedBooks.map((relatedBook) => (
                <BookCard
                  book={relatedBook}
                  key={relatedBook.id}
                  returnPath={`/book/${book.id}`}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12">
          <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-[#104C47] p-5 text-[#FFFDF8] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-6 w-6 text-[#F2C14E]" aria-hidden="true" />
                <h2 className="text-2xl font-black">Đánh giá từ cộng đồng</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#D9EEEA]">
                Chia sẻ cảm nhận để giúp người đọc khác lựa chọn phù hợp hơn.
              </p>
            </div>
            <div className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl bg-white/10 px-4 text-sm font-bold sm:self-auto">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              {book.reviews.length} lượt nhận xét
            </div>
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
                  className="mt-2 h-11 w-full rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm font-medium text-[#17202A] outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/30"
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
              <SubmitButton pendingLabel="Đang gửi đánh giá...">
                Gửi đánh giá
              </SubmitButton>
            </div>
          </form>
          <ReviewSection reviews={book.reviews} />
        </section>
      </div>
    </main>
  );
}

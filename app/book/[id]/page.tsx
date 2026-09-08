import type { Metadata } from "next";
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
  PackageCheck,
  ShieldCheck,
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
import { formatBookPrice, getBookDisplayPrice } from "@/lib/book-display-price";
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

export async function generateMetadata({ params }: BookDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const book = await getBookById(id);

  if (!book) {
    return {
      title: "Không tìm thấy sách | BookVerse AI",
    };
  }

  return {
    title: `${book.title} | BookVerse AI`,
    description: `Xem thông tin ${book.title} của ${book.author}, đọc thử và khám phá các lựa chọn trên BookVerse.`,
  };
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

  const isCurated = book.catalogSource === "CURATED_REAL";
  const displayPrice = getBookDisplayPrice({
    bookPrice: book.price,
    listingPrice: book.availableListing?.price,
  });
  const relatedBooks = await getRelatedBooks(book.id, book.category.id, isCurated);
  const reviewAverage =
    book.reviews.length > 0
      ? book.reviews.reduce((total, review) => total + review.rating, 0) / book.reviews.length
      : book.rating;
  const details = [
    { label: "Danh mục", value: book.category.name },
    { label: "Định dạng", value: formatBookFormat(book.format) },
    { label: "Số trang bản in", value: book.pages ? `${book.pages} trang` : "Đang cập nhật" },
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
    { label: book.priceLabel, value: formatBookPrice(displayPrice.catalogPrice) },
  ];

  return (
    <main className="bv-page">
      <BookViewTracker bookId={book.id} />
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Đường dẫn" className="mb-7 flex flex-wrap items-center gap-2 text-sm text-bv-text-subtle">
          <Link className="font-semibold transition hover:text-bv-primary" href="/">Trang chủ</Link>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <Link className="font-semibold transition hover:text-bv-primary" href={`/catalog?q=${encodeURIComponent(book.category.name)}`}>
            {book.category.name}
          </Link>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span aria-current="page" className="max-w-56 truncate font-semibold text-bv-ink">{book.title}</span>
        </nav>
        <section className="grid gap-6 lg:grid-cols-[minmax(280px,0.85fr)_2fr] lg:gap-10">
          <aside className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 lg:sticky lg:top-24 lg:block lg:space-y-4 lg:self-start">
            <div className="self-start overflow-hidden rounded-2xl border border-bv-ink/10 bg-[#EDE3D5] shadow-[0_18px_45px_rgba(39,44,51,0.12)]">
              <BookCover
                alt={`Bìa sách ${book.title}`}
                author={book.author}
                bookId={book.id}
                category={book.category.name}
                className="aspect-[2/3] h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                src={book.coverImage}
                title={book.title}
                useBookVerseArtwork={isCurated}
              />
            </div>

            <div className="min-w-0 self-center lg:hidden">
              <span className="inline-flex rounded-full bg-bv-muted px-2.5 py-1 text-xs font-bold text-[#0F3F3C]">
                {book.category.name}
              </span>
              <span className="ml-2 inline-flex rounded-full bg-[#FFF1D6] px-2.5 py-1 text-xs font-bold text-[#7A4D00]">
                {book.metadataBadge}
              </span>
              <h1 className="bv-editorial mt-3 line-clamp-3 text-2xl font-black leading-tight text-bv-ink">
                {book.title}
              </h1>
              <p className="mt-1 line-clamp-2 text-sm font-medium text-bv-text-muted">{book.author}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1 font-black text-bv-heading">
                  <Star className="h-4 w-4 fill-bv-gold text-[#B17700]" aria-hidden="true" />
                  {reviewAverage ? reviewAverage.toFixed(1) : "Mới"}
                </span>
                <span className="font-black text-bv-accent">{formatBookPrice(displayPrice.catalogPrice)}</span>
              </div>
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-3 lg:col-span-1 lg:grid-cols-1">
              <Link
                className="col-span-2 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-bv-focus px-4 text-base font-black text-white shadow-[0_10px_24px_rgba(15,118,110,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0F5F59] hover:shadow-[0_14px_28px_rgba(15,118,110,0.35)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2 lg:col-span-1"
                href={`/read/${book.id}`}
              >
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                Mở trình đọc
              </Link>
              <p className="col-span-2 rounded-xl border border-bv-primary/15 bg-bv-mint/80 px-4 py-3 text-xs leading-5 font-semibold text-[#0F3F3C] lg:col-span-1">
                Đọc thử miễn phí tối đa 10%. Gói hội viên mở toàn bộ nội dung đọc minh họa được BookVerse cấp quyền.
              </p>
              <form action={toggleFavoriteAction}>
                <input name="bookId" type="hidden" value={book.id} />
                <SubmitButton className="h-12 w-full gap-2 rounded-xl text-sm font-bold" pendingLabel="Đang cập nhật..." variant="outline">
                  <Heart
                    className={cn("h-5 w-5", book.isFavorite && "fill-bv-accent text-bv-accent")}
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
                    <SubmitButton className="h-12 w-full gap-2 rounded-xl text-sm font-bold" pendingLabel="Đang thêm..." variant="outline">
                      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                      Thêm vào giỏ
                    </SubmitButton>
                  </form>
                  <form action={buyBookListingNowAction}>
                    <input name="bookId" type="hidden" value={book.id} />
                    <input name="listingId" type="hidden" value={book.availableListing.id} />
                    <SubmitButton
                      className="h-12 w-full gap-2 rounded-xl bg-bv-accent text-sm font-bold text-white shadow-[0_10px_24px_rgba(169,68,50,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#8E382A] hover:shadow-[0_14px_28px_rgba(169,68,50,0.35)] active:translate-y-0"
                      pendingLabel="Đang xử lý..."
                    >
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      Mua ngay
                    </SubmitButton>
                  </form>
                </>
              ) : (
                <Button className="h-12 gap-2 rounded-xl text-sm font-bold" disabled variant="outline">
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  Tạm hết hàng
                </Button>
              )}
              <BookShareButton title={book.title} />
            </div>
          </aside>

          <section className="bv-card rounded-3xl p-6 sm:p-8 shadow-[0_12px_36px_rgba(37,49,56,0.08)]">
            {query?.message ? (
              <div aria-live="polite" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                {query.message}
              </div>
            ) : null}

            {query?.error ? (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {query.error}
              </div>
            ) : null}

            <div className="hidden flex-wrap items-center gap-2.5 lg:flex">
              <span className="rounded-full bg-bv-muted px-3 py-1 text-xs font-bold text-[#0F3F3C]">
                {book.category.name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-bv-muted px-3 py-1 text-xs font-bold text-[#0F3F3C]">
                <BookMarked className="h-3.5 w-3.5" aria-hidden="true" /> {book.metadataBadge}
              </span>
              {book.sourceMetadata?.isVietnameseEdition ? (
                <span className="rounded-full bg-[#FFF1D6] px-3 py-1 text-xs font-bold text-[#7A4D00]">Ấn bản tiếng Việt</span>
              ) : null}
              {book.isInMembership ? (
                <Link className="inline-flex items-center gap-1 rounded-full bg-bv-gold/25 px-3 py-1 text-xs font-black text-[#7A4D00] transition hover:bg-bv-gold/35" href="/membership">
                  <Crown className="h-3.5 w-3.5" aria-hidden="true" /> Có trong gói hội viên
                </Link>
              ) : null}
              {!isCurated && book.rating ? (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-bv-heading">
                  <Star className="h-4 w-4 fill-bv-gold text-bv-gold" aria-hidden="true" />
                  {book.rating.toFixed(1)}
                </span>
              ) : null}
            </div>

            <h2 className="bv-editorial mt-5 hidden text-4xl font-bold leading-[1.08] tracking-tight text-bv-ink sm:text-5xl lg:block lg:text-6xl">
              {book.title}
            </h2>
            <p className="mt-3 hidden text-lg font-medium text-bv-text-muted lg:block">{book.author}</p>

            <div className="grid grid-cols-3 gap-2.5 lg:mt-7 lg:gap-3.5">
              <div className="rounded-2xl border border-bv-primary/15 bg-bv-muted/90 p-3.5 sm:p-4.5 transition hover:bg-bv-muted">
                <Star className="h-5 w-5 fill-bv-gold text-[#B17700]" aria-hidden="true" />
                <p className="mt-2 text-lg font-black text-bv-heading sm:mt-3 sm:text-xl">
                  {reviewAverage ? reviewAverage.toFixed(1) : "Mới"}
                </p>
                <p className="mt-1 text-xs font-bold text-[#56645F]">
                  {book.reviews.length > 0 ? `${book.reviews.length} đánh giá` : "Chưa có đánh giá"}
                </p>
              </div>
              <div className="rounded-2xl border border-bv-primary/15 bg-bv-ivory p-3.5 sm:p-4.5 transition hover:bg-white">
                <BookCopy className="h-5 w-5 text-bv-primary" aria-hidden="true" />
                <p className="mt-2 text-lg font-black text-bv-heading sm:mt-3 sm:text-xl">
                  {book.pages ? book.pages.toLocaleString("vi-VN") : "—"}
                </p>
                <p className="mt-1 text-xs font-bold text-bv-text-muted">Số trang bản in</p>
              </div>
              <div className="rounded-2xl border border-bv-accent/15 bg-[#FFF0EB] p-3.5 sm:p-4.5 transition hover:bg-[#FFE9E3]">
                <BadgeCheck className="h-5 w-5 text-bv-accent" aria-hidden="true" />
                <p className="mt-2 text-lg font-black text-bv-heading sm:mt-3 sm:text-xl">
                  {book.isInMembership ? "Toàn bộ" : "10%"}
                </p>
                <p className="mt-1 text-xs font-bold text-[#765B54]">
                  {book.isInMembership ? "Quyền đọc hội viên" : "Đọc thử miễn phí"}
                </p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-bv-ink/10 bg-bv-surface p-5.5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-bv-text-muted">
                {book.priceLabel}
              </p>
              <p className="mt-1 text-2xl font-black text-bv-accent">
                {formatBookPrice(displayPrice.catalogPrice)}
              </p>
              {book.availableListing ? (
                <p className="mt-2 text-sm font-medium text-bv-text-muted">
                  Tin bán đang chọn: {formatBookPrice(displayPrice.listingPrice)} · Còn hàng ·{" "}
                  {getConditionLabel(book.availableListing.condition)} · Giao bởi BookVerse
                </p>
              ) : (
                <p className="mt-2 text-sm font-medium text-bv-text-muted">
                  Sách hiện chưa có tin bán còn hàng.
                </p>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="flex items-start gap-3 rounded-2xl border border-bv-ink/10 bg-white p-3.5 shadow-sm">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-bv-primary" aria-hidden="true" />
                <p className="text-sm font-bold leading-5 text-bv-heading">Thông tin đúng đầu sách</p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-bv-ink/10 bg-white p-3.5 shadow-sm">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-bv-primary" aria-hidden="true" />
                <p className="text-sm font-bold leading-5 text-bv-heading">Đọc thử trước khi quyết định</p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-bv-ink/10 bg-white p-3.5 shadow-sm">
                {book.availableListing ? (
                  <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-bv-primary" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-bv-primary" aria-hidden="true" />
                )}
                <p className="text-sm font-bold leading-5 text-bv-heading">
                  {book.availableListing ? "Đơn hàng có theo dõi trạng thái" : "Thông tin hiển thị minh bạch"}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="bv-editorial text-2xl font-bold text-bv-ink">Mô tả sách</h2>
              <p className="mt-3 leading-8 text-[#42524D]">
                {isCurated
                  ? `${book.title} là tác phẩm của ${book.author}, thuộc thể loại ${book.category.name}. Bạn có thể xem thông tin xuất bản, đọc thử hoặc chọn mua sách ngay trên trang này.`
                  : book.description ?? "Cuốn sách này chưa có mô tả chi tiết."}
              </p>
            </div>

            <div className="mt-8">
              <h2 className="bv-editorial text-2xl font-bold text-bv-ink">Thông tin chi tiết</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                {details.map((item) => (
                  <div className="rounded-2xl border border-bv-ink/10 bg-bv-ivory p-3.5 sm:p-4 shadow-sm" key={item.label}>
                    <dt className="text-xs font-bold uppercase tracking-wider text-bv-text-muted">{item.label}</dt>
                    <dd className="mt-1 font-black text-bv-heading">{item.value}</dd>
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
                <p className="text-sm font-black uppercase tracking-[0.15em] text-bv-primary">Khám phá thêm</p>
                <h2 className="bv-editorial mt-2 text-3xl font-bold text-bv-ink">Sách cùng thể loại</h2>
              </div>
              <Link className="text-sm font-black text-bv-primary transition hover:underline" href={`/catalog?q=${encodeURIComponent(book.category.name)}`}>
                Xem toàn bộ {book.category.name}
              </Link>
            </div>
            <div
              aria-label="Kệ sách cùng thể loại, có thể vuốt ngang trên điện thoại"
              className="bv-book-shelf grid grid-flow-col auto-cols-[minmax(250px,82vw)] gap-5 overflow-x-auto pb-3 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3 xl:grid-cols-5"
              role="region"
              tabIndex={0}
            >
              {relatedBooks.slice(0, 5).map((relatedBook) => (
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
          <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-bv-primary-dark p-5 text-bv-ivory sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-6 w-6 text-bv-gold" aria-hidden="true" />
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
                <label className="text-sm font-bold text-bv-heading" htmlFor="rating">
                  Số sao
                </label>
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-bv-border bg-bv-ivory px-3 text-sm font-medium text-bv-heading outline-none focus-visible:ring-2 focus-visible:ring-bv-focus/30"
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
                <label className="text-sm font-bold text-bv-heading" htmlFor="reviewText">
                  Nội dung đánh giá
                </label>
                <textarea
                  className={cn(
                    "mt-2 min-h-24 w-full resize-y rounded-lg border border-bv-border bg-bv-ivory px-3 py-3 text-sm leading-6 text-bv-heading outline-none transition placeholder:text-[#7C8581] focus-visible:ring-2 focus-visible:ring-bv-focus/30",
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

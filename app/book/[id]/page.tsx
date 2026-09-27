import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  BookCopy,
  BookMarked,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Crown,
  Eye,
  FileText,
  Globe2,
  Heart,
  Layers,
  Library,
  MessageSquare,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
} from "lucide-react";
import { createBookReview, getBookById, getRelatedBooks } from "@/actions/book-detail.actions";
import { toggleFavoriteBook } from "@/actions/library.actions";
import { addListingToCart, createDemoOrder } from "@/actions/marketplace.actions";
import { BookCard } from "@/components/shared/BookCard";
import { BookCover } from "@/components/shared/BookCover";
import { BookShareButton } from "@/components/shared/BookShareButton";
import { BookViewTracker } from "@/components/shared/BookViewTracker";
import { ReviewSection } from "@/components/shared/ReviewSection";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Button } from "@/components/ui/button";
import { InteractiveReviewForm } from "@/components/book/InteractiveReviewForm";
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
      title: "Không tìm thấy sách | BookVerse",
    };
  }

  return {
    title: `${book.title} | BookVerse`,
    description: `Xem thông tin ${book.title} của ${book.author}, đọc thử trực tuyến và đặt mua sách chính hãng trên BookVerse.`,
  };
}

function formatBookFormat(format: string): string {
  switch (format) {
    case "PAPER":
      return "Sách giấy";
    case "BOTH":
      return "Sách điện tử & Sách giấy";
    default:
      return "Sách điện tử (Ebook)";
  }
}

function formatLanguage(language: string): string {
  const labels: Record<string, string> = {
    en: "Tiếng Anh",
    vi: "Tiếng Việt",
    fr: "Tiếng Pháp",
    de: "Tiếng Đức",
    es: "Tiếng Tây Ban Nha",
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
      return "Mới 100%";
    case "LIKE_NEW":
      return "Như mới (99%)";
    case "GOOD":
      return "Tốt (90%)";
    case "FAIR":
      return "Đã qua sử dụng";
    case "POOR":
      return "Cũ";
    case "DIGITAL":
      return "Ấn bản số";
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

  const metadataSpecs = [
    {
      icon: Layers,
      label: "Thể loại",
      value: book.category.name,
    },
    {
      icon: BookCopy,
      label: "Định dạng",
      value: formatBookFormat(book.format),
    },
    {
      icon: FileText,
      label: "Số trang bản in",
      value: book.pages ? `${book.pages.toLocaleString("vi-VN")} trang` : "Bản điện tử",
    },
    {
      icon: Calendar,
      label: "Năm phát hành",
      value: book.publishYear ? book.publishYear.toString() : "Đang cập nhật",
    },
    {
      icon: Globe2,
      label: "Ngôn ngữ",
      value: book.sourceMetadata?.languages?.map(formatLanguage).join(", ") || (isCurated ? "Tiếng Việt / Quốc tế" : "Tiếng Việt"),
    },
    {
      icon: Library,
      label: "Nhà xuất bản",
      value: book.sourceMetadata?.publisher ?? (isCurated ? "NXB Văn học & Tri thức" : "BookVerse Books"),
    },
    ...(book.sourceMetadata?.isbn
      ? [
          {
            icon: ShieldCheck,
            label: "Mã chuẩn ISBN",
            value: book.sourceMetadata.isbn,
          },
        ]
      : []),
    {
      icon: BadgeCheck,
      label: "Quyền đọc hội viên",
      value: book.isInMembership ? "Toàn bộ tác phẩm" : "Đọc thử miễn phí 10%",
    },
  ];

  return (
    <main className="bv-page relative min-h-screen pb-20 pt-6">
      <BookViewTracker bookId={book.id} />

      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] overflow-hidden opacity-45">
        <div className="absolute -left-20 -top-24 h-96 w-96 rounded-full bg-gradient-to-br from-bv-primary/20 via-bv-mint to-transparent blur-3xl" />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-gradient-to-bl from-bv-gold/25 via-amber-100/40 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <nav
          aria-label="Đường dẫn điều hướng"
          className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-bv-ink/8 bg-white/70 px-4 py-2 shadow-xs backdrop-blur-md">
            <Link
              className="font-medium text-bv-text-muted transition-colors hover:text-bv-primary"
              href="/"
            >
              Trang chủ
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-bv-text-muted/60" aria-hidden="true" />
            <Link
              className="font-medium text-bv-text-muted transition-colors hover:text-bv-primary"
              href={`/catalog?q=${encodeURIComponent(book.category.name)}`}
            >
              {book.category.name}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-bv-text-muted/60" aria-hidden="true" />
            <span
              aria-current="page"
              className="max-w-[200px] truncate font-bold text-bv-ink sm:max-w-[320px]"
            >
              {book.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/15 bg-emerald-50/90 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Sách có sẵn
            </span>
          </div>
        </nav>

        {/* System alerts */}
        {query?.message ? (
          <div
            aria-live="polite"
            className="animate-slide-up mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/95 p-4 text-sm font-medium text-emerald-900 shadow-sm"
            role="status"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{query.message}</span>
          </div>
        ) : null}

        {query?.error ? (
          <div
            className="animate-slide-up mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/95 p-4 text-sm font-medium text-rose-900 shadow-sm"
            role="alert"
          >
            <ShieldCheck className="h-5 w-5 shrink-0 text-rose-600" />
            <span>{query.error}</span>
          </div>
        ) : null}

        {/* Primary Book Showcase Grid */}
        <section className="grid gap-8 lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr] lg:gap-12">
          {/* Left Column: Visual Showcase & Reading Deck */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Book Cover Frame with 3D Depth */}
            <div className="group relative mx-auto max-w-[340px] sm:max-w-[380px] lg:max-w-none">
              <div className="relative overflow-hidden rounded-3xl border border-bv-ink/10 bg-gradient-to-b from-[#FDFBF7] to-[#EBE4D8] p-3 shadow-[0_20px_50px_-12px_rgba(23,107,98,0.2)] transition-all duration-300 group-hover:shadow-[0_28px_60px_-15px_rgba(23,107,98,0.28)]">
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-[#EDE3D5] shadow-inner">
                  <BookCover
                    alt={`Bìa sách ${book.title}`}
                    author={book.author}
                    bookId={book.id}
                    category={book.category.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    priority
                    src={book.coverImage}
                    title={book.title}
                    useBookVerseArtwork={isCurated}
                  />

                  {/* Gentle light reflection on spine */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/20 via-white/10 to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 left-1 w-px bg-white/20" />
                </div>

                {/* Floating quick badges */}
                <div className="absolute right-6 top-6 flex flex-col items-end gap-2">
                  {book.isInMembership ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-gradient-to-r from-[#FFF5D6] to-[#FFE28A] px-3 py-1 text-xs font-black text-[#7A4D00] shadow-md">
                      <Crown className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
                      Hội viên VIP
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-bv-primary/20 bg-white/90 px-3 py-1 text-xs font-bold text-bv-primary shadow-md backdrop-blur-md">
                      <Sparkles className="h-3.5 w-3.5 text-bv-gold" />
                      Đọc thử 10%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Reading Deck (Nổi bật trải nghiệm đọc) */}
            <div className="rounded-3xl border border-bv-ink/10 bg-white p-5 shadow-[0_12px_32px_rgba(29,36,51,0.06)] sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-bv-ink/8 pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-bv-primary" />
                  <span className="text-sm font-bold text-bv-heading">Trải nghiệm đọc số</span>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-0.5 border border-emerald-200">
                  {book.isInMembership ? "Mở khóa toàn bộ" : "Miễn phí 10%"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <Link
                  className={cn(
                    "flex min-h-13 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl px-5 text-base font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-focus focus-visible:ring-offset-2",
                    book.isInMembership
                      ? "bg-gradient-to-r from-bv-primary to-bv-primary-dark shadow-[0_12px_28px_rgba(23,107,98,0.3)] hover:brightness-110"
                      : "bg-bv-focus shadow-[0_10px_24px_rgba(15,118,110,0.25)] hover:bg-[#0F5F59]",
                  )}
                  href={`/read/${book.id}`}
                >
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                  {book.isInMembership ? "Đọc ngay (Toàn bộ tác phẩm)" : "Đọc thử trực tuyến ngay"}
                </Link>

                <p className="text-center text-xs leading-relaxed text-bv-text-muted">
                  {book.isInMembership
                    ? "Tác phẩm nằm trong kho quyền đọc BookVerse VIP. Bạn có thể đọc trực tiếp mà không mất phí mua bản in."
                    : "Đọc thử tối đa 10% nội dung để cảm nhận giọng văn và độ phù hợp trước khi đặt mua."}
                </p>

                {/* Secondary Quick Action Bar: Yêu thích & Chia sẻ */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <form action={toggleFavoriteAction} className="w-full">
                    <input name="bookId" type="hidden" value={book.id} />
                    <SubmitButton
                      className={cn(
                        "h-11 w-full gap-2 rounded-xl text-xs font-bold transition-all",
                        book.isFavorite
                          ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "border-bv-border hover:border-bv-primary hover:text-bv-primary",
                      )}
                      pendingLabel="Đang lưu..."
                      variant="outline"
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform",
                          book.isFavorite && "fill-rose-500 text-rose-500 scale-110",
                        )}
                        aria-hidden="true"
                      />
                      <span>{book.isFavorite ? "Đã lưu" : "Lưu vào kho"}</span>
                    </SubmitButton>
                  </form>

                  <BookShareButton
                    className="h-11 rounded-xl text-xs font-bold"
                    label="Chia sẻ"
                    title={book.title}
                  />
                </div>
              </div>

              {/* Reading Perks Mini-List */}
              <div className="mt-5 border-t border-bv-ink/8 pt-4">
                <ul className="space-y-2 text-xs text-bv-text-muted">
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-bv-gold shrink-0" />
                    <span>Hỗ trợ ghi chú, bookmark trang đọc</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-bv-primary shrink-0" />
                    <span>Tùy chỉnh cỡ chữ, nền sáng / vàng dịu / tối</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-bv-primary shrink-0" />
                    <span>Nội dung tuyển chọn & bản dịch chuẩn xác</span>
                  </li>
                </ul>
              </div>
            </div>
          </aside>

          {/* Right Column: Editorial Details & Purchasing Console */}
          <div className="space-y-8">
            {/* Header: Title, Author, Badges */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="rounded-full border border-bv-primary/20 bg-bv-muted/80 px-3.5 py-1 text-xs font-extrabold text-bv-primary-dark transition hover:bg-bv-primary hover:text-white"
                  href={`/catalog?q=${encodeURIComponent(book.category.name)}`}
                >
                  {book.category.name}
                </Link>

                <span className="inline-flex items-center gap-1 rounded-full border border-bv-ink/10 bg-white px-3 py-1 text-xs font-bold text-bv-ink">
                  <BookMarked className="h-3 w-3 text-bv-primary" />
                  {book.metadataBadge}
                </span>

                {book.sourceMetadata?.isVietnameseEdition ? (
                  <span className="rounded-full border border-amber-300/40 bg-[#FFF7E3] px-3 py-1 text-xs font-bold text-[#8C5D00]">
                    Ấn bản tiếng Việt
                  </span>
                ) : null}

                {book.isInMembership ? (
                  <Link
                    className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black text-[#7A4D00] transition hover:bg-amber-100"
                    href="/membership"
                  >
                    <Crown className="h-3 w-3 fill-amber-500 text-amber-600" />
                    Gói hội viên
                  </Link>
                ) : null}
              </div>

              <h1 className="bv-editorial text-3xl font-extrabold leading-tight text-bv-ink sm:text-4xl lg:text-5xl">
                {book.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-bv-text-muted">
                <p className="font-semibold text-bv-heading">
                  Tác giả: <span className="text-bv-primary underline decoration-bv-primary/30 underline-offset-4">{book.author}</span>
                </p>

                <a
                  className="inline-flex items-center gap-1.5 font-bold text-bv-heading transition hover:text-bv-primary"
                  href="#reviews-section"
                >
                  <Star className="h-4 w-4 fill-bv-gold text-[#D4991A]" />
                  <span>{reviewAverage ? reviewAverage.toFixed(1) : "Mới"}</span>
                  <span className="font-normal text-bv-text-muted">
                    ({book.reviews.length > 0 ? `${book.reviews.length} đánh giá` : "Chưa có nhận xét"})
                  </span>
                </a>

                <span className="rounded-full bg-bv-surface px-2.5 py-0.5 text-xs font-semibold text-bv-text-subtle border border-bv-ink/8">
                  {formatBookFormat(book.format)}
                </span>
              </div>
            </div>

            {/* 4-Metric Quick Highlights Ribbon */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="flex flex-col justify-between rounded-2xl border border-bv-ink/8 bg-white p-4 shadow-xs transition hover:border-bv-primary/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-bv-text-muted uppercase tracking-wider">Đánh giá</span>
                  <Star className="h-4 w-4 fill-bv-gold text-[#D4991A]" />
                </div>
                <div className="mt-3">
                  <p className="text-xl font-black text-bv-heading">
                    {reviewAverage ? reviewAverage.toFixed(1) : "5.0"}
                  </p>
                  <p className="text-xs font-medium text-bv-text-muted">
                    {book.reviews.length > 0 ? `${book.reviews.length} nhận xét` : "Đầu sách mới"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-bv-ink/8 bg-white p-4 shadow-xs transition hover:border-bv-primary/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-bv-text-muted uppercase tracking-wider">Số trang</span>
                  <BookCopy className="h-4 w-4 text-bv-primary" />
                </div>
                <div className="mt-3">
                  <p className="text-xl font-black text-bv-heading">
                    {book.pages ? book.pages.toLocaleString("vi-VN") : "—"}
                  </p>
                  <p className="text-xs font-medium text-bv-text-muted">Trang in tiêu chuẩn</p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-bv-ink/8 bg-white p-4 shadow-xs transition hover:border-bv-primary/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-bv-text-muted uppercase tracking-wider">Năm XB</span>
                  <Calendar className="h-4 w-4 text-bv-primary" />
                </div>
                <div className="mt-3">
                  <p className="text-xl font-black text-bv-heading">
                    {book.publishYear ?? "2024"}
                  </p>
                  <p className="text-xs font-medium text-bv-text-muted">Ấn bản cập nhật</p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-bv-accent/20 bg-gradient-to-br from-[#FFF9F7] to-[#FFEFEA] p-4 shadow-xs transition hover:border-bv-accent/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#8E382A] uppercase tracking-wider">Quyền đọc</span>
                  <BadgeCheck className="h-4 w-4 text-bv-accent" />
                </div>
                <div className="mt-3">
                  <p className="text-xl font-black text-bv-accent">
                    {book.isInMembership ? "Toàn bộ" : "10% Thử"}
                  </p>
                  <p className="text-xs font-medium text-[#8E382A]/80">
                    {book.isInMembership ? "Gói VIP mở khóa" : "Đọc thử miễn phí"}
                  </p>
                </div>
              </div>
            </div>

            {/* Unified Purchasing Console (Giá bán & Đặt hàng ngay cùng vị trí) */}
            <div className="overflow-hidden rounded-3xl border border-bv-ink/10 bg-white shadow-[0_16px_45px_rgba(29,36,51,0.08)]">
              {/* Header Price Section */}
              <div className="border-b border-bv-ink/8 bg-gradient-to-r from-bv-surface via-white to-bv-surface p-6 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-bv-text-muted">
                      {book.priceLabel}
                    </span>
                    <div className="mt-1 flex items-baseline gap-3">
                      <span className="text-3xl font-black text-bv-accent sm:text-4xl">
                        {formatBookPrice(displayPrice.catalogPrice)}
                      </span>
                      {displayPrice.listingPrice && displayPrice.listingPrice !== displayPrice.catalogPrice ? (
                        <span className="text-sm font-semibold text-bv-text-muted line-through">
                          {formatBookPrice(displayPrice.listingPrice)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {book.availableListing ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Còn hàng · {getConditionLabel(book.availableListing.condition)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-neutral-100 px-3.5 py-1.5 text-xs font-bold text-neutral-600">
                        Bản in tạm hết hàng
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 rounded-full border border-bv-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-bv-text-muted">
                      <PackageCheck className="h-3.5 w-3.5 text-bv-primary" />
                      Giao bởi BookVerse
                    </span>
                  </div>
                </div>

                {book.availableListing ? (
                  <p className="mt-3 text-xs font-medium text-bv-text-muted">
                    Bản in tuyển chọn chuẩn phân loại, kiểm định chất lượng gáy và trang in trước khi giao tới tay độc giả.
                  </p>
                ) : null}
              </div>

              {/* Action Buttons Area */}
              <div className="p-6 sm:p-7">
                {book.availableListing ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <form action={buyBookListingNowAction} className="w-full">
                      <input name="bookId" type="hidden" value={book.id} />
                      <input name="listingId" type="hidden" value={book.availableListing.id} />
                      <SubmitButton
                        className="min-h-13 w-full gap-2 rounded-2xl bg-bv-accent text-base font-black text-white shadow-[0_12px_28px_rgba(169,68,50,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#8E382A] hover:shadow-[0_16px_36px_rgba(169,68,50,0.4)] active:translate-y-0"
                        pendingLabel="Đang xử lý đơn..."
                      >
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        Mua ngay
                      </SubmitButton>
                    </form>

                    <form action={addBookListingToCartAction} className="w-full">
                      <input name="bookId" type="hidden" value={book.id} />
                      <input name="listingId" type="hidden" value={book.availableListing.id} />
                      <SubmitButton
                        className="min-h-13 w-full gap-2 rounded-2xl border-2 border-bv-primary/25 bg-bv-muted/50 text-base font-bold text-bv-primary-dark transition-all duration-200 hover:-translate-y-0.5 hover:border-bv-primary hover:bg-bv-muted active:translate-y-0"
                        pendingLabel="Đang thêm giỏ..."
                        variant="outline"
                      >
                        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                        Thêm vào giỏ
                      </SubmitButton>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button className="min-h-13 w-full gap-2 rounded-2xl text-base font-bold" disabled variant="outline">
                      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                      Bản in sách giấy đang tạm hết hàng
                    </Button>
                    <p className="text-center text-xs text-bv-text-muted">
                      Bạn vẫn có thể thưởng thức cuốn sách bằng bản đọc thử hoặc gói Hội viên BookVerse VIP.
                    </p>
                  </div>
                )}

                {/* Micro Trust Signals */}
                <div className="mt-6 grid grid-cols-1 gap-3 border-t border-bv-ink/8 pt-5 sm:grid-cols-3">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-bv-heading">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Cam kết sách thật 100%</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-bv-heading">
                    <RotateCcw className="h-4 w-4 shrink-0 text-bv-primary" />
                    <span>Đổi trả 7 ngày minh bạch</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-bv-heading">
                    <BookOpen className="h-4 w-4 shrink-0 text-bv-gold" />
                    <span>Đọc thử trước khi quyết định</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Book Description Card */}
            <div className="rounded-3xl border border-bv-ink/10 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-bv-ink/8 pb-4">
                <Sparkles className="h-5 w-5 text-bv-primary" />
                <h2 className="bv-editorial text-2xl font-bold text-bv-ink">Giới thiệu tác phẩm</h2>
              </div>
              <div className="mt-5 text-base leading-8 text-[#3F4B46] sm:text-lg">
                <p>
                  {isCurated
                    ? `${book.title} là một trong những tác phẩm tiêu biểu của tác giả ${book.author}, thuộc thể loại ${book.category.name}. Tác phẩm mang đến những giá trị chiều sâu về tri thức, tư tưởng và chiều kích nhân văn độc đáo. Độc giả có thể đọc thử ngay trên trình đọc số của BookVerse hoặc đặt mua bản in được tuyển chọn kỹ lưỡng.`
                    : book.description ?? "Cuốn sách này hiện đang được cập nhật phần tóm tắt chi tiết từ ban biên tập BookVerse."}
                </p>
              </div>
            </div>

            {/* Detailed Publishing Specifications */}
            <div className="rounded-3xl border border-bv-ink/10 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-bv-ink/8 pb-4">
                <Library className="h-5 w-5 text-bv-primary" />
                <h2 className="bv-editorial text-2xl font-bold text-bv-ink">Thông số xuất bản & pháp lý</h2>
              </div>
              <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {metadataSpecs.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      className="group rounded-2xl border border-bv-ink/8 bg-bv-surface/60 p-4 transition-all hover:border-bv-primary/30 hover:bg-white hover:shadow-xs"
                      key={item.label}
                    >
                      <div className="flex items-center gap-2 text-bv-text-muted">
                        <Icon className="h-4 w-4 text-bv-primary group-hover:scale-110 transition-transform" />
                        <dt className="text-xs font-bold uppercase tracking-wider">{item.label}</dt>
                      </div>
                      <dd className="mt-2 text-sm font-black text-bv-heading truncate">{item.value}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>

            {/* VIP Membership Perks Banner (nếu sách thuộc gói hội viên) */}
            {book.isInMembership ? (
              <div className="relative overflow-hidden rounded-3xl border border-amber-300/40 bg-gradient-to-br from-[#103D38] via-[#15544D] to-[#1E6B62] p-6 text-white shadow-xl sm:p-8">
                <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-200 backdrop-blur-md">
                      <Crown className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                      Đặc quyền độc giả VIP
                    </div>
                    <h3 className="text-xl font-black text-white sm:text-2xl">
                      Đọc trọn vẹn cuốn sách này cùng 10.000+ tựa sách khác
                    </h3>
                    <p className="text-sm text-emerald-100/90 leading-relaxed max-w-xl">
                      Chỉ với gói Hội viên BookVerse VIP, bạn được đọc không giới hạn mọi đầu sách tuyển chọn, không cần mua từng cuốn sách riêng lẻ.
                    </p>
                  </div>
                  <Link
                    className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F2C14E] to-[#E5AB2D] px-6 text-sm font-black text-[#4A3000] shadow-md transition-all duration-200 hover:brightness-105 active:scale-95"
                    href="/membership"
                  >
                    <Crown className="h-4 w-4" />
                    Khám phá gói Hội viên
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Related Books Section */}
        {relatedBooks.length > 0 ? (
          <section className="mt-16 sm:mt-20">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-bv-ink/8 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-bv-primary" />
                  <p className="text-xs font-black uppercase tracking-widest text-bv-primary">Khám phá thêm</p>
                </div>
                <h2 className="bv-editorial mt-1 text-2xl font-black text-bv-ink sm:text-3xl">
                  Sách cùng thể loại {book.category.name}
                </h2>
              </div>
              <Link
                className="group inline-flex items-center gap-1 text-sm font-black text-bv-primary transition hover:text-bv-primary-dark"
                href={`/catalog?q=${encodeURIComponent(book.category.name)}`}
              >
                <span>Xem toàn bộ kệ sách</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div
              aria-label="Kệ sách cùng thể loại"
              className="bv-book-shelf grid grid-flow-col auto-cols-[minmax(240px,78vw)] gap-5 overflow-x-auto pb-4 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3 xl:grid-cols-5"
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

        {/* Community Reviews Section */}
        <section className="mt-16 sm:mt-20" id="reviews-section">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-bv-primary-dark to-bv-primary p-6 text-white shadow-lg sm:p-8">
            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="h-6 w-6 text-bv-gold" aria-hidden="true" />
                  <h2 className="text-2xl font-black sm:text-3xl">Cảm nhận từ cộng đồng người đọc</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#D9EEEA] max-w-xl">
                  Những góc nhìn và đánh giá chân thực từ độc giả giúp bạn hiểu rõ hơn về giá trị cuốn sách trước khi thưởng thức.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/15 px-4 py-2.5 text-center backdrop-blur-md">
                  <p className="text-xs font-bold text-bv-gold">Điểm trung bình</p>
                  <p className="text-2xl font-black text-white">
                    {reviewAverage ? reviewAverage.toFixed(1) : "5.0"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-2.5 text-center backdrop-blur-md">
                  <p className="text-xs font-bold text-emerald-200">Tổng nhận xét</p>
                  <p className="text-2xl font-black text-white">{book.reviews.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Review Form & Review List */}
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-bv-heading">Gửi nhận xét của bạn</h3>
                <p className="text-xs text-bv-text-muted">Đóng góp ý kiến để cộng đồng độc giả BookVerse ngày càng phong phú.</p>
              </div>
              <InteractiveReviewForm action={submitReviewAction} bookId={book.id} />
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-bv-heading">Tất cả nhận xét ({book.reviews.length})</h3>
                <span className="text-xs font-semibold text-bv-text-muted">Được sắp xếp mới nhất</span>
              </div>
              <ReviewSection reviews={book.reviews} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

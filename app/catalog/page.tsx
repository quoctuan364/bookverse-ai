import Link from "next/link";
import { ArrowUpDown, ChevronLeft, ChevronRight, Filter, Search, SearchX, X } from "lucide-react";

import { getCatalogData, type CatalogSourceFilter } from "@/actions/catalog.actions";
import { BookCard } from "@/components/shared/BookCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeCatalogLanguageFilter } from "@/lib/book-language";
import type { CatalogSearchSort } from "@/lib/catalog-search";

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    source?: string;
    language?: string;
    year?: string;
    sort?: string;
    page?: string;
  }>;
}

function safeSource(value?: string): CatalogSourceFilter {
  return value === "real" || value === "demo" ? value : "all";
}

function safePositiveInteger(value?: string): number | undefined {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function safeSort(value?: string): CatalogSearchSort {
  return value === "title" ||
    value === "rating" ||
    value === "price-low" ||
    value === "price-high" ||
    value === "newest"
    ? value
    : "relevance";
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const query = params?.q ?? "";
  const categoryId = params?.category ?? "";
  const source = safeSource(params?.source);
  const language =
    params?.language === "NOT_AVAILABLE"
      ? "NOT_AVAILABLE"
      : normalizeCatalogLanguageFilter(params?.language) ?? "";
  const publishYear = safePositiveInteger(params?.year);
  const sort = safeSort(params?.sort);
  const requestedPage = safePositiveInteger(params?.page) ?? 1;
  const data = await getCatalogData({
    query,
    categoryId,
    source,
    language,
    publishYear,
    sort,
    page: requestedPage,
  });

  const currentParams = () => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (categoryId) next.set("category", categoryId);
    if (source !== "all") next.set("source", source);
    if (language) next.set("language", language);
    if (publishYear) next.set("year", String(publishYear));
    if (sort !== "relevance") next.set("sort", sort);
    return next;
  };
  const pageHref = (targetPage: number) => {
    const next = currentParams();
    if (targetPage > 1) next.set("page", String(targetPage));
    const queryString = next.toString();
    return queryString ? `/catalog?${queryString}` : "/catalog";
  };
  const removeFilterHref = (key: string) => {
    const next = currentParams();
    next.delete(key);
    next.delete("page");
    const queryString = next.toString();
    return queryString ? `/catalog?${queryString}` : "/catalog";
  };
  const activeCategoryName = data.categories.find((category) => category.id === categoryId)?.name;
  const activeFilters = [
    query ? { key: "q", label: `Tìm: ${query}` } : null,
    activeCategoryName ? { key: "category", label: activeCategoryName } : null,
    language
      ? {
          key: "language",
          label:
            language === "vi"
              ? "Tiếng Việt"
              : language === "en"
                ? "Tiếng Anh"
                : "Thiếu metadata ngôn ngữ",
        }
      : null,
    publishYear ? { key: "year", label: `Năm ${publishYear}` } : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F5D98B]">Danh mục sách BookVerse</p>
          <h1 className="bv-editorial mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Tìm cuốn sách tiếp theo</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#EAF5F1]">
            Khám phá hàng nghìn đầu sách, tìm nhanh theo tên, tác giả, thể loại hoặc ngôn ngữ.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <form className="bv-panel grid min-w-0 grid-cols-1 gap-4 rounded-2xl p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-1 md:col-span-2">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66706B]" />
              <Input aria-label="Tìm trong danh mục sách" className="h-11 pl-10" defaultValue={query} name="q" placeholder="Tên sách, tác giả, ISBN, nhà xuất bản..." type="search" />
            </div>
            <p className="text-xs font-medium text-[#687083]">
              Hỗ trợ tiếng Việt không dấu, ISBN liền số và lỗi gõ nhẹ.
            </p>
          </div>

          <label className="grid gap-1 text-xs font-bold text-[#42524D]">
            Thể loại
            <select className="h-11 rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm text-[#1D2433]" defaultValue={categoryId} name="category">
              <option value="">Tất cả thể loại</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-bold text-[#42524D]">
            Ngôn ngữ
            <select className="h-11 rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm text-[#1D2433]" defaultValue={language} name="language">
              <option value="">Tất cả</option>
              <option value="vi">Tiếng Việt</option>
              <option value="en">Tiếng Anh</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-bold text-[#42524D]">
            Năm xuất bản
            <Input className="h-11" defaultValue={publishYear?.toString() ?? ""} min="1000" max="2100" name="year" placeholder="Ví dụ: 2020" type="number" />
          </label>

          <label className="grid gap-1 text-xs font-bold text-[#42524D]">
            Sắp xếp
            <span className="relative">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687083]" aria-hidden="true" />
              <select className="h-11 w-full rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] pl-9 pr-3 text-sm text-[#1D2433]" defaultValue={sort} name="sort">
                <option value="relevance">Độ liên quan</option>
                <option value="title">Tên A–Z</option>
                <option value="rating">Đánh giá cao</option>
                <option value="newest">Năm mới nhất</option>
                <option value="price-low">Giá thấp đến cao</option>
                <option value="price-high">Giá cao đến thấp</option>
              </select>
            </span>
          </label>

          <Button className="h-11 gap-2 self-end md:col-span-2 xl:col-span-2" type="submit">
            <Filter className="h-4 w-4" aria-hidden="true" /> Lọc sách
          </Button>
        </form>

        {activeFilters.length > 0 ? (
          <div aria-label="Bộ lọc đang áp dụng" className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-[#687083]">
              Đang lọc
            </span>
            {activeFilters.map((filter) => (
              <Link
                aria-label={`Xóa bộ lọc ${filter.label}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#B8DBD5] bg-[#EDF8F5] px-3 py-1.5 text-xs font-bold text-[#176B62] transition hover:border-[#176B62]/45 hover:bg-[#DDF0EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                href={removeFilterHref(filter.key)}
                key={filter.key}
              >
                {filter.label}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ))}
            <Link className="inline-flex min-h-9 items-center rounded-full px-3 py-1.5 text-xs font-bold text-[#C65D43] hover:bg-[#FBEDE8]" href="/catalog">
              Xóa tất cả
            </Link>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-medium text-[#687083]">
            Trang <span className="font-black text-[#1D2433]">{data.page}</span>/{data.totalPages} · hiển thị{" "}
            <span className="font-black text-[#1D2433]">{data.visibleBooks}</span> trong{" "}
            <span className="font-black text-[#1D2433]">{data.totalBooks.toLocaleString("vi-VN")}</span> sách phù hợp.
          </p>
          <Link className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-black text-[#176B62] hover:bg-[#EAF2EF] hover:underline" href="/catalog">Xóa bộ lọc</Link>
        </div>

        {data.books.length > 0 ? (
          <div className="mt-6 grid auto-rows-fr grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {data.books.map((book) => (
              <BookCard
                book={{
                  id: book.id,
                  title: book.title,
                  author: book.author,
                  coverImage: book.coverImage,
                  price: book.price,
                  catalogSource: book.catalogSource,
                  metadataBadge: book.metadataBadge,
                  priceLabel: book.priceLabel,
                  sourceRating: book.sourceRating,
                  category: book.category.name,
                  availableListingId: book.availableListingId,
                  isFavorite: book.isFavorite,
                }}
                key={book.id}
                returnPath="/catalog"
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-[#176B62]/30 bg-white/80 px-6 py-12 text-center shadow-[0_12px_34px_rgba(39,44,51,0.06)]">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDF0EB] text-[#176B62]">
              <SearchX className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-black text-[#1D2433]">Chưa tìm thấy cuốn phù hợp</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#687083]">
              Thử rút gọn từ khóa, bỏ bớt bộ lọc hoặc mô tả nhu cầu bằng ngôn ngữ tự nhiên để Trợ lý AI hỗ trợ.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#176B62] px-5 text-sm font-bold text-white hover:bg-[#104C47]" href="/catalog">
                Xóa toàn bộ bộ lọc
              </Link>
              <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-5 text-sm font-bold text-[#1D2433] hover:bg-[#EDF7F5]" href="/assistant">
                Hỏi Trợ lý AI
              </Link>
            </div>
          </div>
        )}

        <nav aria-label="Phân trang catalog" className="mt-8 flex items-center justify-center gap-3">
          {data.hasPreviousPage ? (
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-4 text-sm font-bold text-[#17202A]" href={pageHref(data.page - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Trang trước
            </Link>
          ) : null}
          {data.hasNextPage ? (
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0F766E] px-4 text-sm font-bold text-white" href={pageHref(data.page + 1)}>
              Trang sau <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </nav>
      </section>
    </main>
  );
}

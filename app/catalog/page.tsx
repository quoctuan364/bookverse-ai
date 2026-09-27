import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX, X } from "lucide-react";

import { getCatalogData } from "@/actions/catalog.actions";
import { CatalogSearchPanel } from "@/components/catalog/CatalogSearchPanel";
import { CatalogSearchTracker } from "@/components/catalog/CatalogSearchTracker";
import { BookCard } from "@/components/shared/BookCard";
import { normalizeCatalogLanguageFilter } from "@/lib/book-language";
import {
  buildCatalogPaginationItems,
  type CatalogPaginationItem,
} from "@/lib/catalog-pagination";
import type { CatalogSearchSort } from "@/lib/catalog-search";
import { getCatalogHeroDescription } from "@/lib/catalog-presentation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Danh mục sách | BookVerse",
  description: "Tìm kiếm và lọc sách theo thể loại, ngôn ngữ, giá và đánh giá trên BookVerse.",
};

interface CatalogPageProps {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    language?: string;
    year?: string;
    minPrice?: string;
    maxPrice?: string;
    minRating?: string;
    inStock?: string;
    sort?: string;
    page?: string;
  }>;
}

function safePositiveInteger(value?: string): number | undefined {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function safePrice(value?: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined;
}

function safeRating(value?: string): number | undefined {
  const parsed = Number(value);
  return [3, 4, 4.5].includes(parsed) ? parsed : undefined;
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

function paginationKey(item: CatalogPaginationItem): string {
  return typeof item === "number" ? `page-${item}` : item;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const query = params?.q ?? "";
  const categoryId = params?.category ?? "";
  const language =
    params?.language === "NOT_AVAILABLE"
      ? "NOT_AVAILABLE"
      : normalizeCatalogLanguageFilter(params?.language) ?? "";
  const publishYear = safePositiveInteger(params?.year);
  const minPrice = safePrice(params?.minPrice);
  const maxPrice = safePrice(params?.maxPrice);
  const minRating = safeRating(params?.minRating);
  const inStock = params?.inStock === "1";
  const sort = safeSort(params?.sort);
  const requestedPage = safePositiveInteger(params?.page) ?? 1;
  const data = await getCatalogData({
    query,
    categoryId,
    language,
    publishYear,
    minPrice,
    maxPrice,
    minRating,
    inStock,
    sort,
    page: requestedPage,
  });

  const currentParams = () => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (categoryId) next.set("category", categoryId);
    if (language) next.set("language", language);
    if (publishYear) next.set("year", String(publishYear));
    if (minPrice !== undefined) next.set("minPrice", String(minPrice));
    if (maxPrice !== undefined) next.set("maxPrice", String(maxPrice));
    if (minRating) next.set("minRating", String(minRating));
    if (inStock) next.set("inStock", "1");
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
  const mobilePaginationItems = buildCatalogPaginationItems(data.page, data.totalPages, true);
  const desktopPaginationItems = buildCatalogPaginationItems(data.page, data.totalPages);
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
                : "Chưa có thông tin ngôn ngữ",
        }
      : null,
    publishYear ? { key: "year", label: `Năm ${publishYear}` } : null,
    minPrice !== undefined ? { key: "minPrice", label: `Từ ${minPrice.toLocaleString("vi-VN")}đ` } : null,
    maxPrice !== undefined ? { key: "maxPrice", label: `Đến ${maxPrice.toLocaleString("vi-VN")}đ` } : null,
    minRating ? { key: "minRating", label: `Từ ${minRating} sao` } : null,
    inStock ? { key: "inStock", label: "Còn hàng" } : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));

  return (
    <main className="bv-page">
      {query ? <CatalogSearchTracker query={query} /> : null}
      <section className="bv-hero">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F5D98B]">Góc sách BookVerse</p>
          <h1 className="bv-editorial mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Tìm cuốn sách tiếp theo</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-bv-mint-soft">
            {getCatalogHeroDescription()}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {data.books.some((book) => book.catalogSource === "SYNTHETIC_DEMO") ? (
          <p className="mb-4 rounded-xl border border-[#E7D7A8] bg-[#FFF8E7] px-4 py-3 text-sm font-medium text-[#684F16]">
            Một số thông tin sách và giá bán được dùng để minh họa; tình trạng còn hàng sẽ được cập nhật khi bạn chọn mua.
          </p>
        ) : null}
        <CatalogSearchPanel
          activeFilterCount={activeFilters.length}
          categories={data.categories}
          initialValues={{
            categoryId,
            inStock,
            language,
            maxPrice,
            minPrice,
            minRating,
            publishYear,
            query,
            sort,
          }}
        />


        {activeFilters.length > 0 ? (
          <div aria-label="Bộ lọc đang áp dụng" className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-bv-text-subtle">
              Đang lọc
            </span>
            {activeFilters.map((filter) => (
              <Link
                aria-label={`Xóa bộ lọc ${filter.label}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#B8DBD5] bg-[#EDF8F5] px-3 py-1.5 text-xs font-bold text-bv-primary transition hover:border-bv-primary/45 hover:bg-[#DDF0EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
                href={removeFilterHref(filter.key)}
                key={filter.key}
              >
                {filter.label}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ))}
            <Link className="inline-flex min-h-9 items-center rounded-full px-3 py-1.5 text-xs font-bold text-bv-accent hover:bg-[#FBEDE8]" href="/catalog">
              Xóa tất cả
            </Link>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-medium text-bv-text-subtle">
            Đang xem trang <span className="font-black text-bv-ink">{data.page}</span>/{data.totalPages}
          </p>
        </div>

        {data.books.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
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
          <div className="mt-6 rounded-3xl border border-dashed border-bv-primary/30 bg-white/80 px-6 py-12 text-center shadow-[0_12px_34px_rgba(39,44,51,0.06)]">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDF0EB] text-bv-primary">
              <SearchX className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-black text-bv-ink">Chưa tìm thấy cuốn phù hợp</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-bv-text-subtle">
              Thử từ khóa khác, bỏ bớt bộ lọc hoặc nhờ Nova tìm theo sở thích của bạn.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-bv-primary px-5 text-sm font-bold text-white hover:bg-bv-primary-dark" href="/catalog">
                Xóa toàn bộ bộ lọc
              </Link>
              <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-bv-border bg-bv-ivory px-5 text-sm font-bold text-bv-ink hover:bg-[#EDF7F5]" href="/assistant">
                Hỏi Nova
              </Link>
            </div>
          </div>
        )}

        <nav
          aria-label="Chuyển trang danh mục sách"
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap"
        >
          {data.hasPreviousPage ? (
            <Link
              aria-label={`Về trang ${data.page - 1}`}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-bv-border bg-bv-ivory px-4 text-sm font-bold text-bv-heading transition hover:border-bv-primary/40 hover:bg-bv-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
              href={pageHref(data.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Trang trước</span>
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-bv-border bg-bv-muted px-4 text-sm font-bold text-bv-text-muted opacity-60"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Trang trước</span>
            </span>
          )}

          {[mobilePaginationItems, desktopPaginationItems].map((items, index) => (
            <div
              aria-label="Danh sách số trang"
              className={`${index === 0 ? "flex sm:hidden" : "hidden sm:flex"} flex-wrap items-center justify-center gap-2`}
              key={index === 0 ? "mobile" : "desktop"}
            >
              {items.map((item) =>
                typeof item === "number" ? (
                  item === data.page ? (
                    <span
                      aria-current="page"
                      aria-label={`Trang ${item}, trang hiện tại`}
                      className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg bg-bv-primary px-3 text-sm font-black text-white shadow-sm"
                      key={paginationKey(item)}
                    >
                      {item}
                    </span>
                  ) : (
                    <Link
                      aria-label={`Đến trang ${item}`}
                      className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-bv-border bg-white px-3 text-sm font-bold text-bv-heading transition hover:border-bv-primary/40 hover:bg-bv-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
                      href={pageHref(item)}
                      key={paginationKey(item)}
                    >
                      {item}
                    </Link>
                  )
                ) : (
                  <span
                    aria-hidden="true"
                    className="inline-flex h-11 min-w-6 items-center justify-center text-sm font-bold text-bv-text-muted"
                    key={paginationKey(item)}
                  >
                    …
                  </span>
                ),
              )}
            </div>
          ))}

          {data.hasNextPage ? (
            <Link
              aria-label={`Đến trang ${data.page + 1}`}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-bv-focus px-4 text-sm font-bold text-white transition hover:bg-bv-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2"
              href={pageHref(data.page + 1)}
            >
              <span>Tiếp theo</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-bv-muted px-4 text-sm font-bold text-bv-text-muted opacity-60"
            >
              <span>Tiếp theo</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </nav>
      </section>
    </main>
  );
}

import Link from "next/link";
import { ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";

import { getCatalogData, type CatalogSourceFilter } from "@/actions/catalog.actions";
import { BookCard } from "@/components/shared/BookCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    source?: string;
    language?: string;
    year?: string;
    isbn?: string;
    sourceRating?: string;
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

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const query = params?.q ?? "";
  const categoryId = params?.category ?? "";
  const source = safeSource(params?.source);
  const language = params?.language ?? "";
  const publishYear = safePositiveInteger(params?.year);
  const hasIsbn = params?.isbn === "1";
  const hasSourceRating = params?.sourceRating === "1";
  const requestedPage = safePositiveInteger(params?.page) ?? 1;
  const data = await getCatalogData({
    query,
    categoryId,
    source,
    language,
    publishYear,
    hasIsbn,
    hasSourceRating,
    page: requestedPage,
  });

  const pageHref = (targetPage: number) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (categoryId) next.set("category", categoryId);
    if (source !== "all") next.set("source", source);
    if (language) next.set("language", language);
    if (publishYear) next.set("year", String(publishYear));
    if (hasIsbn) next.set("isbn", "1");
    if (hasSourceRating) next.set("sourceRating", "1");
    if (targetPage > 1) next.set("page", String(targetPage));
    const queryString = next.toString();
    return queryString ? `/catalog?${queryString}` : "/catalog";
  };

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">Danh mục sách BookVerse</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Kho sách thông minh</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#EAF5F1]">
            Catalog tuyển chọn được tách rõ khỏi dữ liệu demo. Giá của catalog tuyển chọn là giá demo,
            còn rating nguồn không phải đánh giá người dùng BookVerse.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <form className="bv-panel grid min-w-0 grid-cols-1 gap-3 rounded-lg p-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66706B]" />
            <Input className="h-11 pl-10" defaultValue={query} name="q" placeholder="Tên sách, tác giả, ISBN, nhà xuất bản..." type="search" />
          </div>

          <label className="grid gap-1 text-xs font-bold text-[#42524D]">
            Nguồn catalog
            <select className="h-11 rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm" defaultValue={source} name="source">
              <option value="all">Tất cả</option>
              <option value="real">Catalog thật</option>
              <option value="demo">Dữ liệu demo</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-bold text-[#42524D]">
            Thể loại
            <select className="h-11 rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm" defaultValue={categoryId} name="category">
              <option value="">Tất cả thể loại</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-bold text-[#42524D]">
            Ngôn ngữ
            <select className="h-11 rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm" defaultValue={language} name="language">
              <option value="">Tất cả</option>
              <option value="vie">Tiếng Việt</option>
              <option value="eng">Tiếng Anh</option>
              <option value="NOT_AVAILABLE">Chưa có metadata</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-bold text-[#42524D]">
            Năm xuất bản
            <Input className="h-11" defaultValue={publishYear?.toString() ?? ""} min="1000" max="2100" name="year" placeholder="Ví dụ: 2020" type="number" />
          </label>

          <div className="flex flex-wrap items-end gap-4 rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-4 py-3 text-sm font-medium text-[#42524D]">
            <label className="inline-flex items-center gap-2">
              <input defaultChecked={hasIsbn} name="isbn" type="checkbox" value="1" /> Có ISBN
            </label>
            <label className="inline-flex items-center gap-2">
              <input defaultChecked={hasSourceRating} name="sourceRating" type="checkbox" value="1" /> Có rating nguồn
            </label>
          </div>

          <Button className="h-11 gap-2 self-end" type="submit">
            <Filter className="h-4 w-4" aria-hidden="true" /> Lọc sách
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-medium text-[#66706B]">
            Trang <span className="font-black text-[#17202A]">{data.page}</span>/{data.totalPages} · hiển thị{" "}
            <span className="font-black text-[#17202A]">{data.visibleBooks}</span> trong{" "}
            <span className="font-black text-[#17202A]">{data.totalBooks.toLocaleString("vi-VN")}</span> sách phù hợp.
          </p>
          <Link className="text-sm font-black text-[#0F766E] hover:underline" href="/catalog">Xóa bộ lọc</Link>
        </div>

        {data.books.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
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
                }}
                key={book.id}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-[#17191F]/10 bg-[#FFFDF8] p-8 text-center text-sm text-[#66706B] shadow-[0_12px_34px_rgba(39,44,51,0.08)]">
            Không tìm thấy sách phù hợp.
          </div>
        )}

        <nav aria-label="Phân trang catalog" className="mt-8 flex items-center justify-center gap-3">
          {data.hasPreviousPage ? (
            <Link className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-4 text-sm font-bold text-[#17202A]" href={pageHref(data.page - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Trang trước
            </Link>
          ) : null}
          {data.hasNextPage ? (
            <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0F766E] px-4 text-sm font-bold text-white" href={pageHref(data.page + 1)}>
              Trang sau <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </nav>
      </section>
    </main>
  );
}

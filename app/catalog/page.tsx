import Link from "next/link";
import { Filter, Search } from "lucide-react";
import { getCatalogData } from "@/actions/catalog.actions";
import { BookCard } from "@/components/shared/BookCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  searchParams?: Promise<{
    q?: string;
    category?: string;
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const query = params?.q ?? "";
  const categoryId = params?.category ?? "";
  const { books, categories, totalBooks, visibleBooks } = await getCatalogData({
    query,
    categoryId,
  });

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">Danh mục sách BookVerse</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Kho sách thông minh</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#EAF5F1]">
            Tìm sách theo chủ đề, tác giả hoặc thể loại và mở ngay trải nghiệm đọc online.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <form className="bv-panel grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_240px_auto]">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66706B]"
            />
            <Input
              className="h-11 pl-10"
              defaultValue={query}
              name="q"
              placeholder="Tìm tên sách, tác giả, mô tả..."
              type="search"
            />
          </div>

          <label className="sr-only" htmlFor="category">
            Thể loại
          </label>
          <select
            className="h-11 rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm font-medium text-[#17202A] outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/30"
            defaultValue={categoryId}
            id="category"
            name="category"
          >
            <option value="">Tất cả thể loại</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <Button className="h-11 gap-2" type="submit">
            <Filter className="h-4 w-4" aria-hidden="true" />
            Lọc sách
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-[#66706B]">
            Hiển thị <span className="font-black text-[#17202A]">{visibleBooks}</span> /{" "}
            <span className="font-black text-[#17202A]">
              {totalBooks.toLocaleString("vi-VN")}
            </span>{" "}
            sách phù hợp.
          </p>
          <Link className="text-sm font-black text-[#0F766E] hover:underline" href="/catalog">
            Xóa bộ lọc
          </Link>
        </div>

        {books.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {books.map((book) => (
              <BookCard
                book={{
                  id: book.id,
                  title: book.title,
                  author: book.author,
                  coverImage: book.coverImage,
                  price: book.price,
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
      </section>
    </main>
  );
}

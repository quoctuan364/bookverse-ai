"use client";

import Link from "next/link";
import { ArrowRight, Tags } from "lucide-react";
import { useState } from "react";
import { BookCard } from "@/components/shared/BookCard";
import { HomeShelfScroller } from "@/components/home/HomeShelfScroller";
import type { HomeGenreShelf } from "@/lib/home-shelf-types";

interface GenreShelfTabsProps {
  genres: HomeGenreShelf[];
  error?: string | null;
}

export function GenreShelfTabs({ genres, error }: GenreShelfTabsProps) {
  const [activeGenreId, setActiveGenreId] = useState<string>(genres[0]?.id ?? "");

  if (error || genres.length === 0) {
    return (
      <section className="mx-auto mt-14 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-dashed border-bv-border bg-white p-5 text-sm text-bv-text-subtle">
          {error ?? "Chưa có sách trong mục này. Bạn ghé lại sau nhé."}
        </div>
      </section>
    );
  }

  const activeGenre = genres.find((genre) => genre.id === activeGenreId) ?? genres[0];

  return (
    <section aria-labelledby="genre-shelf-heading" className="mt-14 border-y border-bv-ink/8 bg-white py-12 sm:py-14">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-bv-accent">
              <Tags className="h-4 w-4" aria-hidden="true" />
              Chủ đề đang có trong kho sách
            </p>
            <h2 className="bv-editorial mt-2 text-2xl font-black text-bv-ink sm:text-3xl" id="genre-shelf-heading">
              Khám phá theo thể loại
            </h2>
          </div>
          <Link
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-black text-bv-primary transition hover:bg-bv-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
            href={`/catalog?category=${encodeURIComponent(activeGenre.catalogKey)}`}
          >
            Xem tất cả {activeGenre.name}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <nav aria-label="Khám phá sách theo thể loại" className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {genres.map((genre) => {
            const active = genre.id === activeGenre.id;
            return (
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary ${
                  active
                    ? "border-bv-primary bg-bv-primary text-white shadow-sm"
                    : "border-bv-border bg-white text-bv-ink hover:border-bv-primary hover:bg-bv-muted"
                }`}
                key={genre.id}
                onClick={() => setActiveGenreId(genre.id)}
              >
                {genre.name}
              </button>
            );
          })}
        </nav>

        <div
          aria-label={`Sách nổi bật thuộc thể loại ${activeGenre.name}`}
          id={`genre-panel-${activeGenre.id}`}
          key={activeGenre.id}
          className="mt-6 animate-in fade-in duration-300"
        >
          <HomeShelfScroller ariaLabel={`Kệ thể loại ${activeGenre.name}`}>
            {activeGenre.books.map((book) => (
              <BookCard
                book={{ ...book, priceLabel: "Giá BookVerse" }}
                key={`${activeGenre.id}-${book.id}`}
                returnPath="/"
                showQuickActions={false}
              />
            ))}
          </HomeShelfScroller>
        </div>
      </div>
    </section>
  );
}

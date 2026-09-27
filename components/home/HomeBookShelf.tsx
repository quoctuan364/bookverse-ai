import Link from "next/link";
import { AlertCircle, ArrowRight, BookOpen } from "lucide-react";
import React from "react";

import { HomeShelfScroller } from "@/components/home/HomeShelfScroller";
import { BookCard } from "@/components/shared/BookCard";
import type { HomeShelfBook } from "@/lib/home-shelf-types";

interface HomeBookShelfProps {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  books: HomeShelfBook[];
  error?: string | null;
  href: string;
  linkLabel?: string;
  recommendationRequestId?: string | null;
  ranked?: boolean;
  tone?: "plain" | "cream" | "mint";
}

export function HomeBookShelf({
  id,
  eyebrow,
  title,
  description,
  books,
  error,
  href,
  linkLabel = "Xem tất cả",
  recommendationRequestId,
  ranked = false,
  tone = "plain",
}: HomeBookShelfProps) {
  const sectionTone = {
    plain: "",
    cream: "border-y border-bv-ink/8 bg-[#F2EDE2] shadow-[inset_0_1px_0_rgba(23,107,98,0.07),_inset_0_-1px_0_rgba(23,107,98,0.04)]",
    mint: "border-y border-bv-primary/10 bg-[#E7F0EB] shadow-[inset_0_1px_0_rgba(23,107,98,0.09),_inset_0_-1px_0_rgba(23,107,98,0.05)]",
  }[tone];

  return (
    <section aria-labelledby={`${id}-heading`} className={`mt-10 py-9 sm:py-11 ${sectionTone}`}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-bv-accent">{eyebrow}</p>
          <h2 className="bv-editorial mt-2 text-2xl font-black text-bv-ink sm:text-3xl" id={`${id}-heading`}>
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-bv-text-subtle">{description}</p>
        </div>
        <Link
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-black text-bv-primary transition hover:bg-bv-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
          href={href}
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {error ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{error} Các khu vực khác vẫn có thể sử dụng bình thường.</p>
        </div>
      ) : books.length > 0 ? (
        <HomeShelfScroller ariaLabel={`Kệ ${title}`}>
          {books.map((book, index) => (
            <div className="relative h-full" key={book.id}>
              {ranked ? (
                <span className="absolute -left-1 -top-2 z-20 flex h-10 min-w-10 items-center justify-center rounded-xl border-2 border-white bg-bv-primary px-2 text-lg font-black text-white shadow-lg" aria-label={`Hạng ${index + 1}`}>
                  {index + 1}
                </span>
              ) : null}
              <BookCard
                book={{ ...book, priceLabel: "Giá BookVerse" }}
                recommendationRequestId={recommendationRequestId}
                returnPath="/"
                showQuickActions={false}
              />
            </div>
          ))}
        </HomeShelfScroller>
      ) : (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-bv-border bg-white p-5 text-sm text-bv-text-subtle">
          <BookOpen className="h-5 w-5 shrink-0 text-bv-primary" aria-hidden="true" />
          Chưa có sách nào để hiển thị.
        </div>
      )}
      </div>
    </section>
  );
}

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import { normalizeVietnameseSearchText } from "@/lib/catalog-search";
import prisma from "@/lib/prisma";
import { publicExperienceBookWhere } from "@/lib/public-book-policy";

const getCachedSuggestionBooks = unstable_cache(
  async () => prisma.book.findMany({
    where: publicExperienceBookWhere(),
    select: { id: true, title: true, authorName: true },
    orderBy: [{ rating: "desc" }, { id: "asc" }],
  }),
  ["catalog-suggestion-books-v1"],
  { revalidate: 300, tags: ["catalog"] },
);

export async function GET(request: Request) {
  const query = normalizeVietnameseSearchText(new URL(request.url).searchParams.get("q")?.slice(0, 120) ?? "");
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  let books: Awaited<ReturnType<typeof getCachedSuggestionBooks>>;
  try {
    // Không quét lại toàn bộ catalog sau mỗi ký tự người dùng nhập.
    books = await getCachedSuggestionBooks();
  } catch {
    console.error("[catalog-suggestions] Không thể đọc catalog.");
    return NextResponse.json(
      { suggestions: [], error: "CATALOG_UNAVAILABLE" },
      { status: 503 },
    );
  }

  const suggestions = books
    .map((book) => ({
      id: book.id,
      title: getVietnameseBookTitle(book.id, book.title),
      author: book.authorName,
      originalTitle: book.title,
    }))
    .filter((book) => normalizeVietnameseSearchText(`${book.title} ${book.originalTitle} ${book.author}`).includes(query))
    .slice(0, 7)
    .map(({ id, title, author }) => ({ id, title, author }));

  return NextResponse.json({ suggestions });
}

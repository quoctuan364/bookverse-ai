import { NextResponse } from "next/server";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import { normalizeVietnameseSearchText } from "@/lib/catalog-search";
import prisma from "@/lib/prisma";
import { publicExperienceBookWhere } from "@/lib/public-book-policy";

export async function GET(request: Request) {
  const query = normalizeVietnameseSearchText(new URL(request.url).searchParams.get("q")?.slice(0, 120) ?? "");
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  const books = await prisma.book.findMany({
    where: publicExperienceBookWhere(),
    select: { id: true, title: true, authorName: true },
    orderBy: [{ rating: "desc" }, { id: "asc" }],
  });

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

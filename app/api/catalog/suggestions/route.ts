import { NextResponse } from "next/server";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import prisma from "@/lib/prisma";
import { publicExperienceBookWhere } from "@/lib/public-book-policy";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().toLocaleLowerCase("vi-VN") ?? "";
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
    }))
    .filter((book) => `${book.title} ${book.author}`.toLocaleLowerCase("vi-VN").includes(query))
    .slice(0, 7);

  return NextResponse.json({ suggestions });
}

import { NextResponse } from "next/server";

import { getBookById } from "@/actions/book-detail.actions";

interface MobileBookRouteContext {
  params: Promise<{ bookId: string }>;
}

export async function GET(_request: Request, context: MobileBookRouteContext) {
  const { bookId } = await context.params;
  const book = await getBookById(bookId);

  if (!book) {
    return NextResponse.json({ error: "Không tìm thấy sách." }, { status: 404 });
  }

  return NextResponse.json(book);
}

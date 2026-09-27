import { NextResponse } from "next/server";

import { getReaderBookContent } from "@/actions/reader.actions";

interface MobileReaderRouteContext {
  params: Promise<{ bookId: string }>;
}

export async function GET(_request: Request, context: MobileReaderRouteContext) {
  const { bookId } = await context.params;
  return NextResponse.json(await getReaderBookContent(bookId));
}

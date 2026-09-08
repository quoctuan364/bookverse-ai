import { NextResponse } from "next/server";

import { askReaderRag } from "@/actions/ai-reader-rag.actions";

interface MobileReaderRagRouteContext {
  params: Promise<{ bookId: string }>;
}

export async function POST(request: Request, context: MobileReaderRagRouteContext) {
  const { bookId } = await context.params;
  const payload = (await request.json().catch(() => null)) as
    | { query?: unknown; chapterNumber?: unknown }
    | null;
  const query = typeof payload?.query === "string" ? payload.query : "";
  const chapterNumber = Number(payload?.chapterNumber ?? 1);

  return NextResponse.json(await askReaderRag(bookId, query, chapterNumber));
}

import { NextResponse } from "next/server";
import { saveReadingProgress } from "@/actions/reader.actions";

interface ProgressPayload {
  bookId?: unknown;
  currentPage?: unknown;
  totalPages?: unknown;
  timeSpent?: unknown;
  currentChapter?: unknown;
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Endpoint nhỏ dành cho sendBeacon khi người đọc đóng hoặc tải lại trang.
 * Request chạy nền nên việc đồng bộ vài giây đọc cuối không chặn điều hướng.
 */
export async function POST(request: Request) {
  let payload: ProgressPayload;

  try {
    payload = (await request.json()) as ProgressPayload;
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const bookId = typeof payload.bookId === "string" ? payload.bookId.trim() : "";
  const currentPage = toFiniteNumber(payload.currentPage);
  const totalPages = toFiniteNumber(payload.totalPages);
  const timeSpent = toFiniteNumber(payload.timeSpent);
  const currentChapter = toFiniteNumber(payload.currentChapter) ?? 1;

  if (!bookId || currentPage === null || totalPages === null || timeSpent === null) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const result = await saveReadingProgress(
    bookId,
    currentPage,
    totalPages,
    timeSpent,
    currentChapter,
  );

  return NextResponse.json(
    { success: result.success },
    { status: result.success ? 200 : 401 },
  );
}

import { InteractionType, TargetType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

interface CreateHighlightBody {
  bookId?: string;
  pageNumber?: number;
  blockId?: string;
  startOffset?: number;
  endOffset?: number;
  text?: string;
  note?: string;
}

function isCreateHighlightBody(value: unknown): value is CreateHighlightBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as CreateHighlightBody;

  return (
    (typeof body.bookId === "string" || typeof body.bookId === "undefined") &&
    (typeof body.pageNumber === "number" || typeof body.pageNumber === "undefined") &&
    (typeof body.blockId === "string" || typeof body.blockId === "undefined") &&
    (typeof body.startOffset === "number" || typeof body.startOffset === "undefined") &&
    (typeof body.endOffset === "number" || typeof body.endOffset === "undefined") &&
    (typeof body.text === "string" || typeof body.text === "undefined") &&
    (typeof body.note === "string" || typeof body.note === "undefined")
  );
}

function serializeHighlight(highlight: {
  id: string;
  bookId: string;
  pageNumber: number;
  blockId: string | null;
  startOffset: number | null;
  endOffset: number | null;
  text: string;
  note: string | null;
  createdAt: Date;
}) {
  return {
    id: highlight.id,
    bookId: highlight.bookId,
    pageNumber: highlight.pageNumber,
    blockId: highlight.blockId,
    startOffset: highlight.startOffset,
    endOffset: highlight.endOffset,
    text: highlight.text,
    note: highlight.note,
    createdAt: highlight.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn cần đăng nhập để xem highlight.",
        },
        {
          status: 401,
        },
      );
    }

    if (currentUser.isLocked) {
      return NextResponse.json(
        {
          success: false,
          error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
        },
        {
          status: 403,
        },
      );
    }

    const userId = currentUser.id;
    const requestUrl = new URL(request.url);
    const bookId = requestUrl.searchParams.get("bookId")?.trim();

    if (!bookId) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu bookId.",
        },
        {
          status: 400,
        },
      );
    }

    const highlights = await prisma.highlight.findMany({
      where: {
        userId,
        bookId,
      },
      orderBy: [
        {
          pageNumber: "asc",
        },
        {
          startOffset: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: highlights.map(serializeHighlight),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[api/highlights][GET] ${message}`);

    return NextResponse.json(
      {
        success: false,
        error: "Không thể lấy danh sách highlight.",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn cần đăng nhập để lưu highlight.",
        },
        {
          status: 401,
        },
      );
    }

    if (currentUser.isLocked) {
      return NextResponse.json(
        {
          success: false,
          error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
        },
        {
          status: 403,
        },
      );
    }

    const userId = currentUser.id;
    const payload: unknown = await request.json().catch(() => null);

    if (!isCreateHighlightBody(payload)) {
      return NextResponse.json(
        {
          success: false,
          error: "Dữ liệu highlight không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    const bookId = payload.bookId?.trim();
    const text = payload.text?.trim();
    const blockId = payload.blockId?.trim() || null;
    const note = payload.note?.trim() || null;
    const pageNumber = Math.max(1, Math.floor(payload.pageNumber ?? 1));
    const startOffset =
      typeof payload.startOffset === "number" && Number.isFinite(payload.startOffset)
        ? Math.max(0, Math.floor(payload.startOffset))
        : null;
    const endOffset =
      typeof payload.endOffset === "number" && Number.isFinite(payload.endOffset)
        ? Math.max(0, Math.floor(payload.endOffset))
        : null;

    if (!bookId || !text) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu bookId hoặc nội dung highlight.",
        },
        {
          status: 400,
        },
      );
    }

    if (startOffset !== null && endOffset !== null && endOffset <= startOffset) {
      return NextResponse.json(
        {
          success: false,
          error: "Vị trí highlight không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    const highlight = await prisma.$transaction(async (tx) => {
      const createdHighlight = await tx.highlight.create({
        data: {
          userId,
          bookId,
          pageNumber,
          blockId,
          startOffset,
          endOffset,
          text,
          note,
        },
      });

      await tx.interactionEvent.create({
        data: {
          userId,
          bookId,
          actionType: "HIGHLIGHT",
          metadata: {
            blockId,
            pageNumber,
            startOffset,
            endOffset,
            source: "highlight_engine",
          },
        },
      });

      await tx.interaction.create({
        data: {
          id: `HIGHLIGHT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          userId,
          bookId,
          type: InteractionType.HIGHLIGHT,
          targetType: TargetType.BOOK,
          targetId: bookId,
          metadata: {
            blockId,
            pageNumber,
            startOffset,
            endOffset,
            source: "highlight_engine",
          },
        },
      });

      return createdHighlight;
    });

    return NextResponse.json(
      {
        success: true,
        data: serializeHighlight(highlight),
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[api/highlights][POST] ${message}`);

    return NextResponse.json(
      {
        success: false,
        error: "Không thể lưu highlight.",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      {
        status: 500,
      },
    );
  }
}

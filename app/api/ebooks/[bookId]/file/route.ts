import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { EditionType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getBookReadingAccess } from "@/lib/membership-access";

export const runtime = "nodejs";

interface EbookFileRouteContext {
  params: Promise<{ bookId: string }>;
}

export async function GET(_request: Request, context: EbookFileRouteContext) {
  const user = await getCurrentUser();

  if (!user || user.isLocked) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để mở Ebook." }, { status: 401 });
  }

  const { bookId: rawBookId } = await context.params;
  const bookId = decodeURIComponent(rawBookId).trim();
  const [readingAccess, edition] = await Promise.all([
    getBookReadingAccess(user.id, bookId),
    prisma.bookEdition.findFirst({
      where: {
        bookId,
        editionType: EditionType.EBOOK,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
      select: {
        digitalAsset: {
          select: { fileUrl: true },
        },
      },
    }),
  ]);

  if (!readingAccess.hasAccess) {
    return NextResponse.json(
      { error: "Bạn chưa mua Ebook hoặc chưa có gói hội viên phù hợp." },
      { status: 403 },
    );
  }

  const candidates = [
    edition?.digitalAsset?.fileUrl ? path.basename(edition.digitalAsset.fileUrl) : null,
    `${bookId}.html`,
    `${bookId.toLowerCase()}.html`,
  ].filter((item): item is string => Boolean(item));

  for (const fileName of Array.from(new Set(candidates))) {
    const filePath = path.join(process.cwd(), "public", "ebooks", "html", fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    const content = await readFile(filePath);
    return new Response(content, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Security-Policy":
          "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return NextResponse.json({ error: "Chưa tìm thấy file Ebook cho đầu sách này." }, { status: 404 });
}

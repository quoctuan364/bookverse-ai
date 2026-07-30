import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { CoverReviewStatus, PrismaClient } from "@prisma/client";

import { deriveBookLanguageCode } from "@/lib/book-language";
import { inspectLocalBookCover } from "@/lib/local-cover-quality";

type AuditMode = "dry-run" | "execute";

function databaseNameFromUrl(databaseUrl?: string): string {
  if (!databaseUrl) throw new Error("Thiếu DATABASE_URL.");
  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/u, "").split("/")[0] ?? "");
  if (!databaseName.startsWith("bookverse_")) {
    throw new Error(`Từ chối audit database ngoài BookVerse: ${databaseName || "(trống)"}.`);
  }
  return databaseName;
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  const mode: AuditMode = execute ? "execute" : "dry-run";
  const databaseName = databaseNameFromUrl(process.env.DATABASE_URL);
  const confirmation = process.argv
    .find((argument) => argument.startsWith("--confirm-database="))
    ?.slice("--confirm-database=".length);

  if (execute && confirmation !== databaseName) {
    throw new Error(
      `Để ghi kết quả audit, thêm --execute --confirm-database=${databaseName}. Chưa có dữ liệu bị thay đổi.`,
    );
  }

  const prisma = new PrismaClient();
  try {
    const books = await prisma.book.findMany({
      where: {
        id: { startsWith: "RB" },
        sourceMetadata: { isNot: null },
      },
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        sourceMetadata: {
          select: {
            languages: true,
            isVietnameseEdition: true,
            isbn: true,
          },
        },
      },
    });

    const rows = [];
    for (const [index, book] of books.entries()) {
      const cover = await inspectLocalBookCover(book.id);
      const languageCode = deriveBookLanguageCode({
        title: book.title,
        languages: book.sourceMetadata?.languages ?? [],
        isVietnameseEdition: book.sourceMetadata?.isVietnameseEdition,
      });
      rows.push({
        id: book.id,
        title: book.title,
        languageCode,
        coverStatus: cover.valid
          ? CoverReviewStatus.VERIFIED_LOCAL
          : CoverReviewStatus.NEEDS_COVER_REVIEW,
        isPubliclyVisible: cover.valid,
        coverPath: cover.relativePath,
        coverReason: cover.reason,
        missingIsbn: !book.sourceMetadata?.isbn?.trim(),
        missingDescription: !book.description?.trim(),
      });
      if ((index + 1) % 500 === 0) {
        console.log(`[data-quality] Đã kiểm tra ${index + 1}/${books.length} sách.`);
      }
    }

    if (execute) {
      const batchSize = 150;
      for (let index = 0; index < rows.length; index += batchSize) {
        const batch = rows.slice(index, index + batchSize);
        await prisma.$transaction(
          batch.flatMap((row) => [
            prisma.book.update({
              where: { id: row.id },
              data: {
                languageCode: row.languageCode,
                coverPath: row.coverPath,
                coverReviewStatus: row.coverStatus,
                isPubliclyVisible: row.isPubliclyVisible,
              },
            }),
            prisma.bookEdition.updateMany({
              where: { bookId: row.id },
              data: { languageCode: row.languageCode },
            }),
          ]),
        );
      }
    }

    const report = {
      mode,
      databaseName,
      auditedAt: new Date().toISOString(),
      totalBooks: rows.length,
      languages: {
        vi: rows.filter((row) => row.languageCode === "vi").length,
        en: rows.filter((row) => row.languageCode === "en").length,
        other: rows.filter(
          (row) => row.languageCode !== null && !["vi", "en"].includes(row.languageCode),
        ).length,
        missing: rows.filter((row) => row.languageCode === null).length,
      },
      covers: {
        verifiedLocal: rows.filter((row) => row.coverStatus === CoverReviewStatus.VERIFIED_LOCAL)
          .length,
        needsReview: rows.filter(
          (row) => row.coverStatus === CoverReviewStatus.NEEDS_COVER_REVIEW,
        ).length,
      },
      missingIsbn: rows.filter((row) => row.missingIsbn).length,
      missingDescription: rows.filter((row) => row.missingDescription).length,
      publicBooks: rows.filter((row) => row.isPubliclyVisible).length,
      languageCorrections: rows
        .filter((row) => ["RB00001", "RB00015", "RB00016"].includes(row.id))
        .map((row) => ({ id: row.id, title: row.title, languageCode: row.languageCode })),
      coverReviewSample: rows
        .filter((row) => row.coverStatus === CoverReviewStatus.NEEDS_COVER_REVIEW)
        .slice(0, 20)
        .map((row) => ({ id: row.id, title: row.title, reason: row.coverReason })),
    };

    const outputDirectory = path.resolve(process.cwd(), "outputs", "data-quality");
    await mkdir(outputDirectory, { recursive: true });
    const outputPath = path.join(
      outputDirectory,
      `${report.auditedAt.replace(/[:.]/gu, "-")}-${mode}.json`,
    );
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    console.log(JSON.stringify({ ...report, outputPath }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

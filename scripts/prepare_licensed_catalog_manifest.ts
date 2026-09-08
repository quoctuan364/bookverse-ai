import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import csv from "csv-parser";

import prisma from "../lib/prisma";

interface LicensedCatalogRow {
  book_id: string;
  current_title: string;
  vietnamese_title: string;
  title_reviewed: string;
  content_file: string;
  cover_file: string;
  total_pages: string;
  included_pages: string;
  license_reference: string;
  cover_source_url: string;
}

const OUTPUT_DIR = path.resolve(process.cwd(), "outputs", "licensed-catalog");
const REQUIRED_COLUMNS: Array<keyof LicensedCatalogRow> = [
  "book_id",
  "current_title",
  "vietnamese_title",
  "title_reviewed",
  "content_file",
  "cover_file",
  "total_pages",
  "included_pages",
  "license_reference",
  "cover_source_url",
];

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function resolveWorkspaceFile(relativePath: string): string | null {
  const cleanPath = relativePath.trim().replaceAll("\\", "/");
  if (!cleanPath || path.isAbsolute(cleanPath)) return null;

  const absolutePath = path.resolve(process.cwd(), cleanPath);
  const workspacePrefix = `${path.resolve(process.cwd())}${path.sep}`;
  return absolutePath.startsWith(workspacePrefix) ? absolutePath : null;
}

function findCurrentRealCover(bookId: string): string {
  const candidates = [
    `public/covers/real-catalog-local/${bookId}.jpg`,
    `public/covers/real-catalog-local-normalized/${bookId}.webp`,
  ];
  return candidates.find((candidate) => existsSync(path.resolve(candidate))) ?? "";
}

async function prepareTemplate(): Promise<void> {
  const books = await prisma.book.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      title: true,
      pages: true,
      sourceMetadata: {
        select: {
          sourcePageUrl: true,
        },
      },
    },
  });

  const rows: LicensedCatalogRow[] = books.map((book) => ({
    book_id: book.id,
    current_title: book.title,
    vietnamese_title: book.title,
    title_reviewed: "false",
    content_file: "",
    cover_file: book.id.startsWith("RB") ? findCurrentRealCover(book.id) : "",
    total_pages: String(book.pages ?? ""),
    included_pages: "",
    license_reference: "",
    cover_source_url: book.sourceMetadata?.sourcePageUrl ?? "",
  }));

  const timestamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
  const outputPath = path.join(OUTPUT_DIR, `manifest-template-${timestamp}.csv`);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    outputPath,
    [
      REQUIRED_COLUMNS.map(csvCell).join(","),
      ...rows.map((row) =>
        REQUIRED_COLUMNS.map((column) => csvCell(row[column])).join(","),
      ),
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        mode: "prepare",
        books: rows.length,
        coversPreFilled: rows.filter((row) => row.cover_file).length,
        outputPath,
        note:
          "Điền đủ manifest và đặt file nguồn vào data/licensed-catalog trước khi chạy validate.",
      },
      null,
      2,
    ),
  );
}

async function parseManifest(manifestPath: string): Promise<LicensedCatalogRow[]> {
  return new Promise((resolve, reject) => {
    const rows: LicensedCatalogRow[] = [];
    createReadStream(manifestPath)
      .pipe(csv())
      .on("data", (row: LicensedCatalogRow) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

async function validateManifest(inputPath: string): Promise<void> {
  const manifestPath = path.resolve(inputPath);
  if (!existsSync(manifestPath)) {
    throw new Error(`Không tìm thấy manifest: ${manifestPath}`);
  }

  const [rows, books] = await Promise.all([
    parseManifest(manifestPath),
    prisma.book.findMany({
      orderBy: { id: "asc" },
      select: { id: true },
    }),
  ]);
  const expectedIds = new Set(books.map((book) => book.id));
  const seenIds = new Set<string>();
  const errors: string[] = [];
  let contentBytes = 0;
  let coverBytes = 0;

  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    const bookId = row.book_id?.trim();
    if (!bookId || !expectedIds.has(bookId)) {
      errors.push(`Dòng ${line}: book_id không tồn tại trong database.`);
      continue;
    }
    if (seenIds.has(bookId)) {
      errors.push(`Dòng ${line}: book_id ${bookId} bị trùng.`);
      continue;
    }
    seenIds.add(bookId);

    if (!row.vietnamese_title?.trim()) {
      errors.push(`Dòng ${line} (${bookId}): thiếu tên tiếng Việt.`);
    }
    if (row.title_reviewed?.trim().toLowerCase() !== "true") {
      errors.push(`Dòng ${line} (${bookId}): tên sách chưa được duyệt thủ công.`);
    }
    if (!row.license_reference?.trim()) {
      errors.push(`Dòng ${line} (${bookId}): thiếu mã/tham chiếu giấy phép.`);
    }

    const totalPages = Number(row.total_pages);
    const includedPages = Number(row.included_pages);
    if (
      !Number.isInteger(totalPages) ||
      totalPages < 1 ||
      !Number.isInteger(includedPages) ||
      includedPages < Math.ceil(totalPages * 0.5)
    ) {
      errors.push(
        `Dòng ${line} (${bookId}): included_pages phải đạt ít nhất 50% total_pages.`,
      );
    }

    for (const [field, value] of [
      ["content_file", row.content_file],
      ["cover_file", row.cover_file],
    ] as const) {
      const absolutePath = resolveWorkspaceFile(value ?? "");
      if (!absolutePath || !existsSync(absolutePath)) {
        errors.push(`Dòng ${line} (${bookId}): ${field} không hợp lệ hoặc chưa tồn tại.`);
        continue;
      }
      const bytes = (await readFile(absolutePath)).byteLength;
      if (bytes < 1_024) {
        errors.push(`Dòng ${line} (${bookId}): ${field} quá nhỏ (${bytes} byte).`);
      }
      if (field === "content_file") contentBytes += bytes;
      else coverBytes += bytes;
    }
  }

  const missingIds = [...expectedIds].filter((bookId) => !seenIds.has(bookId));
  if (missingIds.length > 0) {
    errors.push(
      `Manifest thiếu ${missingIds.length} sách, ví dụ: ${missingIds.slice(0, 10).join(", ")}.`,
    );
  }
  if (rows.length !== books.length) {
    errors.push(`Manifest có ${rows.length} dòng, database có ${books.length} sách.`);
  }

  const report = {
    mode: "validate",
    manifestPath,
    databaseBooks: books.length,
    manifestRows: rows.length,
    validatedBooks: seenIds.size,
    contentBytes,
    coverBytes,
    errors: errors.slice(0, 200),
    totalErrors: errors.length,
  };
  console.log(JSON.stringify(report, null, 2));

  if (errors.length > 0) {
    throw new Error(
      `Manifest chưa sẵn sàng: ${errors.length} lỗi. Không có dữ liệu nào được ghi.`,
    );
  }
}

async function main(): Promise<void> {
  const validateArgument = process.argv.find((argument) =>
    argument.startsWith("--validate="),
  );
  if (validateArgument) {
    await validateManifest(validateArgument.slice("--validate=".length));
    return;
  }

  await prepareTemplate();
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

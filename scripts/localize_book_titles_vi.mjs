import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const outputPath =
  process.env.BOOK_TITLE_VI_OUTPUT ?? "/tmp/book-title-vi-map.json";
const batchSize = Number(process.env.BOOK_TITLE_VI_BATCH_SIZE ?? 24);
const dryRun = process.argv.includes("--dry-run");

function cleanTitle(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

async function translateText(text, sourceLanguage = "auto") {
  const params = new URLSearchParams({
    client: "gtx",
    sl: sourceLanguage,
    tl: "vi",
    dt: "t",
    q: text,
  });
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?${params}`,
    );
    if (response.ok) {
      const payload = await response.json();
      return cleanTitle(
        (payload?.[0] ?? []).map((segment) => segment?.[0] ?? "").join(""),
      );
    }
    if (attempt === 6) {
      throw new Error(`Dịch thất bại với HTTP ${response.status}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
}

async function translateBatch(titles) {
  const translated = await translateText(titles.join("\n"));
  const lines = translated
    .split(/\r?\n/)
    .map(cleanTitle)
    .filter(Boolean);

  if (lines.length === titles.length) {
    return lines;
  }

  // Dịch riêng từng tên khi dịch vụ gộp hoặc làm mất dấu xuống dòng.
  const fallback = [];
  for (const title of titles) {
    fallback.push(await translateText(title));
  }
  return fallback;
}

async function main() {
  const books = await prisma.book.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      title: true,
      languageCode: true,
    },
  });

  const uniqueTitles = [...new Set(books.map((book) => cleanTitle(book.title)))];
  let cachedTranslations = {};
  try {
    cachedTranslations = JSON.parse(await fs.readFile(outputPath, "utf8")).translations ?? {};
  } catch {
    // Lần chạy đầu chưa có cache.
  }
  const translations = new Map(Object.entries(cachedTranslations));

  for (let index = 0; index < uniqueTitles.length; index += batchSize) {
    const sourceBatch = uniqueTitles
      .slice(index, index + batchSize)
      .filter((title) => !translations.has(title));
    if (sourceBatch.length === 0) {
      continue;
    }
    const translatedBatch = await translateBatch(sourceBatch);

    sourceBatch.forEach((title, batchIndex) => {
      translations.set(title, translatedBatch[batchIndex] || title);
    });
    await fs.writeFile(
      outputPath,
      JSON.stringify({ translations: Object.fromEntries(translations) }),
      "utf8",
    );

    console.log(
      `Đã dịch ${Math.min(index + batchSize, uniqueTitles.length)}/${uniqueTitles.length} tên duy nhất.`,
    );
  }

  const records = books.map((book) => ({
    id: book.id,
    languageCode: book.languageCode,
    originalTitle: cleanTitle(book.title),
    vietnameseTitle:
      translations.get(cleanTitle(book.title)) || cleanTitle(book.title),
  }));
  const changedRecords = records.filter(
    (record) => record.vietnameseTitle !== record.originalTitle,
  );

  await fs.writeFile(
    outputPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "database",
        targetLanguage: "vi",
        totalBooks: records.length,
        changedBooks: changedRecords.length,
        books: records,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (!dryRun) {
    const chunkSize = 100;
    for (let index = 0; index < changedRecords.length; index += chunkSize) {
      const chunk = changedRecords.slice(index, index + chunkSize);
      await prisma.$transaction(
        chunk.map((record) =>
          prisma.book.update({
            where: { id: record.id },
            data: { title: record.vietnameseTitle },
          }),
        ),
      );
      console.log(
        `Đã cập nhật ${Math.min(index + chunkSize, changedRecords.length)}/${changedRecords.length} sách.`,
      );
    }
  }

  console.log(
    JSON.stringify({
      dryRun,
      totalBooks: records.length,
      uniqueTitles: uniqueTitles.length,
      changedBooks: changedRecords.length,
      outputPath,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

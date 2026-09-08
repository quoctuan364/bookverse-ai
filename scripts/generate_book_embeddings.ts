import {
  generateBookEmbedding,
  getEmbeddingModel,
  getEmbeddingProvider,
} from "@/lib/book-embeddings";
import prisma from "@/lib/prisma";

function parseLimit(): number | undefined {
  const index = process.argv.findIndex((value) => value === "--limit");
  const rawValue = index >= 0 ? process.argv[index + 1] : undefined;

  if (!rawValue) {
    return undefined;
  }

  const limit = Number(rawValue);

  if (!Number.isInteger(limit) || limit <= 0) {
    return undefined;
  }

  return limit;
}

async function main() {
  const provider = getEmbeddingProvider();
  const model = getEmbeddingModel(provider);
  const limit = parseLimit();

  const books = await prisma.book.findMany({
    orderBy: {
      id: "asc",
    },
    take: limit,
    select: {
      id: true,
      title: true,
    },
  });

  console.log(`Đang tạo embedding cho ${books.length} sách bằng ${provider}/${model}.`);

  for (const [index, book] of books.entries()) {
    const result = await generateBookEmbedding(book.id);
    console.log(
      `[${index + 1}/${books.length}] Đã lưu embedding: ${result.bookId} - ${result.title} (${result.dimensions} chiều)`,
    );
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[generate_book_embeddings] ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

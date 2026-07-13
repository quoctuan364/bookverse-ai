"use server";

import prisma from "@/lib/prisma";

type DecimalLike = {
  toNumber: () => number;
};

export interface AssistantBookSuggestion {
  id: string;
  title: string;
  author: string;
  coverImage: string | null;
  price: number;
  category: string;
  rating: number | null;
  reason: string;
}

export interface AssistantResponse {
  query: string;
  answer: string;
  suggestions: AssistantBookSuggestion[];
}

function decimalToNumber(value: DecimalLike | number | string | null): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

function normalizeCoverPath(coverPath: string | null): string | null {
  if (!coverPath) {
    return null;
  }

  if (coverPath.startsWith("/") || coverPath.startsWith("http")) {
    return coverPath;
  }

  return `/${coverPath}`;
}

function buildReason(query: string, category: string, rating: number | null): string {
  if (!query.trim()) {
    return rating ? `Sách nổi bật trong ${category}, rating ${rating.toFixed(1)}/5.` : `Sách nổi bật trong ${category}.`;
  }

  return `Phù hợp với nhu cầu "${query}" nhờ chủ đề ${category} và metadata trong catalog.`;
}

export async function askBookAssistant(query: string): Promise<AssistantResponse> {
  const cleanQuery = query.trim();

  try {
    const books = await prisma.book.findMany({
      where: cleanQuery
        ? {
            OR: [
              {
                title: {
                  contains: cleanQuery,
                  mode: "insensitive",
                },
              },
              {
                authorName: {
                  contains: cleanQuery,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: cleanQuery,
                  mode: "insensitive",
                },
              },
              {
                category: {
                  name: {
                    contains: cleanQuery,
                    mode: "insensitive",
                  },
                },
              },
              {
                tags: {
                  some: {
                    name: {
                      contains: cleanQuery,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {},
      orderBy: [
        {
          rating: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 6,
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    const suggestions = books.map((book) => {
      const rating = decimalToNumber(book.rating);

      return {
        id: book.id,
        title: book.title,
        author: book.authorName,
        coverImage: normalizeCoverPath(book.coverPath),
        price: decimalToNumber(book.price) ?? 0,
        category: book.category.name,
        rating,
        reason: buildReason(cleanQuery, book.category.name, rating),
      };
    });

    if (suggestions.length === 0) {
      return {
        query: cleanQuery,
        answer:
          "Mình chưa tìm thấy sách khớp trực tiếp. Bạn có thể thử từ khóa rộng hơn như AI, UX/UI, tài chính, kỹ năng mềm hoặc trinh thám.",
        suggestions: [],
      };
    }

    return {
      query: cleanQuery,
      answer: cleanQuery
        ? `Mình tìm thấy ${suggestions.length} sách phù hợp với nhu cầu "${cleanQuery}". Ưu tiên mở sách có rating cao và còn listing marketplace nếu bạn muốn demo mua hàng.`
        : "Dưới đây là các sách nổi bật để bạn bắt đầu. Nhập nhu cầu cụ thể để trợ lý lọc sát hơn.",
      suggestions,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[askBookAssistant] ${message}`);
    return {
      query: cleanQuery,
      answer: "Trợ lý chưa truy vấn được dữ liệu. Vui lòng kiểm tra kết nối database.",
      suggestions: [],
    };
  }
}

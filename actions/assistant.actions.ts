"use server";

import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import { normalizeBookPrice } from "@/lib/book-display-price";
import prisma from "@/lib/prisma";
import { publicExperienceBookWhere } from "@/lib/public-book-policy";

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

function buildReason(query: string, category: string, rating: number | null): string {
  if (!query.trim()) {
    return rating ? `Sách nổi bật trong ${category}, rating ${rating.toFixed(1)}/5.` : `Sách nổi bật trong ${category}.`;
  }

  return `Phù hợp với nhu cầu "${query}" nhờ chủ đề ${category} và thông tin mô tả trong danh mục sách.`;
}

/**
 * Adapter của UI /assistant cũ, chỉ giữ lại cho feature flag rollback trong Checkpoint D.
 * Luồng mặc định dùng contract chung qua /api/chat.
 */
export async function askBookAssistant(query: string): Promise<AssistantResponse> {
  const cleanQuery = query.trim();

  try {
    const books = await prisma.book.findMany({
      where: cleanQuery
        ? {
            ...publicExperienceBookWhere(),
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
        : publicExperienceBookWhere(),
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
        title: getVietnameseBookTitle(book.id, book.title),
        author: book.authorName,
        coverImage: normalizeBookCoverUrl(book.coverPath),
        price: normalizeBookPrice(book.price),
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
        ? `Mình tìm thấy ${suggestions.length} sách phù hợp với nhu cầu "${cleanQuery}". Ưu tiên mở sách có rating cao và còn tin bán sách marketplace nếu bạn muốn demo mua hàng.`
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

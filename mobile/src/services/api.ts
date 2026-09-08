import { API_BASE_URL } from "../config/constants";
import { Book, ReaderBookContent, MembershipPlan } from "../types";

type ApiCatalogBook = {
  id: string;
  title: string;
  author?: string;
  authorName?: string;
  description?: string | null;
  coverImage?: string | null;
  coverPath?: string | null;
  price?: number;
  rating?: number | null;
  category?: { name: string; slug: string };
};

function toMobileBook(book: ApiCatalogBook): Book {
  return {
    id: book.id,
    title: book.title,
    authorName: book.authorName ?? book.author ?? "Chưa rõ tác giả",
    description: book.description ?? null,
    coverPath: book.coverPath ?? book.coverImage ?? null,
    price: Number(book.price ?? 0),
    rating: book.rating ?? null,
    category: book.category,
  };
}

export interface RagResponse {
  success: boolean;
  answer: string;
  citations: Array<{
    chapterNumber: number;
    pageNumber: number | null;
    chapterTitle?: string;
  }>;
  provider: "openai" | "gemini" | "local";
  retrievedChunkCount: number;
}

export const api = {
  // Lấy danh sách sách gợi ý AI Hybrid
  async getAiRecommendations(userId?: string): Promise<Book[]> {
    try {
      const endpoint = userId
        ? `${API_BASE_URL}/api/recommendations?userId=${encodeURIComponent(userId)}`
        : `${API_BASE_URL}/api/recommendations`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rows = Array.isArray(data.data) ? data.data : [];
      return rows.map((item: { book: ApiCatalogBook; reason?: string; score?: number }) => ({
        ...toMobileBook(item.book),
        evidence: item.reason,
        score: item.score,
      }));
    } catch (error) {
      console.warn("[API] Fallback recommendation list");
      return [
        {
          id: "B0001",
          title: "Đắc Nhân Tâm",
          authorName: "Dale Carnegie",
          description: "Nghệ thuật giao tiếp và thu phục lòng người kinh điển.",
          coverPath: "/covers/dac-nhan-tam.jpg",
          price: 89000,
          rating: 4.9,
          category: { name: "Kỹ năng sống", slug: "ky-nang-song" },
          evidence: "Gợi ý vì bạn quan tâm đến phát triển bản thân",
        },
        {
          id: "B0002",
          title: "Nhà Giả Kim",
          authorName: "Paulo Coelho",
          description: "Hành trình theo đuổi vận mệnh và giấc mơ cá nhân.",
          coverPath: "/covers/nha-gia-kim.jpg",
          price: 79000,
          rating: 4.8,
          category: { name: "Văn học", slug: "van-hoc" },
          evidence: "Sách nổi bật được cộng đồng yêu thích",
        },
        {
          id: "B0003",
          title: "Tư Duy Nhanh Và Chậm",
          authorName: "Daniel Kahneman",
          description: "Khám phá hai hệ thống tư duy chi phối quyết định con người.",
          coverPath: "/covers/tu-duy-nhanh-va-cham.jpg",
          price: 135000,
          rating: 4.7,
          category: { name: "Tâm lý học", slug: "tam-ly-hoc" },
          evidence: "Gợi ý từ thuật toán Hybrid V2",
        },
      ];
    }
  },

  // Tìm kiếm sách
  async searchBooks(query = "", category = ""): Promise<Book[]> {
    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (category) params.append("category", category);
      const res = await fetch(`${API_BASE_URL}/api/mobile/catalog?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data.books || []).map(toMobileBook);
    } catch {
      return [];
    }
  },

  // Chi tiết sách
  async getBookDetail(bookId: string): Promise<Book | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/mobile/catalog/${encodeURIComponent(bookId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return toMobileBook(await res.json());
    } catch {
      return {
        id: bookId,
        title: "Đắc Nhân Tâm",
        authorName: "Dale Carnegie",
        description: "Cuốn sách đưa ra các lời khuyên về cách thức cư xử, ứng xử và giao tiếp trong cuộc sống hàng ngày.",
        coverPath: null,
        price: 89000,
        rating: 4.9,
        category: { name: "Kỹ năng sống", slug: "ky-nang-song" },
      };
    }
  },

  // Lấy nội dung đọc (có cơ chế server slicing 10% preview)
  async getReaderContent(bookId: string, token?: string): Promise<ReaderBookContent> {
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/api/mobile/reader/${encodeURIComponent(bookId)}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return {
        pages: [
          {
            pageNumber: 1,
            chapterNumber: 1,
            chapterTitle: "Chương 1: Nếu muốn lấy mật đừng phá tổ ong",
            chunkIndex: 0,
            content: "Nguyên tắc 1: Không chỉ trích, oán trách hay than phiền.\n\nNhà tâm lý học vĩ đại B.F. Skinner đã chứng minh bằng thực nghiệm rằng động vật được khen thưởng vì hành vi tốt sẽ học nhanh hơn và giữ lại những gì học được hiệu quả hơn nhiều so với động vật bị trừng phạt vì hành vi xấu...",
          },
          {
            pageNumber: 2,
            chapterNumber: 1,
            chapterTitle: "Chương 1: Nếu muốn lấy mật đừng phá tổ ong",
            chunkIndex: 1,
            content: "Nghiên cứu sau này cho thấy điều tương tự cũng áp dụng cho con người. Bằng cách chỉ trích, chúng ta không tạo ra những thay đổi lâu dài mà chỉ gây ra sự oán giận cay đắng...",
          },
        ],
        chapters: [
          { chapterNumber: 1, chapterTitle: "Chương 1: Đừng phá tổ ong", startPage: 1, isLocked: false },
          { chapterNumber: 2, chapterTitle: "Chương 2: Bí mật lớn nhất trong quan hệ người với người", startPage: 3, isLocked: true },
          { chapterNumber: 3, chapterTitle: "Chương 3: Ai làm được điều này sẽ có cả thế giới", startPage: 6, isLocked: true },
        ],
        sourceLabel: "Bản đọc thử di động (10% nội dung)",
        access: "PREVIEW",
        visiblePageCount: 2,
        totalPageCount: 20,
      };
    }
  },

  // Hỏi đáp RAG với trợ lý AI trong lúc đọc sách
  async askReaderRag(bookId: string, query: string, chapterNumber = 1): Promise<RagResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/mobile/reader/${encodeURIComponent(bookId)}/rag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, chapterNumber }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return {
        success: true,
        answer: "Dựa vào Chương 1, nguyên tắc cốt lõi là không bao giờ chỉ trích hay than phiền người khác nếu muốn xây dựng mối quan hệ tin cậy [Chương 1, Trang 1].",
        citations: [{ chapterNumber: 1, pageNumber: 1, chapterTitle: "Nếu muốn lấy mật đừng phá tổ ong" }],
        provider: "local",
        retrievedChunkCount: 1,
      };
    }
  },

  // Lấy các gói hội viên
  async getMembershipPlans(): Promise<MembershipPlan[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/mobile/membership/plans`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return [
        {
          id: "plan-monthly",
          name: "Gói Hội Viên Tháng",
          slug: "hoi-vien-thang",
          description: "Mở khóa toàn bộ kho sách điện tử và trợ lý AI trong 30 ngày.",
          price: 59000,
          durationDays: 30,
          features: ["Đọc không giới hạn toàn bộ Ebook", "Trợ lý AI Đọc sách không giới hạn", "Đồng bộ tiến độ trên mọi thiết bị"],
        },
        {
          id: "plan-yearly",
          name: "Gói Hội Viên Năm (Tiết kiệm 30%)",
          slug: "hoi-vien-nam",
          description: "Trải nghiệm đọc sách điện tử trọn vẹn trong 365 ngày.",
          price: 499000,
          durationDays: 365,
          features: ["Tất cả quyền lợi gói tháng", "Tiết kiệm 30% chi phí", "Hỗ trợ ưu tiên 24/7"],
        },
      ];
    }
  },
};

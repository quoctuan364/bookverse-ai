import type { RecommendationEvidenceStatus } from "@/lib/recommendation-evidence-policy";

/** Dữ liệu tối thiểu để hiển thị một sách trên Trang chủ. */
export interface HomeShelfBook {
  id: string;
  title: string;
  author: string;
  category: string | null;
  coverImage: string | null;
  price: number;
  sourceRating: number | null;
  ratingCount: number | null;
  availableListingId: string | null;
  isFavorite: boolean;
  recommendationEvidence?: string;
  recommendationEvidenceStatus?: RecommendationEvidenceStatus;
}

export interface HomeShelfResult {
  books: HomeShelfBook[];
  error: string | null;
}

export interface HomeGenreShelf {
  id: string;
  name: string;
  catalogKey: string;
  books: HomeShelfBook[];
}

export interface HomeContinueReadingBook extends HomeShelfBook {
  currentPage: number;
  currentChapter: number;
  progressPercent: number;
}


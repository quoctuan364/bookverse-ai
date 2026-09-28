import { getRecommendedBooks } from "@/actions/recommendation.actions";
import { AiRecommendationShowcase } from "@/components/home/AiRecommendationShowcase";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import type { HomeShelfBook } from "@/lib/home-shelf-types";

const HOME_SHELF_SIZE = 6;

/**
 * Server Component bất đồng bộ — gọi AI service độc lập với phần còn lại của trang chủ.
 * Được bọc trong <Suspense> để Next.js stream HTML ngay khi hero/shelves sẵn sàng;
 * section này tự điền vào sau mà không block render ban đầu.
 */
export async function AiRecommendationSection() {
  const batch = await getRecommendedBooks();

  const books: HomeShelfBook[] = batch.books.slice(0, HOME_SHELF_SIZE).map((book) => ({
    id: book.id,
    title: getVietnameseBookTitle(book.id, book.title),
    author: book.author,
    category: book.category ?? null,
    coverImage: book.coverImage,
    price: book.price,
    sourceRating: null,
    ratingCount: null,
    recommendationEvidence: book.recommendationEvidence,
    recommendationEvidenceStatus: book.recommendationEvidenceStatus,
    availableListingId: book.availableListingId ?? null,
    isFavorite: book.isFavorite ?? false,
  }));

  return (
    <AiRecommendationShowcase
      books={books}
      hasVerifiedPersonalization={batch.hasVerifiedPersonalization}
      recommendationRequestId={batch.requestId}
    />
  );
}

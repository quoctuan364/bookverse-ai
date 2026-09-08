export function getCatalogHeroDescription(totalBooks: number): string {
  const safeTotal = Number.isFinite(totalBooks) && totalBooks >= 0
    ? Math.floor(totalBooks)
    : 0;

  return `Khám phá ${safeTotal.toLocaleString("vi-VN")} đầu sách phù hợp, tìm nhanh theo tên, tác giả, thể loại hoặc ngôn ngữ.`;
}

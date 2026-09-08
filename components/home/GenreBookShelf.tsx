import { BookCard } from "@/components/shared/BookCard";
import { GenreShelfTabs } from "@/components/home/GenreShelfTabs";
import { HomeShelfScroller } from "@/components/home/HomeShelfScroller";
import type { HomeGenreShelf } from "@/lib/home-shelf-types";

interface GenreBookShelfProps {
  genres: HomeGenreShelf[];
  error?: string | null;
}

/** BookCard vẫn được render ở server; client chỉ đổi panel đang hiển thị. */
export function GenreBookShelf({ genres, error }: GenreBookShelfProps) {
  return (
    <GenreShelfTabs
      error={error}
      panels={genres.map((genre) => ({
        id: genre.id,
        name: genre.name,
        catalogKey: genre.catalogKey,
        content: (
          <HomeShelfScroller ariaLabel={`Kệ thể loại ${genre.name}`}>
            {genre.books.slice(0, 12).map((book) => (
              <BookCard
                book={{ ...book, priceLabel: "Giá BookVerse" }}
                key={`${genre.id}-${book.id}`}
                returnPath="/"
                showQuickActions={false}
              />
            ))}
          </HomeShelfScroller>
        ),
      }))}
    />
  );
}


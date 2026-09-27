import { GenreShelfTabs } from "@/components/home/GenreShelfTabs";
import type { HomeGenreShelf } from "@/lib/home-shelf-types";

interface GenreBookShelfProps {
  genres: HomeGenreShelf[];
  error?: string | null;
}

/** BookCard vẫn được render ở server; client chỉ đổi panel đang hiển thị. */
export function GenreBookShelf({ genres, error }: GenreBookShelfProps) {
  return <GenreShelfTabs error={error} genres={genres} />;
}

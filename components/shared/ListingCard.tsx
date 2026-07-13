import { BookListingCard, type BookListingCardData } from "@/components/shared/BookListingCard";

export type ListingCardData = BookListingCardData;

interface ListingCardProps {
  listing: ListingCardData;
}

export function ListingCard({ listing }: ListingCardProps) {
  return <BookListingCard listing={listing} />;
}

import { getReaderPageData } from "@/actions/reader.actions";
import { OnlineReaderClient } from "./ReaderClient";

interface OnlineReaderPageProps {
  params: Promise<{ bookId: string }>;
}

/**
 * Nạp nội dung ngay trên server để HTML đầu tiên đã có trang sách. Client chỉ
 * hydrate các thao tác tương tác, không còn phải hiện màn hình chờ rồi gọi lại.
 */
export default async function OnlineReaderPage({ params }: OnlineReaderPageProps) {
  const { bookId: rawBookId } = await params;
  const bookId = rawBookId.trim() || "unknown-book";
  const initialData = await getReaderPageData(bookId);

  return <OnlineReaderClient bookId={bookId} initialData={initialData} />;
}

import { BookCover } from "@/components/shared/BookCover";

const fixtures = [
  { id: "PREVIEW-4", title: "Kiến trúc trí tuệ nhân tạo", author: "Lê Minh Khoa", category: "Technology" },
  { id: "PREVIEW-1", title: "Chiến lược kinh doanh bền vững", author: "Nguyễn An", category: "Business" },
  { id: "PREVIEW-6", title: "Những mùa gió đi qua", author: "Trần Hà", category: "Literature" },
  { id: "PREVIEW-3", title: "Dòng chảy lịch sử Việt", author: "Phạm Quang", category: "History" },
  { id: "PREVIEW-2", title: "Sống khỏe mỗi ngày", author: "Bác sĩ Mai Anh", category: "Health" },
  { id: "PREVIEW-5", title: "Ngôn ngữ và thế giới", author: "Đỗ Linh", category: "Language" },
  { id: "PREVIEW-7", title: "Vũ trụ trong một hạt bụi", author: "Vũ Nam", category: "Science" },
  { id: "PREVIEW-8", title: "Hành trình qua miền di sản", author: "Hoàng Vy", category: "Travel" },
] as const;

export default function CoverSystemPage() {
  return (
    <main className="min-h-screen bg-[#0B111A] px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Generated demo asset</p>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">Hệ thống bìa BookVerse V2</h1>
        <p className="mt-4 max-w-3xl leading-7 text-zinc-300">
          Trang kiểm tra thiết kế tĩnh. Đây là artwork demo nguyên bản, không phải bìa nhà xuất bản và
          không được báo cáo là bìa thật.
        </p>

        <section className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          {fixtures.map((book) => (
            <article key={book.id}>
              <BookCover
                author={book.author}
                bookId={book.id}
                category={book.category}
                className="w-full rounded-md shadow-[0_18px_45px_rgba(0,0,0,0.42)]"
                src={null}
                title={book.title}
              />
              <p className="mt-3 text-xs font-bold text-zinc-200">{book.category}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{book.id}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

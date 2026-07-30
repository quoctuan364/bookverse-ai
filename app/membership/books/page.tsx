import Link from "next/link";
import { getMembershipBooks } from "@/actions/membership.actions";
import { BookCover } from "@/components/shared/BookCover";

export const dynamic = "force-dynamic";

export default async function MembershipBooksPage({ searchParams }: { searchParams?: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const data = await getMembershipBooks(Number(params?.page ?? 1));
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">Member Library</p>
          <h1 className="mt-2 text-4xl font-black">Kho sách hội viên</h1>
          <p className="mt-3 text-[#EAF5F1]">{data.total} đầu sách đang có trong kho đọc chung của mọi gói hội viên.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {data.books.map((book) => (
            <article className="min-w-0" key={book.id}>
              <Link href={`/book/${book.id}`}>
                <BookCover
                  alt={`Bìa ${book.title}`}
                  author={book.authorName}
                  bookId={book.id}
                  className="aspect-[2/3] w-full rounded-xl object-cover shadow-lg"
                  src={book.coverPath}
                  title={book.title}
                />
                <h2 className="mt-3 line-clamp-2 font-black text-[#17202A]">{book.title}</h2>
              </Link>
              <p className="mt-1 truncate text-sm text-[#66706B]">{book.authorName}</p>
              <Link className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-[#176B62] px-3 py-2 text-sm font-black text-white transition hover:bg-[#104C47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] focus-visible:ring-offset-2" href={`/read/${book.id}`}>Đọc ngay</Link>
            </article>
          ))}
        </div>
        {data.books.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-[#66706B]">Chưa có sách đang hoạt động.</p> : null}
        <div className="mt-9 flex justify-center gap-3">
          {data.page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-lg border bg-white px-4 py-2 font-bold transition hover:bg-[#F7F4ED]" href={`/membership/books?page=${data.page - 1}`}>Trang trước</Link> : null}
          <span className="px-4 py-2 text-sm text-[#66706B]">{data.page}/{totalPages}</span>
          {data.page < totalPages ? <Link className="inline-flex min-h-11 items-center rounded-lg border bg-white px-4 py-2 font-bold transition hover:bg-[#F7F4ED]" href={`/membership/books?page=${data.page + 1}`}>Trang sau</Link> : null}
        </div>
      </section>
    </main>
  );
}

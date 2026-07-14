import Link from "next/link";
import { Bot, Search, Sparkles } from "lucide-react";
import { askBookAssistant } from "@/actions/assistant.actions";
import { AssistantPageClient } from "@/components/assistant/AssistantPageClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

interface AssistantPageProps {
  searchParams?: Promise<{
    q?: string;
  }>;
}

const fallbackCover =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%23153A3F'/%3E%3Crect x='48' y='56' width='304' height='488' rx='18' fill='%23F8F6F1' opacity='0.94'/%3E%3Ctext x='200' y='292' text-anchor='middle' font-family='Arial,sans-serif' font-size='38' font-weight='700' fill='%23153A3F'%3EBookVerse%3C/text%3E%3Ctext x='200' y='338' text-anchor='middle' font-family='Arial,sans-serif' font-size='28' fill='%23153A3F'%3EAI%3C/text%3E%3C/svg%3E";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function AssistantPage({ searchParams }: AssistantPageProps) {
  const params = await searchParams;
  const query = params?.q ?? "";

  // Feature flag rollback giữ UI tìm kiếm cũ trong một release, không đổi database.
  if (process.env.BOOKVERSE_ASSISTANT_LEGACY_UI !== "true") {
    return <AssistantPageClient initialQuery={query} />;
  }

  const response = await askBookAssistant(query);

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
            <Bot className="h-4 w-4 text-[#F2C14E]" aria-hidden="true" />
            BookVerse AI Assistant
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Tư vấn sách từ dữ liệu nội bộ</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#EAF5F1]">
            Nhập nhu cầu đọc sách, trợ lý sẽ tìm trong catalog, category và tag để trả về gợi ý có lý do.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
        <aside className="bv-card h-fit rounded-lg p-5">
          <h2 className="text-xl font-black text-[#17202A]">Hỏi trợ lý</h2>
          <form className="mt-5 space-y-4">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66706B]"
              />
              <Input
                className="pl-10"
                defaultValue={query}
                name="q"
                placeholder="Ví dụ: UX UI thực chiến, sách học AI..."
                type="search"
              />
            </div>
            <Button className="w-full gap-2" type="submit">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Gợi ý sách
            </Button>
          </form>

          <div className="mt-5 rounded-lg bg-[#EAF2EF] px-4 py-3 text-sm leading-6 text-[#42524D]">
            Có thể demo với các từ khóa: AI, UX/UI, tài chính cá nhân, kỹ năng mềm, trinh thám,
            quản trị sản phẩm.
          </div>
        </aside>

        <section className="grid gap-5">
          <div className="bv-card rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0F766E] text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)]">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#E76F51]">Phản hồi</p>
                <p className="mt-2 leading-7 text-[#42524D]">{response.answer}</p>
              </div>
            </div>
          </div>

          {response.suggestions.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {response.suggestions.map((book) => (
                <Link
                  aria-label={`Xem chi tiết sách ${book.title}`}
                  className="block"
                  href={`/book/${book.id}`}
                  key={book.id}
                >
                  <article className="group overflow-hidden rounded-lg border border-[#17191F]/10 bg-[#FFFDF8] shadow-[0_12px_34px_rgba(39,44,51,0.08)] transition hover:-translate-y-1 hover:border-[#0F766E]/30 hover:shadow-[0_22px_46px_rgba(39,44,51,0.12)]">
                    <div className="flex gap-4 p-4">
                      <div className="aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-lg bg-[#EDE3D5] shadow-[0_12px_26px_rgba(39,44,51,0.12)]">
                        <img
                          alt={`Bìa sách ${book.title}`}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          src={book.coverImage ?? fallbackCover}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Badge className="border-0 bg-[#EAF2EF] text-[#0F3F3C]">{book.category}</Badge>
                        <h2 className="mt-3 line-clamp-2 text-base font-black leading-6 text-[#17202A]">
                          {book.title}
                        </h2>
                        <p className="mt-1 truncate text-sm font-medium text-[#66706B]">{book.author}</p>
                        <p className="mt-2 font-black text-[#E76F51]">{formatPrice(book.price)}</p>
                      </div>
                    </div>
                    <div className="border-t border-[#17191F]/10 bg-[#F7F4ED] px-4 py-3">
                      <p className="line-clamp-2 text-sm leading-6 text-[#42524D]">{book.reason}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bv-card rounded-lg p-8 text-center text-sm text-[#66706B]">
              Chưa có sách phù hợp với truy vấn hiện tại.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Search, Sparkles } from "lucide-react";
import { askBookAssistant } from "@/actions/assistant.actions";
import { getMyAssistantHistory } from "@/actions/assistant-history.actions";
import { AssistantPageClient } from "@/components/assistant/AssistantPageClient";
import { BookCover } from "@/components/shared/BookCover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nova - Trợ lý đọc sách | BookVerse",
  description: "Hỏi Nova về sách, hội viên, đơn hàng hoặc cách sử dụng BookVerse.",
};

function getAssistantRuntimeMode(): "external" | "local" {
  const provider = process.env.BOOKVERSE_LLM_PROVIDER?.trim().toLowerCase();
  if (provider === "openai") return process.env.OPENAI_API_KEY ? "external" : "local";
  if (provider === "gemini") return process.env.GEMINI_API_KEY ? "external" : "local";
  if (provider === "local") return "local";
  return process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY ? "external" : "local";
}

interface AssistantPageProps {
  searchParams?: Promise<{
    q?: string;
  }>;
}

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
    const [history, starterResponse] = await Promise.all([
      getMyAssistantHistory(),
      askBookAssistant(""),
    ]);
    return (
      <AssistantPageClient
        history={history}
        initialQuery={query}
        runtimeMode={getAssistantRuntimeMode()}
        starterBooks={starterResponse.suggestions.slice(0, 3)}
      />
    );
  }

  const response = await askBookAssistant(query);

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
            <Bot className="h-4 w-4 text-bv-gold" aria-hidden="true" />
            Nova · BookVerse
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Chào bạn, mình là Nova</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-bv-mint-soft">
            Nhập tên sách, chủ đề hoặc thể loại bạn muốn tìm.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
        <aside className="bv-card h-fit rounded-lg p-5">
          <h2 className="text-xl font-black text-bv-heading">Hỏi Nova</h2>
          <form className="mt-5 space-y-4">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bv-text-muted"
              />
              <Input
                className="pl-10"
                defaultValue={query}
                name="q"
                placeholder="Ví dụ: sách thiết kế giao diện cho người mới..."
                type="search"
              />
            </div>
            <Button className="w-full gap-2" type="submit">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Gợi ý sách
            </Button>
          </form>

          <div className="mt-5 rounded-lg bg-bv-muted px-4 py-3 text-sm leading-6 text-[#42524D]">
            Bạn có thể thử tìm sách về công nghệ, thiết kế, tài chính cá nhân, kỹ năng mềm hoặc truyện trinh thám.
          </div>
        </aside>

        <section className="grid gap-5">
          <div className="bv-card rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bv-focus text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)]">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-accent">Phản hồi</p>
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
                  <article className="group overflow-hidden rounded-lg border border-[#17191F]/10 bg-bv-ivory shadow-[0_12px_34px_rgba(39,44,51,0.08)] transition hover:-translate-y-1 hover:border-bv-focus/30 hover:shadow-[0_22px_46px_rgba(39,44,51,0.12)]">
                    <div className="flex gap-4 p-4">
                      <div className="aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-lg bg-[#EDE3D5] shadow-[0_12px_26px_rgba(39,44,51,0.12)]">
                        <BookCover
                          alt={`Bìa sách ${book.title}`}
                          author={book.author}
                          bookId={book.id}
                          category={book.category}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          src={book.coverImage}
                          title={book.title}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Badge className="border-0 bg-bv-muted text-[#0F3F3C]">{book.category}</Badge>
                        <h2 className="mt-3 line-clamp-2 text-base font-black leading-6 text-bv-heading">
                          {book.title}
                        </h2>
                        <p className="mt-1 truncate text-sm font-medium text-bv-text-muted">{book.author}</p>
                        <p className="mt-2 font-black text-bv-accent">{formatPrice(book.price)}</p>
                      </div>
                    </div>
                    <div className="border-t border-[#17191F]/10 bg-bv-surface px-4 py-3">
                      <p className="line-clamp-2 text-sm leading-6 text-[#42524D]">{book.reason}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bv-card rounded-lg p-8 text-center text-sm text-bv-text-muted">
              Chưa có sách phù hợp với truy vấn hiện tại.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

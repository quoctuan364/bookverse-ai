import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Compass,
  Focus,
  Lightbulb,
  MessageCircleMore,
  Mountain,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  getDiscoveryBooks,
  getDiscoveryFilterOptions,
  type DiscoveryLanguage,
  type DiscoveryLength,
  type DiscoveryMood,
} from "@/actions/discovery.actions";
import { getRecommendedBooks } from "@/actions/recommendation.actions";
import { DiscoverPreferencesForm } from "@/components/discover/DiscoverPreferencesForm";
import { BookCard } from "@/components/shared/BookCard";
import { BookCover } from "@/components/shared/BookCover";

export const dynamic = "force-dynamic";

interface DiscoveryPageProps {
  searchParams?: Promise<{
    mood?: string;
    length?: string;
    language?: string;
    category?: string;
  }>;
}

const moods: Array<{
  value: DiscoveryMood;
  label: string;
  description: string;
  icon: typeof Focus;
}> = [
  { value: "FOCUS", label: "Tập trung", description: "Kiến thức và kỹ năng", icon: Focus },
  { value: "RELAX", label: "Thư giãn", description: "Nhẹ nhàng, dễ đọc", icon: Sparkles },
  { value: "INSPIRE", label: "Cảm hứng", description: "Ý tưởng và phát triển", icon: Lightbulb },
  { value: "ADVENTURE", label: "Khám phá", description: "Thế giới và trải nghiệm", icon: Mountain },
];

const lengths: Array<{ value: DiscoveryLength; label: string }> = [
  { value: "SHORT", label: "Đọc nhanh · ≤250 trang" },
  { value: "MEDIUM", label: "Vừa phải · 251–499 trang" },
  { value: "LONG", label: "Đọc sâu · từ 500 trang" },
];

const languages: Array<{ value: DiscoveryLanguage; label: string }> = [
  { value: "ALL", label: "Mọi ngôn ngữ" },
  { value: "VI", label: "Tiếng Việt" },
  { value: "EN", label: "Tiếng Anh" },
  { value: "OTHER", label: "Ngôn ngữ khác" },
];

function safeMood(value?: string): DiscoveryMood {
  return moods.some((item) => item.value === value) ? (value as DiscoveryMood) : "FOCUS";
}

function safeLength(value?: string): DiscoveryLength {
  return lengths.some((item) => item.value === value) ? (value as DiscoveryLength) : "MEDIUM";
}

function safeLanguage(value?: string): DiscoveryLanguage {
  return languages.some((item) => item.value === value) ? (value as DiscoveryLanguage) : "ALL";
}

async function NovaPicksSection() {
  const recommendationBatch = await getRecommendedBooks();
  const recommendationLabel = recommendationBatch.hasVerifiedPersonalization
    ? "Dựa trên sách bạn đã đọc"
    : "Gợi ý từ kho sách BookVerse";

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" id="nova-picks">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-bv-accent">
            <BrainCircuit className="h-4 w-4" aria-hidden="true" /> {recommendationLabel}
          </p>
          <h2 className="mt-2 text-3xl font-black text-bv-heading sm:text-4xl">Nova chọn cho bạn</h2>
          <p className="mt-2 max-w-2xl leading-7 text-bv-text-muted">
            {recommendationBatch.hasVerifiedPersonalization
              ? "Các gợi ý dưới đây dựa trên sách bạn đã đọc và sở thích đã chọn."
              : "Bạn chưa chọn đủ sở thích nên đây là những cuốn nổi bật ở nhiều thể loại."}
          </p>
        </div>
        <span className="rounded-full border border-bv-primary/15 bg-bv-mint px-3 py-2 text-xs font-black text-bv-primary">
          {recommendationBatch.books.length} lựa chọn
        </span>
      </div>

      {recommendationBatch.books.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {recommendationBatch.books.map((book) => (
            <BookCard book={{ ...book, priceLabel: "Giá BookVerse" }} key={book.id} recommendationRequestId={recommendationBatch.requestId} returnPath="/discover" />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-bv-primary/30 bg-white p-9 text-center">
          <Compass className="mx-auto h-9 w-9 text-bv-primary" aria-hidden="true" />
          <h3 className="mt-3 text-xl font-black text-bv-heading">Nova chưa tìm thấy lựa chọn phù hợp</h3>
          <p className="mt-2 text-bv-text-muted">Hãy thử bộ lọc theo tâm trạng bên dưới hoặc trò chuyện trực tiếp với Nova.</p>
        </div>
      )}
    </section>
  );
}

function NovaPicksSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="h-4 w-36 animate-pulse rounded-md bg-bv-primary/10" />
          <div className="mt-2 h-9 w-64 animate-pulse rounded-lg bg-bv-primary/15" />
          <div className="mt-2 h-5 w-80 animate-pulse rounded-md bg-bv-primary/10" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div className="aspect-[2/3] animate-pulse rounded-2xl bg-[#E8F0EC]" key={i} />
        ))}
      </div>
    </section>
  );
}

export default async function DiscoveryPage({ searchParams }: DiscoveryPageProps) {
  const params = await searchParams;
  const mood = safeMood(params?.mood);
  const length = safeLength(params?.length);
  const language = safeLanguage(params?.language);
  const { categories } = await getDiscoveryFilterOptions();
  const categoryId = categories.some((item) => item.id === params?.category)
    ? params?.category
    : "";
  const discoveryBooks = await getDiscoveryBooks(mood, length, { language, categoryId });
  const selectedMood = moods.find((item) => item.value === mood) ?? moods[0];
  const SelectedMoodIcon = selectedMood.icon;

  return (
    <main className="bv-page">
      <section className="relative overflow-hidden bg-[linear-gradient(118deg,#0D4C46_0%,#126B62_58%,#21867A_100%)] text-white">
        <div aria-hidden="true" className="absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full border border-white/15" />
        <div aria-hidden="true" className="absolute right-24 top-20 h-44 w-44 rounded-full bg-bv-gold/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_380px] lg:items-center lg:px-8 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-black backdrop-blur">
              <Sparkles className="h-4 w-4 text-bv-gold" aria-hidden="true" /> Gợi ý sách
            </div>
            <h1 className="bv-editorial mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
              Tìm sách theo sở thích của bạn
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-bv-mint-soft sm:text-lg">
              Chọn tâm trạng, độ dài và thể loại để xem những cuốn phù hợp.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-bv-gold px-5 font-black text-[#17342F] transition hover:bg-[#F7D574] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="#nova-picks">
                Xem gợi ý của Nova <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 font-black text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/assistant?q=Tư vấn cho tôi một cuốn sách phù hợp để đọc hôm nay">
                <MessageCircleMore className="h-4 w-4" aria-hidden="true" /> Trò chuyện với Nova
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/18 bg-[#082F2C]/55 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#F2C14E,#F7D98A)] text-[#17443F] shadow-[0_14px_35px_rgba(242,193,78,0.24)]">
                <BrainCircuit className="h-8 w-8" aria-hidden="true" />
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0C3B37] bg-emerald-300" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-bv-gold">Trợ lý đọc sách</p>
                <h2 className="mt-1 text-2xl font-black">Nova</h2>
                <p className="mt-1 text-sm text-[#CFE7E2]">Sẵn sàng chọn sách cùng bạn</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 border-t border-white/12 pt-5 text-sm leading-6 text-[#D9EEEA]">
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /> Đa dạng tác giả và thể loại, hạn chế lặp lại.</p>
              <p className="flex items-start gap-2"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-bv-gold" aria-hidden="true" /> Bạn có thể đổi bộ lọc để tìm kết quả sát hơn.</p>
            </div>
          </aside>
        </div>
      </section>

      <Suspense fallback={<NovaPicksSkeleton />}>
        <NovaPicksSection />
      </Suspense>

      <section className="border-y border-bv-ink/8 bg-[#F2EFE7]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-bv-accent">Điều chỉnh nhanh</p>
              <h2 className="mt-2 text-3xl font-black text-bv-heading">Bạn đang muốn đọc theo cách nào?</h2>
              <p className="mt-3 leading-7 text-bv-text-muted">Chọn vài sở thích đơn giản để Nova tìm sách phù hợp nhanh hơn.</p>
            </div>

            <DiscoverPreferencesForm
              categories={categories}
              currentCategory={categoryId ?? ""}
              currentLanguage={language}
              currentLength={length}
              currentMood={mood}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-bv-accent"><SelectedMoodIcon className="h-4 w-4" aria-hidden="true" /> {selectedMood.label}</p>
            <h2 className="mt-2 text-3xl font-black text-bv-heading">Khớp với tâm trạng hiện tại</h2>
          </div>
          <Link className="inline-flex min-h-11 items-center gap-2 font-black text-bv-primary" href="/read">Xem toàn bộ kho đọc <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>

        {discoveryBooks.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {discoveryBooks.map((book) => (
              <article className="group min-w-0" key={book.id}>
                <Link className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2" href={`/read/${book.id}`}>
                  <BookCover alt={`Bìa sách ${book.title}`} author={book.author} bookId={book.id} category={book.category} className="aspect-[2/3] w-full rounded-xl shadow-[0_14px_34px_rgba(37,49,56,0.16)] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_20px_42px_rgba(37,49,56,0.22)]" loading="lazy" src={book.coverImage} title={book.title} />
                  <h3 className="mt-3 line-clamp-2 min-h-12 font-black leading-6 text-bv-heading">{book.title}</h3>
                </Link>
                <p className="mt-1 truncate text-sm text-bv-text-muted">{book.author}</p>
                <p className="mt-1 text-xs font-bold text-bv-primary">{book.category} · {book.pages ?? "?"} trang</p>
                <Link className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-bv-primary/20 bg-white px-3 text-sm font-black text-bv-primary transition hover:bg-bv-mint" href={`/read/${book.id}`}><BookOpen className="h-4 w-4" aria-hidden="true" /> Đọc thử</Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-bv-primary/30 bg-white p-9 text-center"><Compass className="mx-auto h-9 w-9 text-bv-primary" aria-hidden="true" /><h3 className="mt-3 text-xl font-black text-bv-heading">Chưa có sách khớp hoàn toàn</h3><p className="mt-2 text-bv-text-muted">Hãy thử tâm trạng hoặc độ dài khác.</p></div>
        )}
      </section>
    </main>
  );
}

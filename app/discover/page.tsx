import Link from "next/link";
import { BookOpen, Compass, Focus, Lightbulb, Mountain, Sparkles } from "lucide-react";
import {
  getDiscoveryBooks,
  getDiscoveryFilterOptions,
  type DiscoveryEra,
  type DiscoveryLanguage,
  type DiscoveryLength,
  type DiscoveryMood,
} from "@/actions/discovery.actions";
import { BookCover } from "@/components/shared/BookCover";

export const dynamic = "force-dynamic";

interface DiscoveryPageProps {
  searchParams?: Promise<{
    mood?: string;
    length?: string;
    language?: string;
    era?: string;
    category?: string;
  }>;
}

const moods: Array<{
  value: DiscoveryMood;
  label: string;
  description: string;
  icon: typeof Focus;
}> = [
  { value: "FOCUS", label: "Tập trung", description: "Học kỹ năng và kiến thức chuyên sâu", icon: Focus },
  { value: "RELAX", label: "Thư giãn", description: "Văn học và câu chuyện nhẹ nhàng", icon: Sparkles },
  { value: "INSPIRE", label: "Tìm cảm hứng", description: "Phát triển bản thân và sáng tạo", icon: Lightbulb },
  { value: "ADVENTURE", label: "Khám phá", description: "Du lịch, lịch sử và thế giới mới", icon: Mountain },
];

const lengths: Array<{ value: DiscoveryLength; label: string; note: string }> = [
  { value: "SHORT", label: "Đọc nhanh", note: "Tối đa 250 trang" },
  { value: "MEDIUM", label: "Vừa phải", note: "251–499 trang" },
  { value: "LONG", label: "Đọc sâu", note: "Từ 500 trang" },
];

const languages: Array<{ value: DiscoveryLanguage; label: string }> = [
  { value: "ALL", label: "Mọi ngôn ngữ" },
  { value: "VI", label: "Tiếng Việt" },
  { value: "EN", label: "Tiếng Anh" },
  { value: "OTHER", label: "Ngôn ngữ khác" },
];

const eras: Array<{ value: DiscoveryEra; label: string }> = [
  { value: "ALL", label: "Mọi năm xuất bản" },
  { value: "CLASSIC", label: "Trước năm 2000" },
  { value: "MODERN", label: "Từ 2000 đến 2019" },
  { value: "RECENT", label: "Từ năm 2020" },
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

function safeEra(value?: string): DiscoveryEra {
  return eras.some((item) => item.value === value) ? (value as DiscoveryEra) : "ALL";
}

export default async function DiscoveryPage({ searchParams }: DiscoveryPageProps) {
  const params = await searchParams;
  const mood = safeMood(params?.mood);
  const length = safeLength(params?.length);
  const language = safeLanguage(params?.language);
  const era = safeEra(params?.era);
  const { categories } = await getDiscoveryFilterOptions();
  const categoryId = categories.some((item) => item.id === params?.category)
    ? params?.category
    : "";
  const books = await getDiscoveryBooks(mood, length, { language, era, categoryId });
  const selectedMood = moods.find((item) => item.value === mood) ?? moods[0];

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">
            <Compass className="h-4 w-4" aria-hidden="true" />
            Mood Discovery
          </p>
          <h1 className="bv-editorial mt-3 max-w-4xl text-4xl font-bold sm:text-6xl">
            Hôm nay bạn muốn đọc gì?
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-[#EAF5F1]">
            Chọn tâm trạng và độ dài mong muốn. BookVerse dùng metadata sách để tạo
            danh sách dễ giải thích, không giả là hành vi người dùng thật.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <form action="/discover" className="bv-card rounded-2xl p-5 sm:p-7">
          <fieldset>
            <legend className="text-xl font-black text-[#17202A]">1. Chọn tâm trạng</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {moods.map(({ value, label, description, icon: Icon }) => (
                <label className={`cursor-pointer rounded-xl border p-4 transition ${
                  mood === value ? "border-[#176B62] bg-[#E6F3F0]" : "border-[#1D2433]/10 bg-white hover:border-[#176B62]/40"
                }`} key={value}>
                  <input className="sr-only" defaultChecked={mood === value} name="mood" type="radio" value={value} />
                  <Icon className="h-5 w-5 text-[#176B62]" aria-hidden="true" />
                  <span className="mt-3 block font-black text-[#17202A]">{label}</span>
                  <span className="mt-1 block text-sm leading-5 text-[#66706B]">{description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-7">
            <legend className="text-xl font-black text-[#17202A]">2. Chọn độ dài</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {lengths.map((item) => (
                <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                  length === item.value ? "border-[#C65D43] bg-[#FFF1E8]" : "border-[#1D2433]/10 bg-white hover:border-[#C65D43]/40"
                }`} key={item.value}>
                  <input defaultChecked={length === item.value} name="length" type="radio" value={item.value} />
                  <span>
                    <span className="block font-black text-[#17202A]">{item.label}</span>
                    <span className="block text-sm text-[#66706B]">{item.note}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-7">
            <legend className="text-xl font-black text-[#17202A]">3. Tinh chỉnh kết quả</legend>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="font-bold text-[#364152]">
                Ngôn ngữ
                <select
                  className="mt-2 min-h-12 w-full cursor-pointer rounded-lg border border-[#1D2433]/15 bg-white px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                  defaultValue={language}
                  name="language"
                >
                  {languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="font-bold text-[#364152]">
                Năm xuất bản
                <select
                  className="mt-2 min-h-12 w-full cursor-pointer rounded-lg border border-[#1D2433]/15 bg-white px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                  defaultValue={era}
                  name="era"
                >
                  {eras.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="font-bold text-[#364152]">
                Thể loại
                <select
                  className="mt-2 min-h-12 w-full cursor-pointer rounded-lg border border-[#1D2433]/15 bg-white px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                  defaultValue={categoryId}
                  name="category"
                >
                  <option value="">Mọi thể loại</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          <button className="mt-7 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#176B62] px-6 font-black text-white transition hover:bg-[#104C47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] focus-visible:ring-offset-2 sm:w-auto" type="submit">
            <Compass className="h-5 w-5" aria-hidden="true" />
            Tìm sách phù hợp
          </button>
        </form>

        <div className="mt-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[#C65D43]">
              {selectedMood.label} · {lengths.find((item) => item.value === length)?.label}
            </p>
            <h2 className="mt-1 text-3xl font-black text-[#17202A]">
              {books.length} gợi ý phù hợp
            </h2>
          </div>
          <Link className="inline-flex min-h-11 items-center font-black text-[#176B62]" href="/read">
            Xem toàn bộ kho đọc
          </Link>
        </div>

        {books.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {books.map((book) => (
              <article className="group min-w-0" key={book.id}>
                <Link className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] focus-visible:ring-offset-2" href={`/read/${book.id}`}>
                  <BookCover
                    alt={`Bìa sách ${book.title}`}
                    author={book.author}
                    bookId={book.id}
                    category={book.category}
                    className="aspect-[2/3] w-full rounded-xl object-cover shadow-[0_14px_34px_rgba(37,49,56,0.16)] transition duration-200 group-hover:shadow-[0_20px_42px_rgba(37,49,56,0.22)]"
                    loading="lazy"
                    src={book.coverImage}
                    title={book.title}
                  />
                  <h3 className="mt-3 line-clamp-2 min-h-12 font-black leading-6 text-[#17202A]">{book.title}</h3>
                </Link>
                <p className="mt-1 truncate text-sm text-[#66706B]">{book.author}</p>
                <p className="mt-1 text-xs font-bold text-[#176B62]">
                  {book.category} · {book.pages ?? "?"} trang · {book.publishYear ?? "Chưa rõ năm"}
                </p>
                <Link className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#176B62] px-3 text-sm font-black text-white transition hover:bg-[#104C47]" href={`/read/${book.id}`}>
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  Đọc thử
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-[#176B62]/30 bg-white p-9 text-center">
            <Compass className="mx-auto h-9 w-9 text-[#176B62]" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-black text-[#17202A]">Chưa có sách khớp hoàn toàn</h2>
            <p className="mt-2 text-[#66706B]">Hãy thử tâm trạng hoặc độ dài khác.</p>
          </div>
        )}
      </section>
    </main>
  );
}

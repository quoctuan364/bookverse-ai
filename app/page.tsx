import Link from "next/link";
import {
  ArrowRight,
  Baby,
  BookHeart,
  BookMarked,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  ChartNoAxesColumnIncreasing,
  Clock3,
  Crown,
  Flame,
  FlaskConical,
  GraduationCap,
  HeartHandshake,
  History,
  Landmark,
  LibraryBig,
  LockKeyhole,
  PenLine,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { getCuratedBooks, getMarketplaceListings } from "@/actions/book.actions";
import {
  getHomeDiscoveryData,
  getHomePlatformStats,
} from "@/actions/home-discovery.actions";
import { getRecommendedBooks } from "@/actions/recommendation.actions";
import { RecommendationTrackedLink } from "@/components/recommendation/RecommendationTrackedLink";
import { BookCard } from "@/components/shared/BookCard";
import { BookCardActions } from "@/components/shared/BookCardActions";
import { BookCover } from "@/components/shared/BookCover";
import {
  AI_DISCOVERY_PROMPTS,
  buildAssistantDiscoveryHref,
} from "@/lib/ai-discovery-prompts";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const readingBenefits = [
  {
    icon: BookHeart,
    title: "Lưu lại điều bạn yêu thích",
    description: "Đánh dấu, ghi chú và quay lại đúng đoạn sách khiến bạn dừng lại.",
  },
  {
    icon: PenLine,
    title: "Đọc theo nhịp của riêng bạn",
    description: "Tiến độ đọc được lưu lại để mỗi lần mở sách đều tiếp nối tự nhiên.",
  },
  {
    icon: Rocket,
    title: "Khám phá có định hướng",
    description: "Tìm theo chủ đề, tham khảo cộng đồng và nhận gợi ý khi dữ liệu đủ tin cậy.",
  },
];

const categoryShowcase = [
  { label: "Văn học", description: "Tiểu thuyết, truyện ngắn và tác phẩm kinh điển", icon: Landmark, query: "văn học" },
  { label: "Kinh doanh", description: "Quản trị, tài chính và khởi nghiệp", icon: BriefcaseBusiness, query: "kinh doanh" },
  { label: "Khoa học", description: "Khám phá tự nhiên và công nghệ", icon: FlaskConical, query: "khoa học" },
  { label: "Giáo dục", description: "Giáo trình và kỹ năng học tập", icon: GraduationCap, query: "giáo dục" },
  { label: "Thiếu nhi", description: "Sách hay cho độc giả nhỏ tuổi", icon: Baby, query: "thiếu nhi" },
  { label: "Kỹ năng sống", description: "Phát triển bản thân mỗi ngày", icon: HeartHandshake, query: "kỹ năng sống" },
];

const trustHighlights = [
  { icon: ShieldCheck, title: "Tin bán được kiểm duyệt", description: "Chỉ hiển thị listing đã duyệt và còn hàng." },
  { icon: Sparkles, title: "Gợi ý có lý do", description: "Bạn luôn biết vì sao một cuốn sách được đề xuất." },
  { icon: BookOpen, title: "Đọc và lưu tiến độ", description: "Bookmark, highlight và tiếp tục từ trang gần nhất." },
  { icon: Store, title: "Mua sắm minh bạch", description: "Giỏ hàng, tồn kho và trạng thái đơn được theo dõi." },
];

const membershipSteps = [
  {
    icon: BookOpen,
    index: "01",
    title: "Đọc thử trước",
    description: "Mỗi cuốn sách đều có phần đọc thử để bạn kiểm tra nội dung trước khi quyết định.",
  },
  {
    icon: Crown,
    index: "02",
    title: "Chọn gói phù hợp",
    description: "Một gói hội viên còn hạn mở toàn bộ kho Ebook đang hoạt động.",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    index: "03",
    title: "Đọc và theo dõi",
    description: "Tiến độ, bookmark, highlight, lịch đọc và mục tiêu được lưu theo tài khoản.",
  },
];

function formatCount(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function getConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    NEW: "Mới",
    LIKE_NEW: "Như mới",
    GOOD: "Tình trạng tốt",
    FAIR: "Đã qua sử dụng",
    POOR: "Sách cũ",
    DIGITAL: "Ebook",
  };

  return labels[condition] ?? condition;
}

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const userId = currentUser && !currentUser.isLocked ? currentUser.id : undefined;
  const userName = currentUser && !currentUser.isLocked ? currentUser.name ?? "bạn" : "bạn";
  const [recommendationBatch, curatedBooks, marketplaceListings, discovery, platformStats] = await Promise.all([
    getRecommendedBooks(),
    getCuratedBooks(),
    getMarketplaceListings(),
    getHomeDiscoveryData(),
    getHomePlatformStats(),
  ]);
  const recommendedBooks = recommendationBatch.books;
  const sectionTitle = recommendationBatch.hasVerifiedPersonalization
    ? `Gợi ý dành riêng cho bạn, ${userName}`
    : userId
      ? "Khám phá thêm cho bạn"
      : "Sách nổi bật hôm nay";
  const heroUsesRecommendations = recommendedBooks.length > 0;
  const heroBooks = heroUsesRecommendations
    ? recommendedBooks.slice(0, 5)
    : platformStats?.spotlightBooks ?? [];

  return (
    <main className="bv-page">
      <section className="bv-home-hero">
        <div className="bv-home-grid" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-[#FFFDF8] shadow-[0_12px_34px_rgba(0,0,0,0.12)]">
              <BookMarked className="h-4 w-4 text-[#F2C14E]" aria-hidden="true" />
              Đọc thử miễn phí · Hội viên đọc toàn bộ
            </div>

            <h1 className="bv-editorial mt-6 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl">
              Một thư viện cho{" "}
              <span className="block text-[#F2C14E]">mọi nhịp đọc của bạn</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[#EAF5F1] sm:text-lg">
              Khám phá sách, đọc thử trước khi đăng ký và mở toàn bộ kho Ebook với
              một gói hội viên. BookVerse ghi nhớ tiến độ để bạn luôn tiếp tục đúng nơi đã dừng.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFFDF8] px-6 font-black text-[#104C47] shadow-[0_16px_34px_rgba(0,0,0,0.18)] transition duration-200 hover:bg-[#F5D98B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                href="/read"
              >
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                Bắt đầu đọc ngay
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 font-black text-white transition duration-200 hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                href="/membership"
              >
                <Crown className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
                Xem gói hội viên
              </Link>
            </div>

            <form
              action="/assistant"
              className="mt-8 grid w-full max-w-2xl gap-2 rounded-2xl border border-white/15 bg-[#0C3E3A]/45 p-2 shadow-[0_18px_42px_rgba(0,0,0,0.14)] backdrop-blur sm:relative sm:block"
              role="search"
            >
              <div className="relative">
                <BrainCircuit
                  aria-hidden="true"
                  className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#66706B]"
                />
                <input
                  aria-label="Mô tả cuốn sách bạn muốn AI tìm"
                  className="h-14 w-full rounded-xl border border-white/20 bg-[#FFFDF8] pl-14 pr-4 text-base font-medium text-[#17202A] shadow-[0_18px_42px_rgba(0,0,0,0.12)] outline-none transition placeholder:text-[#7C8581] focus:ring-4 focus:ring-white/25 sm:pr-40"
                  name="q"
                  placeholder="Ví dụ: sách AI dễ hiểu cho người mới, dưới 200.000đ..."
                  type="search"
                />
              </div>
              <button
                className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#C65D43] px-5 text-sm font-bold text-[#FFFDF8] shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition hover:bg-[#A94C36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:absolute sm:right-2 sm:top-1/2 sm:h-11 sm:-translate-y-1/2"
                type="submit"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                AI tìm giúp
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#D9EEEA]">
              <span className="font-semibold text-white">Gợi ý nhanh:</span>
              {AI_DISCOVERY_PROMPTS.slice(0, 2).map((prompt) => (
                <Link
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-white/20 px-4 py-2 transition hover:border-[#F5D98B] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  href={buildAssistantDiscoveryHref(prompt.query)}
                  key={prompt.id}
                >
                  {prompt.label}
                </Link>
              ))}
            </div>

          </div>

          <div className="relative min-h-[320px] sm:min-h-[390px] lg:min-h-[480px]">
            <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] border border-white/20 bg-white/10 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur sm:p-6">
              {heroBooks.length > 0 ? (
                <div className="grid h-full grid-cols-3 items-center gap-3 sm:grid-cols-5 sm:items-end">
                  {heroBooks.map((book, index) =>
                    heroUsesRecommendations ? (
                      <RecommendationTrackedLink
                        bookId={book.id}
                        className={`group block ${index > 2 ? "hidden sm:block" : ""}`}
                        href={`/book/${book.id}`}
                        key={book.id}
                        requestId={recommendationBatch.requestId}
                        style={{ transform: `translateY(${index % 2 === 0 ? "14px" : "-8px"})` }}
                      >
                        <BookCover
                          alt={`Bìa sách ${book.title}`}
                          author={book.author}
                          bookId={book.id}
                          className="aspect-[2/3] w-full rounded-xl object-cover shadow-[0_18px_34px_rgba(0,0,0,0.3)] transition duration-300 group-hover:-translate-y-2"
                          src={book.coverImage}
                          title={book.title}
                          useBookVerseArtwork
                        />
                      </RecommendationTrackedLink>
                    ) : (
                      <Link
                        className={`group block ${index > 2 ? "hidden sm:block" : ""}`}
                        href={`/read/${book.id}`}
                        key={book.id}
                        style={{ transform: `translateY(${index % 2 === 0 ? "14px" : "-8px"})` }}
                      >
                        <BookCover
                          alt={`Bìa sách ${book.title}`}
                          author={book.author}
                          bookId={book.id}
                          className="aspect-[2/3] w-full rounded-xl object-cover shadow-[0_18px_34px_rgba(0,0,0,0.3)] transition duration-300 group-hover:-translate-y-2"
                          src={book.coverImage}
                          title={book.title}
                          useBookVerseArtwork
                        />
                      </Link>
                    ),
                  )}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[#F5D98B] shadow-[0_18px_34px_rgba(0,0,0,0.12)]">
                    <BookOpen className="h-9 w-9" aria-hidden="true" />
                  </span>
                  <p className="bv-editorial mt-6 text-3xl font-bold text-white">Một cuốn sách mới đang chờ</p>
                  <p className="mt-3 max-w-xs text-sm leading-6 text-[#D9EEEA]">
                    Khởi động catalog để mở ra kệ sách được tuyển chọn cho bạn.
                  </p>
                </div>
              )}
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-2xl border border-white/18 bg-[#073B37]/90 px-4 py-3 text-[#FFFDF8] shadow-[0_18px_40px_rgba(0,0,0,0.2)] backdrop-blur sm:bottom-6 sm:left-6 sm:right-6">
              <p className="inline-flex items-center gap-2 text-sm font-black">
                <LockKeyhole className="h-4 w-4 text-[#F5D98B]" aria-hidden="true" />
                Một gói hội viên · Toàn bộ kho Ebook
              </p>
              <p className="mt-1 text-xs leading-5 text-[#DCE8E4]">
                Sách mới được bổ sung cũng tự động mở cho hội viên còn hạn.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#1D2433]/8 bg-[#FFFDF8]">
        <div className="mx-auto grid w-full max-w-7xl sm:grid-cols-2 lg:grid-cols-4">
          {(platformStats
            ? [
                { label: "Sách đang hoạt động", value: formatCount(platformStats.activeBooks) },
                { label: "Sách có nội dung đọc", value: formatCount(platformStats.readableBooks) },
                { label: "Thể loại", value: formatCount(platformStats.categories) },
                { label: "Tin bán còn hàng", value: formatCount(platformStats.approvedListings) },
              ]
            : trustHighlights.map((item) => ({ label: item.title, value: item.description }))
          ).map((item) => (
            <div className="border-b border-[#1D2433]/8 px-5 py-5 sm:border-r lg:border-b-0 last:border-r-0" key={item.label}>
              <p className="text-2xl font-black text-[#176B62]">{item.value}</p>
              <p className="mt-1 text-sm font-bold text-[#66706B]">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="bv-membership-showcase overflow-hidden rounded-[1.75rem]">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.78fr_1.22fr] lg:p-10">
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2C14E] text-[#173F3B] shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
                <Crown className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-6 text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">
                Hội viên BookVerse
              </p>
              <h2 className="bv-editorial mt-2 text-3xl font-black text-white sm:text-4xl">
                Đọc không giới hạn, không mua từng cuốn
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-[#D9EEEA]">
                Đọc thử miễn phí trước. Khi đã sẵn sàng, chọn một gói để mở toàn bộ
                kho sách và tiếp tục hành trình trên mọi trang của BookVerse.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#F2C14E] px-5 font-black text-[#173F3B] transition hover:bg-[#F5D98B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/membership">
                  Xem các gói hội viên
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-white/20 px-5 font-black text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/membership/benefits">
                  Xem đầy đủ quyền lợi
                </Link>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {membershipSteps.map(({ icon: Icon, index, title, description }) => (
                <article className="rounded-2xl border border-white/15 bg-white/[0.08] p-5 backdrop-blur" key={index}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#F2C14E]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-black text-white/50">{index}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#D9EEEA]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <article className="bv-card rounded-2xl p-5" key={item.title}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F3F0] text-[#176B62]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-[#1D2433]">{item.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-[#687083]">{item.description}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {discovery.isPersonalized &&
      (discovery.continueReading || discovery.recentlyViewed.length > 0) ? (
        <section
          aria-labelledby="personal-shelf-heading"
          className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8"
        >
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#176B62]">
                Kệ sách của bạn
              </p>
              <h2
                className="bv-editorial mt-2 text-3xl font-bold text-[#1D2433] sm:text-4xl"
                id="personal-shelf-heading"
              >
                Quay lại đúng nơi bạn dừng
              </h2>
            </div>
            <Link
              className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[#176B62] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
              href="/library"
            >
              Mở thư viện của tôi
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.05fr_1.4fr]">
            {discovery.continueReading ? (
              <article className="overflow-hidden rounded-2xl border border-[#176B62]/20 bg-[#104C47] text-[#FFFDF8] shadow-[0_18px_44px_rgba(23,107,98,0.2)]">
                <div className="grid min-h-full grid-cols-[112px_1fr] gap-4 p-4 sm:grid-cols-[144px_1fr] sm:p-5">
                  <BookCover
                    alt={`Bìa sách ${discovery.continueReading.title}`}
                    author={discovery.continueReading.author}
                    bookId={discovery.continueReading.id}
                    category={discovery.continueReading.category}
                    className="aspect-[2/3] w-full rounded-xl object-cover shadow-[0_14px_30px_rgba(0,0,0,0.25)]"
                    src={discovery.continueReading.coverImage}
                    title={discovery.continueReading.title}
                    useBookVerseArtwork
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#F5D98B]">
                      <Clock3 className="h-4 w-4" aria-hidden="true" />
                      Đọc tiếp
                    </span>
                    <h3 className="bv-editorial mt-3 line-clamp-2 text-2xl font-bold leading-tight">
                      {discovery.continueReading.title}
                    </h3>
                    <p className="mt-1 truncate text-sm text-[#D9EEEA]">
                      {discovery.continueReading.author}
                    </p>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
                      <div
                        aria-hidden="true"
                        className="h-full rounded-full bg-[#F2C14E]"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(2, discovery.continueReading.progressPercent),
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#D9EEEA]">
                      Chương {discovery.continueReading.currentChapter} · Trang{" "}
                      {discovery.continueReading.currentPage} ·{" "}
                      {discovery.continueReading.progressPercent.toFixed(0)}% hoàn thành
                    </p>
                    <Link
                      className="mt-auto inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-lg bg-[#FFFDF8] px-4 py-2 text-sm font-black text-[#104C47] transition duration-200 hover:bg-[#F5D98B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      href={`/read/${discovery.continueReading.id}`}
                    >
                      <Play className="h-4 w-4" aria-hidden="true" />
                      Tiếp tục đọc
                    </Link>
                  </div>
                </div>
              </article>
            ) : (
              <article className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#176B62]/25 bg-[#EAF5F1]/65 p-6 text-center">
                <BookOpen className="h-9 w-9 text-[#176B62]" aria-hidden="true" />
                <h3 className="bv-editorial mt-4 text-2xl font-bold text-[#1D2433]">
                  Bắt đầu một hành trình đọc
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#687083]">
                  Mở một Ebook để BookVerse ghi nhớ chương và trang gần nhất cho bạn.
                </p>
              </article>
            )}

            <div className="rounded-2xl border border-[#1D2433]/10 bg-white p-5 shadow-[0_12px_32px_rgba(37,49,56,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="inline-flex items-center gap-2 text-lg font-black text-[#1D2433]">
                  <History className="h-5 w-5 text-[#C65D43]" aria-hidden="true" />
                  Đã xem gần đây
                </h3>
                <span className="text-xs font-semibold text-[#687083]">
                  Chỉ hiển thị cho tài khoản của bạn
                </span>
              </div>

              {discovery.recentlyViewed.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {discovery.recentlyViewed.map((book) => (
                    <Link
                      className="group flex min-h-28 gap-3 rounded-xl border border-[#1D2433]/8 bg-[#F8F6F0] p-3 transition duration-200 hover:border-[#176B62]/30 hover:bg-[#F1F8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                      href={`/book/${book.id}`}
                      key={book.id}
                    >
                      <BookCover
                        alt={`Bìa sách ${book.title}`}
                        author={book.author}
                        bookId={book.id}
                        category={book.category}
                        className="h-24 w-16 shrink-0 rounded-lg object-cover shadow-sm"
                        loading="lazy"
                        src={book.coverImage}
                        title={book.title}
                        useBookVerseArtwork
                      />
                      <span className="min-w-0">
                        <span className="bv-editorial line-clamp-2 font-bold leading-5 text-[#1D2433] group-hover:text-[#176B62]">
                          {book.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-[#687083]">
                          {book.author}
                        </span>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#176B62]">
                          Xem lại
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-[#1D2433]/12 bg-[#F8F6F0] p-5 text-sm leading-6 text-[#687083]">
                  Lịch sử đang trống. Những sách bạn mở xem sẽ xuất hiện ở đây để quay lại nhanh.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#C65D43]">Danh mục nổi bật</p>
            <h2 className="bv-editorial mt-2 text-3xl font-bold text-[#1D2433] sm:text-4xl">Bạn muốn đọc gì hôm nay?</h2>
          </div>
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-black text-[#176B62] hover:bg-[#EAF2EF] hover:underline" href="/catalog">
            Xem toàn bộ danh mục
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryShowcase.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                className="group flex min-h-32 items-center gap-5 rounded-2xl border border-[#1D2433]/10 bg-white p-5 shadow-[0_10px_28px_rgba(37,49,56,0.07)] transition duration-200 hover:border-[#176B62]/30 hover:bg-[#F8FCFB] hover:shadow-[0_16px_36px_rgba(37,49,56,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                href={`/catalog?q=${encodeURIComponent(category.query)}`}
                key={category.label}
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3F0] text-[#176B62] transition duration-200 group-hover:bg-[#176B62] group-hover:text-white">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span>
                  <span className="bv-editorial block text-xl font-bold text-[#1D2433]">{category.label}</span>
                  <span className="mt-1 block text-sm leading-5 text-[#687083]">{category.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {discovery.trending.length > 0 ? (
        <section
          aria-labelledby="trending-heading"
          className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8"
        >
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#C65D43]">
                <Flame className="h-4 w-4" aria-hidden="true" />
                Xu hướng 7 ngày
              </p>
              <h2
                className="bv-editorial mt-2 text-3xl font-bold text-[#1D2433] sm:text-4xl"
                id="trending-heading"
              >
                Cộng đồng đang quan tâm
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#66706B]">
              Xếp hạng từ lượt xem, đọc, lưu, thêm giỏ và mua gần đây; tín hiệu mới có
              trọng số cao hơn.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {discovery.trending.map((book) => (
              <BookCard
                book={{
                  ...book,
                  catalogSource: "CURATED_REAL",
                  metadataBadge: `#${book.trendPosition} · Xu hướng`,
                  priceLabel: "Giá BookVerse",
                }}
                key={book.id}
                returnPath="/"
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {readingBenefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article className="bv-card rounded-2xl p-6" key={benefit.title}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6F3F0] text-[#176B62]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="bv-editorial mt-5 text-2xl font-bold text-[#1D2433]">{benefit.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#687083]">{benefit.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {marketplaceListings.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#C65D43]">Chợ sách cũ</p>
              <h2 className="bv-editorial mt-2 text-3xl font-bold text-[#1D2433] sm:text-4xl">Sách tốt, thêm một vòng đời</h2>
            </div>
            <Link className="inline-flex items-center gap-2 text-sm font-black text-[#176B62] hover:underline" href="/marketplace">
              Khám phá chợ sách
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {marketplaceListings.map((listing) => (
              <article
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#1D2433]/10 bg-white shadow-[0_12px_30px_rgba(37,49,56,0.09)]"
                key={listing.id}
              >
                <Link className="group block" href={`/book/${listing.book.id}`}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#EDE3D5]">
                    <BookCover
                      alt={`Bìa sách ${listing.book.title}`}
                      author={listing.book.author}
                      bookId={listing.book.id}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                      src={listing.book.coverImage}
                      title={listing.book.title}
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#176B62] shadow-sm">
                      {getConditionLabel(listing.condition)}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="bv-editorial line-clamp-2 min-h-12 text-lg font-bold leading-6 text-[#1D2433]">
                      {listing.book.title}
                    </h3>
                    <p className="mt-1 truncate text-sm text-[#687083]">{listing.book.author}</p>
                    <p className="mt-3 text-lg font-black text-[#C65D43]">{formatPrice(listing.price)}</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#687083]">
                      <span className="truncate">Người bán: {listing.seller.name}</span>
                      <span className="shrink-0 rounded-full bg-[#E6F3F0] px-2 py-1 font-black text-[#176B62]">
                        {listing.sellerQualityScore.badge}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="mt-auto border-t border-[#1D2433]/8 p-4">
                  <BookCardActions
                    availableListingId={listing.id}
                    bookId={listing.book.id}
                    returnPath="/"
                    showFavorite={false}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#176B62]">Tủ sách nổi bật</p>
            <h2 className="bv-editorial mt-2 text-3xl font-bold text-[#1D2433] sm:text-4xl">Sách tuyển chọn</h2>
          </div>
          <div className="max-w-xl text-sm leading-6 text-[#66706B]">
            Những đầu sách đã được nhập vào BookVerse để bạn khám phá và lưu trong thư viện cá nhân.
          </div>
        </div>

        {curatedBooks.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {curatedBooks.slice(0, 5).map((book) => (
              <BookCard book={book} key={book.id} returnPath="/" />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#1D2433]/10 bg-white p-6 text-sm text-[#687083] shadow-[0_12px_34px_rgba(39,44,51,0.08)]">
            Catalog tuyển chọn chưa được triển khai trên database đang kết nối.
          </div>
        )}

        <div className="mt-5 text-right">
          <Link className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-black text-[#176B62] hover:bg-[#EAF2EF] hover:underline" href="/catalog?source=real">
            Xem toàn bộ catalog BookVerse
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#C65D43]">Gợi ý AI</p>
            <h2 className="bv-editorial mt-2 text-3xl font-bold text-[#1D2433] sm:text-4xl">
              {sectionTitle}
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-6 text-[#66706B]">
            {recommendationBatch.hasVerifiedPersonalization
              ? "Các lựa chọn được sắp xếp theo sở thích và lịch sử đọc của riêng bạn."
              : userId
                ? "Đọc và yêu thích thêm sách để các gợi ý ngày càng phù hợp với bạn."
                : "Đăng nhập để nhận gợi ý phù hợp hơn dựa trên hành trình đọc của bạn."}
          </p>
        </div>

        {recommendedBooks.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {recommendedBooks.map((book) => (
              <BookCard
                book={book}
                key={book.id}
                recommendationRequestId={recommendationBatch.requestId}
                returnPath="/"
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#1D2433]/10 bg-white p-8 text-center text-sm text-[#687083] shadow-[0_12px_34px_rgba(39,44,51,0.08)]">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-[#176B62]" aria-hidden="true" />
            Chưa có dữ liệu sách để hiển thị.
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-[#176B62]/15 bg-[#FFFDF8] px-6 py-10 shadow-[0_24px_70px_rgba(37,49,56,0.1)] sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#D7EEE8]" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#C65D43]">
              Bắt đầu hành trình đọc
            </p>
            <h2 className="bv-editorial mt-2 text-3xl font-black text-[#17202A] sm:text-4xl">
              Cuốn sách tiếp theo của bạn đang ở đây
            </h2>
            <p className="mt-3 leading-7 text-[#66706B]">
              Duyệt toàn bộ kho, đọc thử nội dung và chỉ đăng ký hội viên khi bạn thực sự muốn đọc tiếp.
            </p>
          </div>
          <div className="relative mt-7 flex flex-col gap-3 sm:flex-row lg:mt-0">
            <Link className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#176B62] px-6 font-black text-white transition hover:bg-[#104C47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] focus-visible:ring-offset-2" href="/read">
              <LibraryBig className="h-5 w-5" aria-hidden="true" />
              Mở kho đọc
            </Link>
            <Link className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#176B62]/25 bg-white px-6 font-black text-[#176B62] transition hover:bg-[#E6F3F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] focus-visible:ring-offset-2" href="/discover">
              Khám phá theo tâm trạng
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  BookCheck,
  BookOpen,
  Clock3,
  Flame,
  Settings2,
  Trophy,
} from "lucide-react";
import { getReadingInsights } from "@/actions/reading-insights.actions";
import { BookCover } from "@/components/shared/BookCover";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours} giờ ${remaining} phút` : `${hours} giờ`;
}

export default async function ReadingInsightsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/reading/insights");
  const data = await getReadingInsights();
  const maxDayMinutes = Math.max(
    data.dailyGoalMinutes,
    ...data.days.map((day) => day.minutes),
    1,
  );

  const metrics = [
    {
      icon: Flame,
      label: "Streak hiện tại",
      value: `${data.currentStreak} ngày`,
      note: `Kỷ lục ${data.longestStreak} ngày`,
    },
    {
      icon: Clock3,
      label: "Tổng thời gian",
      value: formatMinutes(data.totalMinutes),
      note: `${data.totalSessions} phiên đọc`,
    },
    {
      icon: BookOpen,
      label: "Đã bắt đầu",
      value: `${data.booksStarted} cuốn`,
      note: `${data.booksCompleted} cuốn hoàn thành`,
    },
    {
      icon: BarChart3,
      label: "Phiên trung bình",
      value: `${data.averageSessionMinutes} phút`,
      note: "Tính trên 90 ngày gần nhất",
    },
  ];

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            Reading Insights
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="bv-editorial text-4xl font-bold sm:text-6xl">
                Nhịp đọc của {data.readerName}
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-[#EAF5F1]">
                Số liệu được tổng hợp từ tiến độ và phiên đọc đã lưu, giúp bạn duy trì
                thói quen thay vì chạy theo con số ảo.
              </p>
            </div>
            <Link
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-white/20 px-4 py-2 font-black text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              href="/profile/settings"
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              Đổi mục tiêu
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ icon: Icon, label, value, note }) => (
            <article className="bv-card rounded-2xl p-5" key={label}>
              <Icon className="h-6 w-6 text-[#176B62]" aria-hidden="true" />
              <p className="mt-4 text-sm font-bold text-[#66706B]">{label}</p>
              <p className="mt-1 text-2xl font-black text-[#17202A]">{value}</p>
              <p className="mt-2 text-xs leading-5 text-[#66706B]">{note}</p>
            </article>
          ))}
        </div>

        <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
          <section className="bv-card rounded-2xl p-5 sm:p-7" aria-labelledby="weekly-chart-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#C65D43]">
                  7 ngày gần nhất
                </p>
                <h2 className="mt-1 text-2xl font-black text-[#17202A]" id="weekly-chart-title">
                  {formatMinutes(data.weeklyMinutes)} đã đọc
                </h2>
              </div>
              <span className="rounded-full bg-[#E6F3F0] px-3 py-1 text-sm font-black text-[#176B62]">
                {data.weeklyGoalProgress}% mục tiêu tuần
              </span>
            </div>

            <div className="mt-7 grid grid-cols-7 gap-2 sm:gap-4" role="img" aria-label={`Biểu đồ thời gian đọc 7 ngày, tổng ${data.weeklyMinutes} phút`}>
              {data.days.map((day) => {
                const height = Math.max(8, Math.round((day.minutes / maxDayMinutes) * 180));
                const reachedGoal = day.minutes >= data.dailyGoalMinutes;
                return (
                  <div className="flex min-w-0 flex-col items-center justify-end" key={day.dateKey}>
                    <span className="mb-2 text-xs font-bold tabular-nums text-[#536071]">
                      {day.minutes}
                    </span>
                    <span
                      className={`w-full max-w-12 rounded-t-lg transition-all duration-200 ${
                        reachedGoal ? "bg-[#176B62]" : "bg-[#D8CDBB]"
                      }`}
                      style={{ height }}
                      title={`${day.label}: ${day.minutes} phút, ${day.sessions} phiên`}
                    />
                    <span className="mt-2 truncate text-[11px] font-bold text-[#66706B] sm:text-xs">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-[#66706B]">
              <span className="h-3 w-3 rounded-sm bg-[#176B62]" aria-hidden="true" />
              Cột xanh: đạt mục tiêu {data.dailyGoalMinutes} phút/ngày.
            </p>
          </section>

          <section className="bv-card rounded-2xl p-5 sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[#C65D43]">
              Chủ đề đọc nhiều
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#17202A]">Phân bổ thời gian</h2>
            <div className="mt-6 space-y-5">
              {data.favoriteCategories.map((category) => (
                <div key={category.name}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="truncate font-bold text-[#364152]">{category.name}</span>
                    <span className="shrink-0 tabular-nums text-[#66706B]">{category.minutes} phút</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8E1D5]">
                    <div
                      className="h-full rounded-full bg-[#C65D43]"
                      style={{ width: `${Math.max(category.percent, 3)}%` }}
                    />
                  </div>
                </div>
              ))}
              {data.favoriteCategories.length === 0 ? (
                <p className="rounded-xl border border-dashed p-5 text-sm leading-6 text-[#66706B]">
                  Chưa có đủ phiên đọc để phân tích chủ đề. Hãy mở một cuốn sách và bắt đầu.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[#C65D43]">
                Tiếp tục hành trình
              </p>
              <h2 className="mt-1 text-3xl font-black text-[#17202A]">Sách đang đọc</h2>
            </div>
            <Link className="inline-flex min-h-11 items-center font-black text-[#176B62]" href="/reading/challenges">
              <Trophy className="mr-2 h-4 w-4" aria-hidden="true" />
              Xem thử thách
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.recentBooks.map((book) => (
              <article className="bv-card flex gap-4 rounded-2xl p-4" key={book.id}>
                <BookCover
                  alt={`Bìa sách ${book.title}`}
                  author={book.author}
                  bookId={book.id}
                  className="h-32 w-20 shrink-0 rounded-lg object-cover"
                  src={book.coverImage}
                  title={book.title}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 font-black text-[#17202A]">{book.title}</h3>
                  <p className="mt-1 truncate text-sm text-[#66706B]">{book.author}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E8E1D5]">
                    <div className="h-full rounded-full bg-[#176B62]" style={{ width: `${Math.min(100, book.progressPercent)}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-bold text-[#66706B]">
                    {Math.round(book.progressPercent)}% · Trang {book.currentPage}
                  </p>
                  <Link className="mt-2 inline-flex min-h-11 items-center font-black text-[#176B62]" href={`/read/${book.id}`}>
                    <BookCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                    Đọc tiếp
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {data.recentBooks.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#176B62]/30 bg-white p-8 text-center">
              <BookOpen className="mx-auto h-9 w-9 text-[#176B62]" aria-hidden="true" />
              <p className="mt-3 font-black text-[#17202A]">Bạn chưa bắt đầu cuốn sách nào.</p>
              <Link className="mt-3 inline-flex min-h-11 items-center font-black text-[#176B62]" href="/read">
                Vào kho đọc
              </Link>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

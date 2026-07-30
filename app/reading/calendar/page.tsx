import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, Flame, Goal, Sparkles } from "lucide-react";
import { getReadingCalendar } from "@/actions/reading-insights.actions";
import { ReadingHeatmap } from "@/components/reading/ReadingHeatmap";

export const dynamic = "force-dynamic";

interface CalendarPageProps {
  searchParams?: Promise<{ year?: string }>;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} giờ ${rest} phút` : `${minutes} phút`;
}

export default async function ReadingCalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const data = await getReadingCalendar(Number(params?.year));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, index) => currentYear - index);
  const maxMonthMinutes = Math.max(1, ...data.months.map((month) => month.minutes));

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Reading Calendar
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="bv-editorial text-4xl font-bold sm:text-6xl">
                Năm đọc {data.year} của {data.readerName}
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-[#EAF5F1]">
                Mỗi ô là một ngày có dữ liệu phiên đọc thật. Màu đậm dần khi bạn tiến gần mục tiêu {data.dailyGoalMinutes} phút.
              </p>
            </div>
            <form action="/reading/calendar">
              <label className="sr-only" htmlFor="calendar-year">Chọn năm</label>
              <select
                className="min-h-12 cursor-pointer rounded-lg border border-white/20 bg-[#123F3B] px-4 font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
                defaultValue={data.year}
                id="calendar-year"
                name="year"
              >
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              <button className="ml-2 min-h-12 cursor-pointer rounded-lg bg-white px-4 font-black text-[#123F3B] transition hover:bg-[#F2C14E]" type="submit">
                Xem
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Clock3, label: "Tổng thời gian", value: formatMinutes(data.totalMinutes) },
            { icon: Sparkles, label: "Số phiên đọc", value: `${data.totalSessions} phiên` },
            { icon: Flame, label: "Ngày hoạt động", value: `${data.activeDays} ngày` },
            { icon: Goal, label: "Ngày tốt nhất", value: data.bestDay ? `${data.bestDay.minutes} phút` : "Chưa có" },
          ].map(({ icon: Icon, label, value }) => (
            <article className="bv-card rounded-2xl p-5" key={label}>
              <Icon className="h-6 w-6 text-[#176B62]" aria-hidden="true" />
              <p className="mt-4 text-sm font-bold text-[#66706B]">{label}</p>
              <p className="mt-1 text-2xl font-black text-[#17202A]">{value}</p>
            </article>
          ))}
        </div>

        <section className="bv-card mt-7 rounded-2xl p-5 sm:p-7" aria-labelledby="heatmap-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[#C65D43]">365 ngày</p>
              <h2 className="mt-1 text-2xl font-black text-[#17202A]" id="heatmap-title">Bản đồ thói quen đọc</h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#66706B]">
              <span>Ít</span>
              {["#E8E1D5", "#B7D9D2", "#72B8AA", "#2F8D81", "#176B62"].map((color) => (
                <span className="h-4 w-4 rounded-[4px]" key={color} style={{ backgroundColor: color }} />
              ))}
              <span>Nhiều</span>
            </div>
          </div>
          <div className="mt-6">
            <ReadingHeatmap days={data.days} dailyGoalMinutes={data.dailyGoalMinutes} />
          </div>
        </section>

        <section className="bv-card mt-7 rounded-2xl p-5 sm:p-7">
          <h2 className="text-2xl font-black text-[#17202A]">Tổng hợp theo tháng</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.months.map((month) => (
              <article className="rounded-xl border border-[#1D2433]/10 bg-white p-4" key={month.month}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-[#17202A]">{month.label}</h3>
                  <span className="text-sm font-bold text-[#66706B]">{month.activeDays} ngày</span>
                </div>
                <p className="mt-2 text-xl font-black text-[#176B62]">{formatMinutes(month.minutes)}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E8E1D5]">
                  <div className="h-full rounded-full bg-[#176B62]" style={{ width: `${(month.minutes / maxMonthMinutes) * 100}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-[#176B62] px-5 font-black text-[#176B62] transition hover:bg-[#E6F3F0]" href="/reading/insights">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại thống kê
          </Link>
          <Link className="inline-flex min-h-12 items-center rounded-lg bg-[#176B62] px-5 font-black text-white transition hover:bg-[#104C47]" href="/reading/goals">
            Đặt mục tiêu đọc
          </Link>
        </div>
      </section>
    </main>
  );
}


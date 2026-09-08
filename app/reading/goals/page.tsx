import Link from "next/link";
import { ArrowLeft, CalendarDays, Target } from "lucide-react";
import { getReadingInsights } from "@/actions/reading-insights.actions";
import { ReadingGoalsClient } from "@/components/reading/ReadingGoalsClient";

export const dynamic = "force-dynamic";

export default async function ReadingGoalsPage() {
  const data = await getReadingInsights();

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-bv-gold">
            <Target className="h-4 w-4" aria-hidden="true" />
            Personal Goals
          </p>
          <h1 className="bv-editorial mt-3 text-4xl font-bold sm:text-6xl">Mục tiêu đọc của {data.readerName}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-bv-mint-soft">
            Chọn một đích đến vừa sức, theo dõi bằng dữ liệu thật và điều chỉnh bất cứ lúc nào.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ReadingGoalsClient
          booksCompleted={data.booksCompleted}
          currentWeeklyMinutes={data.weeklyMinutes}
          storageKey={`bookverse-reading-goals-v1:${data.readerKey}`}
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-bv-primary px-5 font-black text-bv-primary transition hover:bg-bv-mint" href="/reading/insights">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Xem thống kê
          </Link>
          <Link className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-bv-primary px-5 font-black text-white transition hover:bg-bv-primary-dark" href="/reading/calendar">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Mở lịch đọc
          </Link>
        </div>
      </section>
    </main>
  );
}

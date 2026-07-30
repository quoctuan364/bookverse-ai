import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, CheckCircle2, Clock3, Flame, LockKeyhole, Target, Trophy } from "lucide-react";
import { getReadingInsights } from "@/actions/reading-insights.actions";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ReadingChallengesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/reading/challenges");
  const data = await getReadingInsights();
  const unlockedCount = data.achievements.filter((item) => item.unlocked).length;

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            Reading Challenges
          </p>
          <h1 className="bv-editorial mt-3 text-4xl font-bold sm:text-6xl">
            Thành tích đọc của bạn
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-[#EAF5F1]">
            Mỗi huy hiệu có điều kiện rõ ràng và được tính từ dữ liệu đọc thật trong tài khoản.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            [Award, "Đã mở khóa", `${unlockedCount}/${data.achievements.length} huy hiệu`],
            [Flame, "Streak hiện tại", `${data.currentStreak} ngày liên tiếp`],
            [Clock3, "Mục tiêu tuần", `${data.weeklyMinutes}/${data.dailyGoalMinutes * 7} phút`],
          ].map(([Icon, label, value]) => (
            <article className="bv-card rounded-2xl p-5" key={String(label)}>
              <Icon className="h-6 w-6 text-[#176B62]" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-[#66706B]">{String(label)}</p>
              <p className="mt-1 text-xl font-black text-[#17202A]">{String(value)}</p>
            </article>
          ))}
        </div>

        <section className="mt-8" aria-labelledby="achievement-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[#C65D43]">Bộ sưu tập</p>
              <h2 className="mt-1 text-3xl font-black text-[#17202A]" id="achievement-title">Huy hiệu đọc sách</h2>
            </div>
            <Link className="inline-flex min-h-11 items-center font-black text-[#176B62]" href="/reading/insights">
              Xem thống kê chi tiết
            </Link>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {data.achievements.map((item) => {
              const percent = Math.min(100, Math.round((item.progress / item.target) * 100));
              return (
                <article
                  className={`rounded-2xl border p-5 shadow-sm ${
                    item.unlocked
                      ? "border-[#176B62]/25 bg-[#E6F3F0]"
                      : "border-[#1D2433]/10 bg-white"
                  }`}
                  key={item.id}
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    item.unlocked ? "bg-[#176B62] text-white" : "bg-[#EEE9DF] text-[#66706B]"
                  }`}>
                    {item.unlocked ? <CheckCircle2 className="h-6 w-6" aria-hidden="true" /> : <LockKeyhole className="h-6 w-6" aria-hidden="true" />}
                  </span>
                  <h3 className="mt-5 text-lg font-black text-[#17202A]">{item.title}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-[#66706B]">{item.description}</p>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#D8D0C2]">
                    <div className="h-full rounded-full bg-[#176B62]" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs font-bold text-[#66706B]">
                    <span>{item.unlocked ? "Đã mở khóa" : `${item.progress}/${item.target}`}</span>
                    <span>{percent}%</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-9 rounded-2xl border border-[#C65D43]/15 bg-[#FFF1E8] p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="inline-flex items-center gap-2 font-black text-[#C65D43]">
                <Target className="h-5 w-5" aria-hidden="true" />
                Gợi ý thử thách tiếp theo
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#17202A]">
                Đọc {data.dailyGoalMinutes} phút mỗi ngày trong 7 ngày
              </h2>
              <p className="mt-2 leading-7 text-[#66706B]">
                Chỉ cần duy trì mục tiêu cá nhân, streak và huy hiệu sẽ tự cập nhật từ phiên đọc.
              </p>
            </div>
            <Link
              className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-lg bg-[#176B62] px-6 font-black text-white transition hover:bg-[#104C47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] focus-visible:ring-offset-2"
              href="/read"
            >
              Bắt đầu đọc
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

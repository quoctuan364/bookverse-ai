"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Save, Target } from "lucide-react";

interface GoalState {
  weeklyMinutes: number;
  yearlyBooks: number;
}

const DEFAULT_GOALS: GoalState = { weeklyMinutes: 140, yearlyBooks: 24 };

export function ReadingGoalsClient({
  storageKey,
  currentWeeklyMinutes,
  booksCompleted,
}: {
  storageKey: string;
  currentWeeklyMinutes: number;
  booksCompleted: number;
}) {
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<GoalState>;
      setGoals({
        weeklyMinutes: Math.max(10, Number(parsed.weeklyMinutes) || DEFAULT_GOALS.weeklyMinutes),
        yearlyBooks: Math.max(1, Number(parsed.yearlyBooks) || DEFAULT_GOALS.yearlyBooks),
      });
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  function saveGoals() {
    window.localStorage.setItem(storageKey, JSON.stringify(goals));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  const cards = [
    {
      label: "Mục tiêu tuần",
      current: currentWeeklyMinutes,
      target: goals.weeklyMinutes,
      unit: "phút",
    },
    {
      label: "Mục tiêu năm",
      current: booksCompleted,
      target: goals.yearlyBooks,
      unit: "cuốn",
    },
  ];

  return (
    <div className="grid gap-7 lg:grid-cols-[0.75fr_1.25fr]">
      <section className="bv-card rounded-2xl p-5 sm:p-7">
        <h2 className="inline-flex items-center gap-2 text-2xl font-black text-[#17202A]">
          <Target className="h-6 w-6 text-[#176B62]" aria-hidden="true" />
          Thiết lập mục tiêu
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#66706B]">
          Thiết lập này chỉ lưu trên trình duyệt hiện tại, không thay đổi dữ liệu hồ sơ gốc.
        </p>
        <div className="mt-6 space-y-5">
          <label className="block font-bold text-[#364152]">
            Phút đọc mỗi tuần
            <input
              className="mt-2 min-h-12 w-full rounded-lg border border-[#1D2433]/15 bg-white px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
              min={10}
              onChange={(event) => setGoals((value) => ({ ...value, weeklyMinutes: Number(event.target.value) }))}
              step={10}
              type="number"
              value={goals.weeklyMinutes}
            />
          </label>
          <label className="block font-bold text-[#364152]">
            Số sách muốn hoàn thành trong năm
            <input
              className="mt-2 min-h-12 w-full rounded-lg border border-[#1D2433]/15 bg-white px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
              min={1}
              onChange={(event) => setGoals((value) => ({ ...value, yearlyBooks: Number(event.target.value) }))}
              type="number"
              value={goals.yearlyBooks}
            />
          </label>
        </div>
        <button
          className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#176B62] px-5 font-black text-white transition hover:bg-[#104C47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] focus-visible:ring-offset-2"
          onClick={saveGoals}
          type="button"
        >
          {saved ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <Save className="h-5 w-5" aria-hidden="true" />}
          {saved ? "Đã lưu mục tiêu" : "Lưu mục tiêu"}
        </button>
      </section>

      <section className="space-y-5" aria-live="polite">
        {cards.map((card) => {
          const percent = Math.min(100, Math.round((card.current / Math.max(1, card.target)) * 100));
          return (
            <article className="bv-card rounded-2xl p-5 sm:p-7" key={card.label}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-bold text-[#66706B]">{card.label}</p>
                  <p className="mt-1 text-3xl font-black text-[#17202A]">
                    {card.current} / {card.target} {card.unit}
                  </p>
                </div>
                <span className="rounded-full bg-[#E6F3F0] px-3 py-1 font-black text-[#176B62]">{percent}%</span>
              </div>
              <div
                aria-label={`Đã đạt ${percent}% ${card.label.toLowerCase()}`}
                className="mt-6 h-4 overflow-hidden rounded-full bg-[#E8E1D5]"
                role="progressbar"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={percent}
              >
                <div className="h-full rounded-full bg-[#176B62] transition-[width] duration-300" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-3 text-sm text-[#66706B]">
                {percent >= 100 ? "Bạn đã hoàn thành mục tiêu này." : `Còn ${Math.max(0, card.target - card.current)} ${card.unit} để về đích.`}
              </p>
            </article>
          );
        })}
      </section>
    </div>
  );
}


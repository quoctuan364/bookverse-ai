"use client";

import { useMemo } from "react";
import { calendarIntensity, type CalendarDay } from "@/lib/reading-calendar-policy";

const colors = [
  "bg-[#E8E1D5]",
  "bg-[#B7D9D2]",
  "bg-[#72B8AA]",
  "bg-[#2F8D81]",
  "bg-[#176B62]",
];

function formatDay(dateKey: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${dateKey}T05:00:00Z`));
}

export function ReadingHeatmap({
  days,
  dailyGoalMinutes,
}: {
  days: CalendarDay[];
  dailyGoalMinutes: number;
}) {
  const leadingBlanks = useMemo(() => {
    if (days.length === 0) return 0;
    const weekday = new Date(`${days[0].dateKey}T05:00:00Z`).getUTCDay();
    return weekday === 0 ? 6 : weekday - 1;
  }, [days]);

  return (
    <div className="overflow-x-auto pb-2" tabIndex={0} aria-label="Lịch hoạt động đọc theo ngày">
      <div className="grid min-w-[760px] grid-flow-col grid-rows-7 gap-1.5">
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span aria-hidden="true" className="h-4 w-4" key={`blank-${index}`} />
        ))}
        {days.map((day) => {
          const intensity = calendarIntensity(day.minutes, dailyGoalMinutes);
          const label = `${formatDay(day.dateKey)}: ${day.minutes} phút, ${day.sessions} phiên`;
          return (
            <span
              aria-label={label}
              className={`h-4 w-4 rounded-[4px] ${colors[intensity]} outline-none ring-offset-2 transition hover:ring-2 hover:ring-[#176B62] focus-visible:ring-2 focus-visible:ring-[#176B62]`}
              key={day.dateKey}
              role="img"
              tabIndex={0}
              title={label}
            />
          );
        })}
      </div>
    </div>
  );
}


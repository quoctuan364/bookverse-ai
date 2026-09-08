export interface CalendarSession {
  dateKey: string;
  seconds: number;
}

export interface CalendarDay {
  dateKey: string;
  minutes: number;
  sessions: number;
}

/**
 * Gom phiên đọc theo ngày. Hàm thuần giúp kiểm thử chính sách mà không cần database.
 */
export function aggregateCalendarDays(
  dateKeys: string[],
  sessions: CalendarSession[],
): CalendarDay[] {
  const byDate = new Map(
    dateKeys.map((dateKey) => [dateKey, { seconds: 0, sessions: 0 }]),
  );

  for (const session of sessions) {
    const day = byDate.get(session.dateKey);
    if (!day) continue;
    day.seconds += Math.max(0, session.seconds);
    day.sessions += 1;
  }

  return dateKeys.map((dateKey) => {
    const day = byDate.get(dateKey) ?? { seconds: 0, sessions: 0 };
    return {
      dateKey,
      minutes: Math.round(day.seconds / 60),
      sessions: day.sessions,
    };
  });
}

export function calendarIntensity(minutes: number, dailyGoalMinutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  const ratio = minutes / Math.max(1, dailyGoalMinutes);
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 1) return 3;
  return 4;
}


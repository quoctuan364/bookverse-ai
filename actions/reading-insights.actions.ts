"use server";

import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/permissions";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { calculateReadingStreaks } from "@/lib/reading-insights-policy";
import { aggregateCalendarDays } from "@/lib/reading-calendar-policy";

const REPORT_TIME_ZONE = "Asia/Bangkok";

export interface ReadingCalendarData {
  readerName: string;
  year: number;
  dailyGoalMinutes: number;
  totalMinutes: number;
  totalSessions: number;
  activeDays: number;
  bestDay: { dateKey: string; minutes: number } | null;
  days: Array<{ dateKey: string; minutes: number; sessions: number }>;
  months: Array<{ month: number; label: string; minutes: number; activeDays: number }>;
}

export interface ReadingDayStat {
  dateKey: string;
  label: string;
  minutes: number;
  sessions: number;
}

export interface ReadingAchievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unlocked: boolean;
}

export interface ReadingInsightsData {
  readerKey: string;
  readerName: string;
  dailyGoalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  totalMinutes: number;
  totalSessions: number;
  booksStarted: number;
  booksCompleted: number;
  averageSessionMinutes: number;
  weeklyMinutes: number;
  weeklyGoalProgress: number;
  days: ReadingDayStat[];
  achievements: ReadingAchievement[];
  favoriteCategories: Array<{ name: string; minutes: number; percent: number }>;
  recentBooks: Array<{
    id: string;
    title: string;
    author: string;
    coverImage: string | null;
    progressPercent: number;
    currentPage: number;
    totalMinutes: number;
    lastReadAt: Date | null;
  }>;
}

function dateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function recentDateKeys(dayCount: number): string[] {
  const keys: string[] = [];
  const now = new Date();

  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    keys.push(dateKey(date));
  }

  return keys;
}

function yearDateKeys(year: number): string[] {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(year, 0, 1, 5));

  while (cursor.getUTCFullYear() === year) {
    keys.push(dateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

export async function getReadingCalendar(requestedYear?: number): Promise<ReadingCalendarData> {
  const user = await requireAuthenticatedUser();
  const currentYear = Number(dateKey(new Date()).slice(0, 4));
  const year =
    Number.isInteger(requestedYear) &&
    Number(requestedYear) >= 2020 &&
    Number(requestedYear) <= currentYear
      ? Number(requestedYear)
      : currentYear;
  const start = new Date(`${year}-01-01T00:00:00+07:00`);
  const end = new Date(`${year + 1}-01-01T00:00:00+07:00`);

  const [profile, sessions] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { dailyReadingGoalMinutes: true },
    }),
    prisma.readingSession.findMany({
      where: { userId: user.id, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, timeSpent: true },
    }),
  ]);

  const days = aggregateCalendarDays(
    yearDateKeys(year),
    sessions.map((session) => ({
      dateKey: dateKey(session.createdAt),
      seconds: session.timeSpent,
    })),
  );
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const monthDays = days.filter((day) => day.dateKey.startsWith(monthPrefix));
    return {
      month,
      label: `Tháng ${month}`,
      minutes: monthDays.reduce((sum, day) => sum + day.minutes, 0),
      activeDays: monthDays.filter((day) => day.minutes > 0).length,
    };
  });
  const activeDays = days.filter((day) => day.minutes > 0);
  const bestDay = activeDays.reduce<(typeof activeDays)[number] | null>(
    (best, day) => (!best || day.minutes > best.minutes ? day : best),
    null,
  );

  return {
    readerName: user.name ?? "bạn",
    year,
    dailyGoalMinutes: Math.max(1, profile?.dailyReadingGoalMinutes ?? 20),
    totalMinutes: days.reduce((sum, day) => sum + day.minutes, 0),
    totalSessions: sessions.length,
    activeDays: activeDays.length,
    bestDay: bestDay ? { dateKey: bestDay.dateKey, minutes: bestDay.minutes } : null,
    days,
    months,
  };
}

function achievement(
  id: string,
  title: string,
  description: string,
  progress: number,
  target: number,
): ReadingAchievement {
  return {
    id,
    title,
    description,
    progress: Math.min(progress, target),
    target,
    unlocked: progress >= target,
  };
}

export async function getReadingInsights(): Promise<ReadingInsightsData> {
  const user = await requireAuthenticatedUser();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [profile, sessions, progress, bookmarkCount, highlightCount, favoriteCount] =
    await Promise.all([
      prisma.profile.findUnique({
        where: { userId: user.id },
        select: { dailyReadingGoalMinutes: true },
      }),
      prisma.readingSession.findMany({
        where: { userId: user.id, createdAt: { gte: ninetyDaysAgo } },
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          timeSpent: true,
          book: { select: { category: { select: { name: true } } } },
        },
      }),
      prisma.readingProgress.findMany({
        where: { userId: user.id },
        orderBy: [{ lastReadAt: "desc" }, { updatedAt: "desc" }],
        select: {
          currentPage: true,
          progressPercent: true,
          totalMinutes: true,
          lastReadAt: true,
          book: {
            select: {
              id: true,
              title: true,
              authorName: true,
              coverPath: true,
            },
          },
        },
      }),
      prisma.bookmark.count({ where: { userId: user.id } }),
      prisma.highlight.count({ where: { userId: user.id } }),
      prisma.favoriteBook.count({ where: { userId: user.id } }),
    ]);

  const dailyGoalMinutes = Math.max(1, profile?.dailyReadingGoalMinutes ?? 20);
  const lastSevenKeys = recentDateKeys(7);
  const dayMap = new Map(
    lastSevenKeys.map((key) => [key, { minutes: 0, sessions: 0 }]),
  );
  const categorySeconds = new Map<string, number>();

  for (const session of sessions) {
    const key = dateKey(session.createdAt);
    const day = dayMap.get(key);
    if (day) {
      day.minutes += session.timeSpent / 60;
      day.sessions += 1;
    }
    const categoryName = session.book.category.name;
    categorySeconds.set(
      categoryName,
      (categorySeconds.get(categoryName) ?? 0) + session.timeSpent,
    );
  }

  const days = lastSevenKeys.map((key) => {
    const [year, month, day] = key.split("-").map(Number);
    const value = dayMap.get(key) ?? { minutes: 0, sessions: 0 };
    return {
      dateKey: key,
      label: new Intl.DateTimeFormat("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        timeZone: REPORT_TIME_ZONE,
      }).format(new Date(Date.UTC(year, month - 1, day, 5))),
      minutes: Math.round(value.minutes),
      sessions: value.sessions,
    };
  });

  const totalSessionSeconds = sessions.reduce(
    (total, session) => total + session.timeSpent,
    0,
  );
  const totalMinutesFromProgress = progress.reduce(
    (total, item) => total + item.totalMinutes,
    0,
  );
  const totalMinutes = Math.max(
    Math.round(totalSessionSeconds / 60),
    totalMinutesFromProgress,
  );
  const weeklyMinutes = days.reduce((total, day) => total + day.minutes, 0);
  const booksCompleted = progress.filter(
    (item) => item.progressPercent >= 99,
  ).length;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const streaks = calculateReadingStreaks(
    sessions.map((session) => dateKey(session.createdAt)),
    [dateKey(today), dateKey(yesterday)],
  );
  const totalCategorySeconds = Array.from(categorySeconds.values()).reduce(
    (total, value) => total + value,
    0,
  );
  const favoriteCategories = Array.from(categorySeconds.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([name, seconds]) => ({
      name,
      minutes: Math.round(seconds / 60),
      percent:
        totalCategorySeconds > 0
          ? Math.round((seconds / totalCategorySeconds) * 100)
          : 0,
    }));

  return {
    readerKey: user.id,
    readerName: user.name ?? "bạn",
    dailyGoalMinutes,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    totalMinutes,
    totalSessions: sessions.length,
    booksStarted: progress.length,
    booksCompleted,
    averageSessionMinutes:
      sessions.length > 0
        ? Math.round(totalSessionSeconds / 60 / sessions.length)
        : 0,
    weeklyMinutes,
    weeklyGoalProgress: Math.min(
      100,
      Math.round((weeklyMinutes / (dailyGoalMinutes * 7)) * 100),
    ),
    days,
    achievements: [
      achievement("first-book", "Khởi đầu hành trình", "Bắt đầu đọc một cuốn sách.", progress.length, 1),
      achievement("five-books", "Người khám phá", "Bắt đầu đọc 5 cuốn sách.", progress.length, 5),
      achievement("finish-book", "Về đích", "Hoàn thành ít nhất một cuốn.", booksCompleted, 1),
      achievement("streak-7", "Bền bỉ 7 ngày", "Đọc sách 7 ngày liên tiếp.", streaks.longest, 7),
      achievement("highlight-10", "Đọc có chiều sâu", "Tạo 10 highlight.", highlightCount, 10),
      achievement("bookmark-10", "Người sưu tầm", "Lưu 10 bookmark.", bookmarkCount, 10),
      achievement("favorite-10", "Tủ sách cá nhân", "Yêu thích 10 cuốn sách.", favoriteCount, 10),
      achievement("minutes-600", "Mười giờ tri thức", "Tích lũy 600 phút đọc.", totalMinutes, 600),
    ],
    favoriteCategories,
    recentBooks: progress.slice(0, 6).map((item) => ({
      id: item.book.id,
      title: item.book.title,
      author: item.book.authorName,
      coverImage: normalizeBookCoverUrl(item.book.coverPath),
      progressPercent: item.progressPercent,
      currentPage: item.currentPage,
      totalMinutes: item.totalMinutes,
      lastReadAt: item.lastReadAt,
    })),
  };
}

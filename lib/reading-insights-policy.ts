export interface ReadingStreakResult {
  current: number;
  longest: number;
}

function previousDateKey(key: string): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Tính streak từ các khóa ngày ISO YYYY-MM-DD.
 * currentAnchorKeys thường gồm hôm nay và hôm qua để streak không mất chỉ vì
 * người dùng chưa kịp đọc trong ngày hiện tại.
 */
export function calculateReadingStreaks(
  keys: string[],
  currentAnchorKeys: string[],
): ReadingStreakResult {
  const uniqueKeys = Array.from(new Set(keys)).sort();
  const active = new Set(uniqueKeys);
  const currentAnchor =
    currentAnchorKeys.find((key) => active.has(key)) ?? currentAnchorKeys[0];

  let current = 0;
  let cursor = currentAnchor;
  while (cursor && active.has(cursor)) {
    current += 1;
    cursor = previousDateKey(cursor);
  }

  let longest = 0;
  let running = 0;
  let previous: string | null = null;
  for (const key of uniqueKeys) {
    running = previous && previousDateKey(key) === previous ? running + 1 : 1;
    longest = Math.max(longest, running);
    previous = key;
  }

  return { current, longest };
}

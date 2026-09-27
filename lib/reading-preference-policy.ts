export const MIN_READING_PREFERENCES = 1;
export const MAX_READING_PREFERENCES = 5;

/** Chuẩn hóa lựa chọn để client, Server Action và script seed dùng cùng quy tắc. */
export function normalizeReadingPreferences(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export function isValidReadingPreferenceCount(count: number): boolean {
  return count >= MIN_READING_PREFERENCES && count <= MAX_READING_PREFERENCES;
}

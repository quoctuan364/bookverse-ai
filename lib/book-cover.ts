export const BOOK_COVER_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%23153A3F'/%3E%3Crect x='48' y='56' width='304' height='488' rx='18' fill='%23F8F6F1' opacity='0.94'/%3E%3Ctext x='200' y='292' text-anchor='middle' font-family='Arial,sans-serif' font-size='38' font-weight='700' fill='%23153A3F'%3EBookVerse%3C/text%3E%3Ctext x='200' y='338' text-anchor='middle' font-family='Arial,sans-serif' font-size='28' fill='%23153A3F'%3ENo%20cover%3C/text%3E%3C/svg%3E";

export type BookCoverSourceKind = "EMPTY" | "LOCAL" | "REMOTE" | "INVALID";

function hasUnsafePathSegment(value: string): boolean {
  return value.split("/").some((segment) => segment === ".." || segment === ".");
}

export function classifyBookCoverSource(value?: string | null): BookCoverSourceKind {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "EMPTY";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? "REMOTE" : "INVALID";
    } catch {
      return "INVALID";
    }
  }

  if (
    trimmed.startsWith("//") ||
    /^[a-z][a-z\d+.-]*:/i.test(trimmed) ||
    /^[a-z]:[\\/]/i.test(trimmed)
  ) {
    return "INVALID";
  }

  const normalized = trimmed.replace(/\\/g, "/");
  return hasUnsafePathSegment(normalized) ? "INVALID" : "LOCAL";
}

export function normalizeBookCoverUrl(value?: string | null): string | null {
  const kind = classifyBookCoverSource(value);
  if (kind === "EMPTY" || kind === "INVALID") {
    return null;
  }

  const trimmed = value!.trim();
  if (kind === "REMOTE") {
    return trimmed;
  }

  const normalized = trimmed.replace(/\\/g, "/").replace(/^\/+/, "");
  return `/${normalized}`;
}

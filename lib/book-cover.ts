import realCoverSourceManifest from "@/config/real-cover-sources.json";

export type BookCoverSourceKind = "EMPTY" | "LOCAL" | "REMOTE" | "INVALID";

export type BookCoverAuditStatus =
  | "REAL_VALID"
  | "LOCAL_VALID"
  | "MISSING"
  | "MALFORMED"
  | "LOAD_FAILED"
  | "HTTP_404"
  | "NOT_VERIFIED";

export type DemoCoverArt =
  | "technology"
  | "business"
  | "literature"
  | "history"
  | "health"
  | "language"
  | "science"
  | "travel";

export const DEMO_COVER_ART: readonly DemoCoverArt[] = [
  "technology",
  "business",
  "literature",
  "history",
  "health",
  "language",
  "science",
  "travel",
] as const;

const COVER_KEYWORDS: Readonly<Record<DemoCoverArt, readonly string[]>> = {
  technology: ["ai", "công nghệ", "lập trình", "phần mềm", "dữ liệu", "machine learning", "technology"],
  business: ["kinh doanh", "marketing", "tài chính", "quản trị", "khởi nghiệp", "business", "đầu tư"],
  literature: ["văn học", "tiểu thuyết", "truyện", "thơ", "manga", "literature", "novel"],
  history: ["lịch sử", "chính trị", "triết học", "văn hóa", "history", "philosophy"],
  health: ["sức khỏe", "y học", "tâm lý", "dinh dưỡng", "health", "medical"],
  language: ["ngoại ngữ", "ngôn ngữ", "tiếng anh", "tiếng nhật", "language", "english"],
  science: ["khoa học", "toán", "vật lý", "hóa học", "sinh học", "science", "physics"],
  travel: ["du lịch", "địa lý", "khám phá", "travel", "geography"],
};

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

/** Các bìa demo cũ không được dùng như bìa thật, dù file vẫn còn để bảo toàn dữ liệu gốc. */
export function isLegacySyntheticCover(value?: string | null): boolean {
  const normalized = normalizeBookCoverUrl(value)?.toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes("/covers/flat/") ||
    normalized.includes("/covers/3d/") ||
    /\/covers\/b\d{3}\.png(?:\?|$)/.test(normalized) ||
    /\/data\/demo\/covers\/b\d{3}\.png(?:\?|$)/.test(normalized) ||
    normalized.includes("picsum.photos")
  );
}

/** Trạng thái ban đầu chỉ dựa trên chuỗi; hợp lệ khi tải phải do component/audit xác nhận. */
export function getInitialCoverStatus(value?: string | null): BookCoverAuditStatus {
  const kind = classifyBookCoverSource(value);
  if (kind === "EMPTY") return "MISSING";
  if (kind === "INVALID") return "MALFORMED";
  return "NOT_VERIFIED";
}

export function isApprovedRealCover(bookId: string, value?: string | null): boolean {
  const normalized = normalizeBookCoverUrl(value);
  if (!normalized || !/^https?:\/\//i.test(normalized)) return false;
  const manifest = realCoverSourceManifest as {
    covers: Array<{ bookId: string; url: string; licenseReference: string }>;
  };
  return manifest.covers.some(
    (item) =>
      item.bookId === bookId &&
      item.url.trim() === normalized &&
      item.licenseReference.trim().length > 0,
  );
}

/** FNV-1a 32-bit: cùng bookId luôn cho cùng layout/artwork trên mọi trang. */
export function stableBookCoverSeed(bookId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < bookId.length; index += 1) {
    hash ^= bookId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function sanitizeFallbackTitle(title: string): string {
  return title.replace(/\s*#\d{3,}\b/gu, "").replace(/\s{2,}/g, " ").trim() || "Sách chưa có tiêu đề";
}

export function sanitizeFallbackAuthor(author?: string | null): string {
  if (!author?.trim()) return "Tác giả chưa cập nhật";
  return author.trim().replace(/\s+\d{4,}\b$/u, "").replace(/\s{2,}/g, " ").trim();
}

export function getDemoCoverArt(input: {
  bookId: string;
  title: string;
  category?: string | null;
}): DemoCoverArt {
  const searchableTitle = sanitizeFallbackTitle(input.title).toLocaleLowerCase("vi");
  const searchableCategory = input.category?.toLocaleLowerCase("vi") ?? "";

  // Ưu tiên tiêu đề vì tiêu đề có mặt nhất quán ở mọi màn hình.
  for (const art of DEMO_COVER_ART) {
    if (COVER_KEYWORDS[art].some((keyword) => searchableTitle.includes(keyword))) {
      return art;
    }
  }
  for (const art of DEMO_COVER_ART) {
    if (COVER_KEYWORDS[art].some((keyword) => searchableCategory.includes(keyword))) {
      return art;
    }
  }

  return DEMO_COVER_ART[stableBookCoverSeed(input.bookId) % DEMO_COVER_ART.length];
}

export function getDemoCoverLayout(bookId: string): number {
  return stableBookCoverSeed(bookId) % 6;
}

export interface BookCoverLoadState {
  normalizedSource: string | null;
  settled: boolean;
  showFallback: boolean;
  status: BookCoverAuditStatus;
}

export type BookCoverLoadEvent =
  | { type: "RESET"; source?: string | null }
  | { type: "SOURCE_LOADED"; approvedReal?: boolean }
  | { type: "SOURCE_FAILED"; reason: "ERROR" | "HTTP_404" | "TIMEOUT" };

export function createBookCoverLoadState(source?: string | null): BookCoverLoadState {
  const normalizedSource = normalizeBookCoverUrl(source);
  const showFallback = !normalizedSource || isLegacySyntheticCover(normalizedSource);
  return {
    normalizedSource,
    settled: showFallback,
    showFallback,
    status:
      showFallback && isLegacySyntheticCover(normalizedSource)
        ? "NOT_VERIFIED"
        : getInitialCoverStatus(source),
  };
}

/** Reducer đóng trạng thái sau load/error: ảnh lỗi không được retry và không tạo vòng lặp onError. */
export function bookCoverLoadReducer(
  state: BookCoverLoadState,
  event: BookCoverLoadEvent,
): BookCoverLoadState {
  if (event.type === "RESET") {
    return createBookCoverLoadState(event.source);
  }

  if (state.settled) {
    return state;
  }

  if (event.type === "SOURCE_LOADED") {
    return {
      ...state,
      settled: true,
      status: state.normalizedSource?.startsWith("/")
        ? "LOCAL_VALID"
        : event.approvedReal
          ? "REAL_VALID"
          : "NOT_VERIFIED",
    };
  }

  return {
    ...state,
    settled: true,
    showFallback: true,
    status: event.reason === "HTTP_404" ? "HTTP_404" : "LOAD_FAILED",
  };
}

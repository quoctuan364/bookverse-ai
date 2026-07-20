import realCoverSourceManifest from "@/config/real-cover-sources.json";
import { isUsableCoverDimensions } from "@/lib/cover-policy";

export type BookCoverSourceKind = "EMPTY" | "LOCAL" | "REMOTE" | "INVALID";

export type BookCoverAuditStatus =
  | "REAL_VALID"
  | "LOCAL_VALID"
  | "VALID_LOCAL_NORMALIZED"
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

/**
 * Đường dẫn cover local của catalog Open Library đã tải về.
 * Chỉ tạo path cho ID RBxxxxx của catalog thật; sách demo cũ vẫn đi theo src hiện tại.
 */
export function getRealCatalogLocalCoverPath(bookId: string): string | null {
  return /^RB\d{5}$/.test(bookId) ? `/covers/real-catalog-local/${bookId}.jpg` : null;
}

/** Derivative 2:3 giữ nguyên toàn bộ source, chỉ dùng khi local portrait không có/lỗi. */
export function getRealCatalogNormalizedCoverPath(bookId: string): string | null {
  return /^RB\d{5}$/.test(bookId)
    ? `/covers/real-catalog-local-normalized/${bookId}.webp`
    : null;
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

/** Đồng bộ với cover HTTP audit: ảnh quá nhỏ hoặc không có dáng bìa sẽ dùng fallback. */
export function isUsableBookCoverDimensions(width: number, height: number): boolean {
  return isUsableCoverDimensions(width, height);
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
  return author
    .trim()
    .replace(/\s+\d{4,}(?=\s*,|\s*$)/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getDemoCoverArt(input: {
  bookId: string;
  title: string;
  category?: string | null;
}): DemoCoverArt {
  // Artwork phải bất biến theo bookId. Category/title có thể được hydrate khác nhau giữa
  // Home, Catalog và Detail; dùng chúng làm seed sẽ làm cùng một Book đổi bìa giữa các trang.
  // Giữ input title/category để API tương thích, nhưng không dùng chúng để chọn artwork.
  void input.title;
  void input.category;
  return DEMO_COVER_ART[stableBookCoverSeed(input.bookId) % DEMO_COVER_ART.length];
}

export function getDemoCoverLayout(bookId: string): number {
  return stableBookCoverSeed(bookId) % 6;
}

export interface BookCoverLoadState {
  normalizedSource: string | null;
  remainingSources: string[];
  settled: boolean;
  showFallback: boolean;
  status: BookCoverAuditStatus;
}

export type BookCoverLoadEvent =
  | {
      type: "RESET";
      source?: string | null;
      localSource?: string | null;
      normalizedSource?: string | null;
    }
  | { type: "SOURCE_LOADED"; approvedReal?: boolean }
  | { type: "SOURCE_FAILED"; reason: "ERROR" | "HTTP_404" | "TIMEOUT" };

export function createBookCoverLoadState(
  source?: string | null,
  localSource?: string | null,
  normalizedSource?: string | null,
): BookCoverLoadState {
  const normalizedRemoteSource = normalizeBookCoverUrl(source);
  const normalizedLocalSource = normalizeBookCoverUrl(localSource);
  const normalizedDerivativeSource = normalizeBookCoverUrl(normalizedSource);
  const candidates = [normalizedLocalSource, normalizedDerivativeSource, normalizedRemoteSource].filter(
    (candidate, index, values): candidate is string => Boolean(candidate) && values.indexOf(candidate) === index,
  );
  const activeSource = candidates[0] ?? null;
  const showFallback = !activeSource || (isLegacySyntheticCover(activeSource) && candidates.length === 1);
  return {
    normalizedSource: activeSource,
    remainingSources: candidates.slice(1),
    settled: showFallback,
    showFallback,
    status:
      showFallback && isLegacySyntheticCover(activeSource)
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
    return createBookCoverLoadState(event.source, event.localSource, event.normalizedSource);
  }

  if (state.settled) {
    return state;
  }

  if (event.type === "SOURCE_LOADED") {
    return {
      ...state,
      settled: true,
      status: state.normalizedSource?.includes("/covers/real-catalog-local-normalized/")
        ? "VALID_LOCAL_NORMALIZED"
        : state.normalizedSource?.startsWith("/")
          ? "LOCAL_VALID"
        : event.approvedReal
          ? "REAL_VALID"
          : "NOT_VERIFIED",
    };
  }

  // Local portrait lỗi thì thử derivative, sau đó remote đúng record; mỗi nguồn chỉ thử một lần.
  if (state.remainingSources.length > 0) {
    const [nextSource, ...remainingSources] = state.remainingSources;
    return {
      ...state,
      normalizedSource: nextSource,
      remainingSources,
      settled: false,
      showFallback: false,
      status: "NOT_VERIFIED",
    };
  }

  return {
    ...state,
    settled: true,
    showFallback: true,
    status: event.reason === "HTTP_404" ? "HTTP_404" : "LOAD_FAILED",
  };
}

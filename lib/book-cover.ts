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

// Bộ bìa JPG do người dùng cung cấp. Tên file giữ ISBN để dễ đối chiếu
// đúng sách khi demo và không ghi đè lên bộ ảnh cũ trong public/covers.
const userDemoCoverFiles: Record<string, string> = {
  B001: "b001-9780134610993.jpg",
  B002: "b002-9783319296579.jpg",
  B003: "b003-9781492056355.jpg",
  B004: "b004-9781492051725.jpg",
  B005: "b005-9781449373320.jpg",
  B006: "b006-9781098104030.jpg",
  B007: "b007-9780307887894.jpg",
  B008: "b008-9781451686586.jpg",
  B009: "b009-9780465050659.jpg",
  B010: "b010-9780735211292.jpg",
  B011: "b011-9780857197689.jpg",
  B012: "b012-9780374533557.jpg",
  B013: "b013-9780061122415.jpg",
  B014: "b014-9781400062751.jpg",
  B015: "b015-9780804139298.jpg",
  B016: "b016-9781098125974.jpg",
  B017: "b017-9781119002253.jpg",
  B018: "b018-9780321884497.jpg",
  B019: "b019-9780099505693.jpg",
  B020: "b020-9780132350884.jpg",
};

/** Ưu tiên bộ bìa mới mà người dùng cung cấp cho 20 sách demo. */
export function getUserDemoCoverPath(bookId: string): string | null {
  const fileName = userDemoCoverFiles[bookId.toUpperCase()];
  return fileName ? `/covers-user/curated-real/${fileName}` : null;
}

/**
 * Dữ liệu cộng đồng cũ dùng mã Bxxxx, còn bộ catalog mới dùng RBxxxxx.
 * Giữ lớp tương thích này ở phần hiển thị để không phải sửa dữ liệu gốc.
 */
function normalizeUserCatalogCoverId(bookId: string): string | null {
  const normalized = bookId.trim().toUpperCase();
  if (/^RB\d{5}$/.test(normalized)) return normalized;

  const legacyMatch = /^B(\d{4})$/.exec(normalized);
  return legacyMatch ? `RB0${legacyMatch[1]}` : null;
}

/** Bìa catalog mới; ảnh lỗi sẽ tự chuyển sang bản chuẩn hóa rồi URL từ database. */
export function getUserRealCatalogCoverPath(bookId: string): string | null {
  const coverId = normalizeUserCatalogCoverId(bookId);
  return coverId ? `/covers-user/real-catalog-local/${coverId}.jpg` : null;
}

export function getUserRealCatalogNormalizedCoverPath(bookId: string): string | null {
  const coverId = normalizeUserCatalogCoverId(bookId);
  return coverId ? `/covers-user/real-catalog-local-normalized/${coverId}.jpg` : null;
}

/**
 * Bìa BookVerse edition được thiết kế lại riêng cho từng đầu sách.
 * Nếu file chưa tồn tại, component sẽ tự chuyển sang artwork BookVerse theo thể loại.
 */
export function getBookVerseEditionCoverPath(bookId: string): string | null {
  return /^RB\d{5}$/.test(bookId) ? `/covers/bookverse-editions/${bookId}.webp` : null;
}

/**
 * Nhận diện toàn bộ bìa tổng hợp/minh họa để chúng không xuất hiện trên UI.
 * File nguồn vẫn được giữ nguyên; policy này chỉ ngăn dùng chúng làm bìa thật.
 */
export function isLegacySyntheticCover(value?: string | null): boolean {
  const normalized = normalizeBookCoverUrl(value)?.toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    /\/covers\/b\d{3}\.png(?:\?|$)/.test(normalized) ||
    /\/data\/demo\/covers\/b\d{3}\.png(?:\?|$)/.test(normalized) ||
    normalized.includes("/covers/flat/") ||
    normalized.includes("/covers/3d/") ||
    normalized.includes("/covers/demo-art-v2/") ||
    normalized.includes("/covers/bookverse-editions/") ||
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
      status: state.normalizedSource?.includes("/real-catalog-local-normalized/")
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

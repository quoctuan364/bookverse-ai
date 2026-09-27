/**
 * lib/research-interactions.ts
 *
 * Các hằng số và kiểu dùng chung cho hệ thống thu thập tương tác nghiên cứu.
 * Các API route, server actions và client components đều import từ đây.
 * Không import từ app/api/consent/route.ts hay các route khác.
 */
import { Prisma } from "@prisma/client";

// Phiên bản consent hiện hành — phải khớp với INTERACTION_PILOT_PROTOCOL.md
export const CURRENT_CONSENT_VERSION = "v1";

// Các loại event được phép ghi theo spec
export const VALID_RESEARCH_EVENT_TYPES = new Set([
  "IMPRESSION",
  "VIEW",
  "RECOMMENDATION_CLICK",
  "SEARCH",
  "FAVORITE",
  "BOOKMARK",
  "ADD_TO_CART",
  "PURCHASE",
  "RATING",
] as const);

export type ResearchEventType =
  | "IMPRESSION"
  | "VIEW"
  | "RECOMMENDATION_CLICK"
  | "SEARCH"
  | "FAVORITE"
  | "BOOKMARK"
  | "ADD_TO_CART"
  | "PURCHASE"
  | "RATING";

// Event type yêu cầu bookId — tất cả trừ SEARCH
export const RESEARCH_EVENT_REQUIRES_BOOK_ID = new Set<ResearchEventType>([
  "IMPRESSION",
  "VIEW",
  "RECOMMENDATION_CLICK",
  "FAVORITE",
  "BOOKMARK",
  "ADD_TO_CART",
  "PURCHASE",
  "RATING",
]);

/**
 * Làm sạch metadata người dùng gửi lên trước khi lưu vào DB.
 * - Loại các key có thể chứa PII.
 * - Trả về undefined (không phải null) khi metadata trống để Prisma bỏ qua field.
 */
const PII_KEYS = new Set(["email", "password", "phone", "address", "name", "ip"]);

export function sanitizeResearchMetadata(
  raw: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return Prisma.JsonNull;
  }
  const filtered = Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      ([key]) => !PII_KEYS.has(key.toLowerCase()),
    ),
  );
  if (Object.keys(filtered).length === 0) return Prisma.JsonNull;
  return filtered as Prisma.InputJsonValue;
}

/**
 * Trả về metadata dạng Prisma.NullableJsonNullValueInput để set field về null
 * khi không có metadata hợp lệ, thay vì bỏ qua (undefined).
 */
export function toNullableMetadata(
  raw: unknown,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  const sanitized = sanitizeResearchMetadata(raw);
  return sanitized;
}
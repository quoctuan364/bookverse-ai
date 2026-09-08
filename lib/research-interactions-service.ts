import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  CURRENT_CONSENT_VERSION,
  RESEARCH_EVENT_REQUIRES_BOOK_ID,
  VALID_RESEARCH_EVENT_TYPES,
  sanitizeResearchMetadata,
  type ResearchEventType,
} from "@/lib/research-interactions";

export interface RecordResearchInteractionParams {
  authenticatedUserId: string | null;
  payload: {
    eventType?: unknown;
    bookId?: string | null;
    eventValue?: number | null;
    sourcePage?: string | null;
    recommendationRequestId?: string | null;
    recommendationModel?: string | null;
    position?: number | null;
    idempotencyKey?: string | null;
    metadata?: unknown;
  };
  clientIp?: string | null;
}

export type RecordResearchInteractionResult =
  | { status: "CREATED"; id: string; eventType: ResearchEventType }
  | { status: "DEDUPLICATED"; id: string; eventType: ResearchEventType }
  | { status: "CONSENT_REQUIRED"; reason: string }
  | { status: "AUTH_REQUIRED"; reason: string }
  | { status: "INVALID"; reason: string };

/**
 * recordResearchInteraction — Service nghiệp vụ duy nhất để ghi nhận research interaction
 *
 * Thực hiện đầy đủ 7 bước kiểm tra fail-closed:
 * 1. Kiểm tra xác thực (User ID bắt buộc).
 * 2. Validate eventType trong taxonomy hợp lệ.
 * 3. Validate bookId nếu event yêu cầu.
 * 4. Kiểm tra user tồn tại trong database.
 * 5. Kiểm tra consent còn hiệu lực (consented = true, revokedAt = null, version = v1).
 * 6. Kiểm tra sách tồn tại nếu bookId được cung cấp.
 * 7. Kiểm tra idempotency key để deduplicate.
 */
export async function recordResearchInteraction(
  params: RecordResearchInteractionParams,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<RecordResearchInteractionResult> {
  const userId = params.authenticatedUserId?.trim();
  if (!userId) {
    return {
      status: "AUTH_REQUIRED",
      reason: "Research tracking chỉ áp dụng cho người dùng đã đăng nhập.",
    };
  }

  const rawEventType = String(params.payload.eventType || "").trim().toUpperCase();
  if (!VALID_RESEARCH_EVENT_TYPES.has(rawEventType as ResearchEventType)) {
    return {
      status: "INVALID",
      reason: `Event type không hợp lệ: ${rawEventType}`,
    };
  }
  const eventType = rawEventType as ResearchEventType;

  const bookId = params.payload.bookId?.trim() || null;
  if (RESEARCH_EVENT_REQUIRES_BOOK_ID.has(eventType) && !bookId) {
    return {
      status: "INVALID",
      reason: `Event ${eventType} bắt buộc phải có bookId hợp lệ.`,
    };
  }

  // 1. Kiểm tra user tồn tại
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, isLocked: true },
  });
  if (!user || user.isLocked) {
    return {
      status: "AUTH_REQUIRED",
      reason: "Tài khoản không tồn tại hoặc đã bị khóa.",
    };
  }

  // 2. Kiểm tra consent
  const consent = await db.userResearchConsent.findFirst({
    where: {
      userId,
      consentVersion: CURRENT_CONSENT_VERSION,
      consented: true,
      revokedAt: null,
    },
    select: { id: true, consentVersion: true },
  });

  if (!consent) {
    return {
      status: "CONSENT_REQUIRED",
      reason: "Người dùng chưa cấp quyền hoặc đã thu hồi quyền thu thập dữ liệu nghiên cứu.",
    };
  }

  // 3. Kiểm tra sách tồn tại nếu có bookId
  if (bookId) {
    const book = await db.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    });
    if (!book) {
      return {
        status: "INVALID",
        reason: `Sách với ID ${bookId} không tồn tại trong hệ thống.`,
      };
    }
  }

  // 4. Kiểm tra idempotency key
  const idempotencyKey = params.payload.idempotencyKey?.trim() || null;
  if (idempotencyKey) {
    const existing = await db.userInteractionLog.findFirst({
      where: { idempotencyKey },
      select: { id: true, eventType: true },
    });
    if (existing) {
      return {
        status: "DEDUPLICATED",
        id: existing.id,
        eventType: existing.eventType as ResearchEventType,
      };
    }
  }

  // 5. Sanitize metadata (loại bỏ 100% PII)
  const safeMetadata = sanitizeResearchMetadata(params.payload.metadata);

  // 6. Ghi log vào cơ sở dữ liệu
  const log = await db.userInteractionLog.create({
    data: {
      userId,
      bookId,
      eventType,
      eventValue: params.payload.eventValue != null ? params.payload.eventValue : null,
      sourcePage: params.payload.sourcePage?.trim() || null,
      recommendationRequestId: params.payload.recommendationRequestId?.trim() || null,
      recommendationModel: params.payload.recommendationModel?.trim() || null,
      position: params.payload.position != null ? Number(params.payload.position) : null,
      metadata: safeMetadata,
      idempotencyKey,
      consentVersion: consent.consentVersion,
    },
    select: { id: true, eventType: true },
  });

  return {
    status: "CREATED",
    id: log.id,
    eventType: log.eventType as ResearchEventType,
  };
}
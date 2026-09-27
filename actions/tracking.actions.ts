"use server";

import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  TAXONOMY_VERSION,
  mapLegacyInteractionEvent,
  validateCanonicalEventFields,
} from "@/lib/interaction-taxonomy";
import type { ResearchEventType } from "@/lib/research-interactions";

export type TrackingInteractionType =
  | "VIEW"
  | "READ"
  | "BOOKMARK"
  | "HIGHLIGHT"
  | "SEARCH"
  | "ADD_TO_CART"
  | "PURCHASE"
  | "REVIEW"
  | "COMMENT"
  | "REACTION";

export async function logInteraction(
  bookId: string,
  type: TrackingInteractionType,
): Promise<void> {
  try {
    const currentUser = await getCurrentUser();
    const userId = currentUser && !currentUser.isLocked ? currentUser.id : null;
    const cleanBookId = bookId.trim();

    if (!userId || !cleanBookId) {
      return;
    }

    const canonicalEvent = mapLegacyInteractionEvent(type);
    if (!canonicalEvent) {
      throw new Error(`Interaction type không thuộc taxonomy: ${type}.`);
    }
    const createdAt = new Date();
    const validation = validateCanonicalEventFields(canonicalEvent, {
      userId,
      bookId: cleanBookId,
      timestamp: createdAt,
    });
    if (!validation.valid) {
      throw new Error(`Interaction thiếu field: ${validation.missingFields.join(", ")}.`);
    }

    await prisma.interactionEvent.create({
      data: {
        userId,
        bookId: cleanBookId,
        actionType: canonicalEvent,
        metadata: {
          legacyEvent: type,
          source: "next_app",
          taxonomyVersion: TAXONOMY_VERSION,
        },
        createdAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[tracking.logInteraction] Bỏ qua lỗi tracking: ${message}`);
  }
}

import { recordResearchInteraction } from "@/lib/research-interactions-service";

interface ResearchInteractionPayload {
  eventType: ResearchEventType;
  bookId?: string | null;
  eventValue?: number | null;
  sourcePage?: string | null;
  recommendationRequestId?: string | null;
  recommendationModel?: string | null;
  position?: number | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Ghi tương tác nghiên cứu thẳng vào DB qua service chuẩn hóa.
 * CHỈ ghi khi user đã đăng nhập và đã đồng ý (consent).
 * Lỗi telemetry không ném ra ngoài — không được làm hỏng luồng chính.
 */
export async function logResearchInteraction(
  payload: ResearchInteractionPayload,
): Promise<void> {
  try {
    const currentUser = await getCurrentUser();
    const userId = currentUser && !currentUser.isLocked ? currentUser.id : null;
    if (!userId) return;

    await recordResearchInteraction({
      authenticatedUserId: userId,
      payload,
    });
  } catch {
    // Lỗi telemetry không được làm hỏng luồng chính
  }
}

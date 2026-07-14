"use server";

import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  TAXONOMY_VERSION,
  mapLegacyInteractionEvent,
  validateCanonicalEventFields,
} from "@/lib/interaction-taxonomy";

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

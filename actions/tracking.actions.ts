"use server";

import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

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

    await prisma.interactionEvent.create({
      data: {
        userId,
        bookId: cleanBookId,
        actionType: type,
        metadata: {
          source: "next_app",
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[tracking.logInteraction] Bỏ qua lỗi tracking: ${message}`);
  }
}

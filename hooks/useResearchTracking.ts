"use client";

/**
 * useResearchTracking — Hook ghi tương tác nghiên cứu từ client
 *
 * CHỈ gọi /api/interactions khi useConsent().enableResearchTracking = true.
 * Lỗi telemetry không làm hỏng trải nghiệm người dùng.
 */
import { useCallback } from "react";
import { useConsent } from "@/components/consent/ConsentProvider";
import type { ResearchEventType } from "@/lib/research-interactions";

export interface TrackEventPayload {
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
 * Trả về hàm track() để gọi từ event handlers.
 * Nếu chưa consent, hàm là no-op (không gọi API).
 *
 * @example
 * const { track } = useResearchTracking();
 * <button onClick={() => track({ eventType: "FAVORITE", bookId })} />
 */
export function useResearchTracking() {
  const { enableResearchTracking } = useConsent();

  const track = useCallback(
    (payload: TrackEventPayload): void => {
      if (!enableResearchTracking) return;

      void fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          eventType: payload.eventType,
          bookId: payload.bookId ?? null,
          eventValue: payload.eventValue ?? null,
          sourcePage: payload.sourcePage ?? null,
          recommendationRequestId: payload.recommendationRequestId ?? null,
          recommendationModel: payload.recommendationModel ?? null,
          position: payload.position ?? null,
          idempotencyKey: payload.idempotencyKey ?? null,
          // Server sẽ sanitize metadata để loại bỏ PII
          metadata: payload.metadata ?? null,
        }),
      }).catch(() => {
        // Lỗi mạng không crash app
      });
    },
    [enableResearchTracking],
  );

  return { track, enabled: enableResearchTracking };
}
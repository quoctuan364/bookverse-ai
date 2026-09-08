"use client";

import { useEffect, useRef } from "react";
import { logInteraction } from "@/actions/tracking.actions";
import { useResearchTracking } from "@/hooks/useResearchTracking";

interface BookViewTrackerProps {
  bookId: string;
}

export function BookViewTracker({ bookId }: BookViewTrackerProps) {
  const { track } = useResearchTracking();
  const trackedRef = useRef<string | null>(null);
  const eventKeyRef = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}`
  );

  useEffect(() => {
    const cleanId = bookId.trim();
    if (!cleanId) return;
    if (trackedRef.current === cleanId) return;

    trackedRef.current = cleanId;

    // Telemetry nghiệp vụ gốc
    void logInteraction(cleanId, "VIEW");

    // Research tracking (chỉ gửi khi user đã đăng nhập & consent)
    track({
      eventType: "VIEW",
      bookId: cleanId,
      sourcePage: "book_detail",
      idempotencyKey: `view:${cleanId}:${eventKeyRef.current}`,
    });
  }, [bookId, track]);

  return null;
}


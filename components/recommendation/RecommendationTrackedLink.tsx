"use client";

/**
 * RecommendationTrackedLink
 *
 * Link gợi ý có 2 lớp tracking:
 * 1. Telemetry cũ (/api/recommendations/events) — IMPRESSION + CLICK, luôn chạy.
 * 2. Research tracking (/api/interactions) — chỉ chạy khi user đã consent.
 *
 * Hai luồng này hoàn toàn độc lập. Lỗi một luồng không ảnh hưởng luồng kia.
 * Không lưu PII trong research tracking.
 */
import Link from "next/link";
import { useEffect, useRef, type ComponentProps } from "react";

import {
  IMPRESSION_MINIMUM_MS,
  IMPRESSION_VISIBILITY_RATIO,
  type ClientTelemetryEvent,
} from "@/lib/recommendation-telemetry-policy";
import { useResearchTracking } from "@/hooks/useResearchTracking";

type LinkProps = ComponentProps<typeof Link>;

interface RecommendationTrackedLinkProps extends Omit<LinkProps, "href" | "onClick"> {
  href: string;
  requestId?: string | null;
  bookId: string;
  position?: number | null;
}

function sendTelemetry(
  requestId: string,
  bookId: string,
  eventType: ClientTelemetryEvent,
): void {
  void fetch("/api/recommendations/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId, bookId, eventType }),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);
}

export function RecommendationTrackedLink({
  requestId,
  bookId,
  position,
  prefetch,
  children,
  ...linkProps
}: RecommendationTrackedLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const impressionSent = useRef(false);
  const researchImpressionSent = useRef(false);

  const { track } = useResearchTracking();

  useEffect(() => {
    // Chỉ track recommendation impression khi có recommendationRequestId hợp lệ
    if (!requestId) return;

    const element = linkRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let meetsVisibilityThreshold = false;

    const clearVisibilityTimer = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const startVisibilityTimer = () => {
      if (timer || document.hidden) return;
      if (impressionSent.current && researchImpressionSent.current) return;
      if (!meetsVisibilityThreshold) return;

      timer = setTimeout(() => {
        // Luồng 1: Telemetry cũ
        if (requestId && !impressionSent.current) {
          impressionSent.current = true;
          sendTelemetry(requestId, bookId, "IMPRESSION");
        }
        // Luồng 2: Research tracking (chỉ khi có requestId và đã consent)
        if (requestId && !researchImpressionSent.current) {
          researchImpressionSent.current = true;
          track({
            eventType: "IMPRESSION",
            bookId,
            sourcePage: "recommendation_shelf",
            recommendationRequestId: requestId,
            recommendationModel: "fastapi_hybrid_v2",
            position: position ?? null,
            idempotencyKey: `imp:${requestId}:${bookId}`,
          });
        }
        timer = null;
      }, IMPRESSION_MINIMUM_MS);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        meetsVisibilityThreshold = Boolean(
          entry?.isIntersecting &&
            entry.intersectionRatio >= IMPRESSION_VISIBILITY_RATIO,
        );
        if (meetsVisibilityThreshold) {
          startVisibilityTimer();
        } else {
          clearVisibilityTimer();
        }
      },
      { threshold: [IMPRESSION_VISIBILITY_RATIO] },
    );

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearVisibilityTimer();
      } else {
        startVisibilityTimer();
      }
    };

    observer.observe(element);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearVisibilityTimer();
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [bookId, requestId, position, track]);

  return (
    <Link
      {...linkProps}
      data-recommendation-book-id={requestId ? bookId : undefined}
      data-recommendation-request-id={requestId ?? undefined}
      href={linkProps.href}
      prefetch={prefetch}
      onClick={() => {
        if (!requestId) return;

        // Luồng 1: Telemetry cũ
        sendTelemetry(requestId, bookId, "CLICK");

        // Luồng 2: Research tracking click
        track({
          eventType: "RECOMMENDATION_CLICK",
          bookId,
          sourcePage: "recommendation_shelf",
          recommendationRequestId: requestId,
          recommendationModel: "fastapi_hybrid_v2",
          position: position ?? null,
          idempotencyKey: `click:${requestId}:${bookId}`,
        });
      }}
      ref={linkRef}
    >
      {children}
    </Link>
  );
}

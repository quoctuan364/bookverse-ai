"use client";

import Link from "next/link";
import { useEffect, useRef, type ComponentProps } from "react";

import {
  IMPRESSION_MINIMUM_MS,
  IMPRESSION_VISIBILITY_RATIO,
  type ClientTelemetryEvent,
} from "@/lib/recommendation-telemetry-policy";

type LinkProps = ComponentProps<typeof Link>;

interface RecommendationTrackedLinkProps extends Omit<LinkProps, "href" | "onClick"> {
  href: string;
  requestId?: string | null;
  bookId: string;
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
  children,
  ...linkProps
}: RecommendationTrackedLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const impressionSent = useRef(false);

  useEffect(() => {
    const element = linkRef.current;
    if (!requestId || !element || typeof IntersectionObserver === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let meetsVisibilityThreshold = false;
    const clearVisibilityTimer = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const startVisibilityTimer = () => {
      if (
        timer ||
        impressionSent.current ||
        !meetsVisibilityThreshold ||
        document.hidden
      ) {
        return;
      }
      timer = setTimeout(() => {
        impressionSent.current = true;
        sendTelemetry(requestId, bookId, "IMPRESSION");
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
  }, [bookId, requestId]);

  return (
    <Link
      {...linkProps}
      data-recommendation-book-id={requestId ? bookId : undefined}
      data-recommendation-request-id={requestId ?? undefined}
      href={linkProps.href}
      onClick={() => {
        if (requestId) sendTelemetry(requestId, bookId, "CLICK");
      }}
      ref={linkRef}
    >
      {children}
    </Link>
  );
}

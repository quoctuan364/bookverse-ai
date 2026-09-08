"use client";

import { useEffect, useRef } from "react";
import { useResearchTracking } from "@/hooks/useResearchTracking";

interface CatalogSearchTrackerProps {
  query: string;
}

export function CatalogSearchTracker({ query }: CatalogSearchTrackerProps) {
  const { track } = useResearchTracking();
  const trackedQueryRef = useRef<string | null>(null);
  const searchKeyRef = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `search-${Date.now()}`
  );

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;
    if (trackedQueryRef.current === cleanQuery) return;

    trackedQueryRef.current = cleanQuery;
    searchKeyRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `search-${Date.now()}`;

    track({
      eventType: "SEARCH",
      sourcePage: "catalog",
      metadata: { query: cleanQuery },
      idempotencyKey: `search:${cleanQuery}:${searchKeyRef.current}`,
    });
  }, [query, track]);

  return null;
}
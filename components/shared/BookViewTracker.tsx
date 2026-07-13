"use client";

import { useEffect } from "react";
import { logInteraction } from "@/actions/tracking.actions";

interface BookViewTrackerProps {
  bookId: string;
}

export function BookViewTracker({ bookId }: BookViewTrackerProps) {
  useEffect(() => {
    if (!bookId.trim()) {
      return;
    }

    void logInteraction(bookId, "VIEW");
  }, [bookId]);

  return null;
}

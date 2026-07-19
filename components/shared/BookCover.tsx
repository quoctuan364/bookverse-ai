"use client";

import React, { useEffect, useMemo, useReducer, useRef, type CSSProperties } from "react";

import {
  bookCoverLoadReducer,
  createBookCoverLoadState,
  getDemoCoverArt,
  getDemoCoverLayout,
  isApprovedRealCover,
  isUsableBookCoverDimensions,
  sanitizeFallbackAuthor,
  sanitizeFallbackTitle,
} from "@/lib/book-cover";
import { cn } from "@/lib/utils";

interface BookCoverProps {
  alt?: string;
  author?: string | null;
  bookId: string;
  category?: string | null;
  className?: string;
  loading?: "eager" | "lazy";
  priority?: boolean;
  src?: string | null;
  style?: CSSProperties;
  timeoutMs?: number;
  title: string;
}

const LAYOUT_CLASSES = [
  "inset-x-4 bottom-5 border-l-4 border-amber-300 bg-slate-950/80 p-3 text-left",
  "inset-x-3 top-5 rounded-sm bg-stone-50/95 p-3 text-slate-950 shadow-xl",
  "left-3 right-8 bottom-4 border-t border-white/70 bg-indigo-950/80 p-3 text-left",
  "inset-x-4 top-1/2 -translate-y-1/2 rounded-xl bg-black/70 p-3 text-center backdrop-blur-sm",
  "left-4 right-3 bottom-6 rounded-r-2xl bg-emerald-950/80 p-3 text-left",
  "inset-x-3 bottom-3 border border-white/35 bg-neutral-950/80 p-3 text-center shadow-2xl",
] as const;

/**
 * Bìa sách dùng chung toàn hệ thống.
 * Bìa demo cũ/null/lỗi tải chỉ chuyển một lần sang fallback, không retry vô hạn.
 */
export function BookCover({
  alt,
  author,
  bookId,
  category,
  className,
  loading = "lazy",
  priority = false,
  src,
  style,
  timeoutMs = 8_000,
  title,
}: BookCoverProps) {
  const [loadState, dispatch] = useReducer(bookCoverLoadReducer, src, createBookCoverLoadState);
  const sourceImageRef = useRef<HTMLImageElement>(null);
  const previousSourceRef = useRef<{ bookId: string; src?: string | null }>({ bookId, src });
  const art = useMemo(() => getDemoCoverArt({ bookId, title, category }), [bookId, category, title]);
  const layout = useMemo(() => getDemoCoverLayout(bookId), [bookId]);
  const displayTitle = useMemo(() => sanitizeFallbackTitle(title), [title]);
  const displayAuthor = useMemo(() => sanitizeFallbackAuthor(author), [author]);

  useEffect(() => {
    if (previousSourceRef.current.bookId === bookId && previousSourceRef.current.src === src) return;
    previousSourceRef.current = { bookId, src };
    dispatch({ type: "RESET", source: src });
  }, [bookId, src]);

  useEffect(() => {
    if (loadState.settled || loadState.showFallback || !loadState.normalizedSource) return;

    const timer = window.setTimeout(() => {
      dispatch({ type: "SOURCE_FAILED", reason: "TIMEOUT" });
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [loadState.normalizedSource, loadState.settled, loadState.showFallback, timeoutMs]);

  useEffect(() => {
    const image = sourceImageRef.current;
    if (!image?.complete || loadState.settled || loadState.showFallback) return;
    if (isUsableBookCoverDimensions(image.naturalWidth, image.naturalHeight)) {
      dispatch({ type: "SOURCE_LOADED", approvedReal: isApprovedRealCover(bookId, src) });
    } else {
      dispatch({ type: "SOURCE_FAILED", reason: "ERROR" });
    }
  }, [bookId, loadState.settled, loadState.showFallback, src]);

  const markLoaded = () => {
    const image = sourceImageRef.current;
    if (!image || !isUsableBookCoverDimensions(image.naturalWidth, image.naturalHeight)) {
      dispatch({ type: "SOURCE_FAILED", reason: "ERROR" });
      return;
    }
    dispatch({ type: "SOURCE_LOADED", approvedReal: isApprovedRealCover(bookId, src) });
  };

  const markFailed = () => {
    dispatch({ type: "SOURCE_FAILED", reason: "ERROR" });
  };

  return (
    <div
      aria-label={loadState.showFallback ? `Bìa minh họa cho ${displayTitle}` : undefined}
      className={cn("relative isolate block overflow-hidden bg-slate-900 [container-type:inline-size]", className)}
      data-cover-art={loadState.showFallback ? art : undefined}
      data-cover-book-id={bookId}
      data-cover-fallback={loadState.showFallback ? "true" : "false"}
      data-cover-layout={loadState.showFallback ? layout : undefined}
      data-cover-status={loadState.status}
      role={loadState.showFallback ? "img" : undefined}
      style={{ aspectRatio: "2 / 3", ...style }}
    >
      {!loadState.showFallback && loadState.normalizedSource ? (
        <img
          ref={sourceImageRef}
          alt={alt ?? `Bìa sách ${title}`}
          className="h-full w-full bg-white object-contain"
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          loading={priority ? "eager" : loading}
          onError={markFailed}
          onLoad={markLoaded}
          src={loadState.normalizedSource}
        />
      ) : (
        <>
          <img
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            decoding="async"
            loading={priority ? "eager" : loading}
            src={`/covers/demo-art-v2/${art}.webp`}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/35" />
          <span className="absolute right-2 top-2 rounded-full border border-white/40 bg-black/55 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
            BookVerse Demo
          </span>
          <div className={cn("absolute text-white backdrop-blur-[2px]", LAYOUT_CLASSES[layout])}>
            <p className="line-clamp-3 font-serif text-[clamp(0.78rem,4.3cqw,1.25rem)] font-bold leading-[1.1] text-current">
              {displayTitle}
            </p>
            <p className="mt-2 line-clamp-2 text-[clamp(0.55rem,2.8cqw,0.8rem)] font-medium leading-tight opacity-90">
              {displayAuthor}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

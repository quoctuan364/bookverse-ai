"use client";

import React, { useEffect, useMemo, useReducer, useRef, type CSSProperties } from "react";

import {
  bookCoverLoadReducer,
  createBookCoverLoadState,
  getDemoCoverArtPath,
  getDemoCoverLayout,
  getRealCatalogLocalCoverPath,
  getRealCatalogNormalizedCoverPath,
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
  useBookVerseArtwork?: boolean;
}

/**
 * Bìa sách dùng chung toàn hệ thống.
 * Sách catalog ưu tiên bìa thật đã tải về, sau đó mới thử bản chuẩn hóa và URL
 * đúng record. Khi mọi nguồn đều lỗi, component dùng artwork BookVerse có
 * tiêu đề và tác giả thay cho ô placeholder trống.
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
  useBookVerseArtwork = false,
}: BookCoverProps) {
  // useBookVerseArtwork được giữ để tương thích với các nơi đang gọi component.
  // Dù là sách tuyển chọn, ảnh vẫn phải là bìa đúng của chính cuốn sách.
  const publicSource = src;
  const localSource = useMemo(
    () => getRealCatalogLocalCoverPath(bookId),
    [bookId],
  );
  const normalizedSource = useMemo(
    () => getRealCatalogNormalizedCoverPath(bookId),
    [bookId],
  );
  const [loadState, dispatch] = useReducer(
    bookCoverLoadReducer,
    { source: publicSource, localSource, normalizedSource },
    ({ source, localSource: initialLocalSource, normalizedSource: initialNormalizedSource }) =>
      createBookCoverLoadState(source, initialLocalSource, initialNormalizedSource),
  );
  const sourceImageRef = useRef<HTMLImageElement>(null);
  const previousSourceRef = useRef<{ bookId: string; src?: string | null; useBookVerseArtwork: boolean }>({
    bookId,
    src: publicSource,
    useBookVerseArtwork,
  });
  const displayTitle = useMemo(() => sanitizeFallbackTitle(title), [title]);
  const displayAuthor = useMemo(() => sanitizeFallbackAuthor(author), [author]);
  const displayCategory = category?.trim() || "Tủ sách BookVerse";
  const generatedArtworkPath = useMemo(
    () => getDemoCoverArtPath({ bookId, title, category }),
    [bookId, category, title],
  );
  const generatedLayout = useMemo(() => getDemoCoverLayout(bookId), [bookId]);
  const titlePosition =
    generatedLayout % 3 === 0
      ? "justify-start pt-[17cqw]"
      : generatedLayout % 3 === 1
        ? "justify-center"
        : "justify-end pb-[14cqw]";
  const accentClass = generatedLayout >= 3 ? "bg-[#E76F51]" : "bg-[#F2C14E]";

  useEffect(() => {
    if (
      previousSourceRef.current.bookId === bookId &&
      previousSourceRef.current.src === publicSource &&
      previousSourceRef.current.useBookVerseArtwork === useBookVerseArtwork
    ) {
      return;
    }
    previousSourceRef.current = { bookId, src: publicSource, useBookVerseArtwork };
    dispatch({ type: "RESET", source: publicSource, localSource, normalizedSource });
  }, [bookId, localSource, normalizedSource, publicSource, useBookVerseArtwork]);

  // Ảnh lazy bên dưới viewport chưa bắt đầu tải. Không dùng timer toàn cục vì timer
  // sẽ biến một ảnh hợp lệ thành fallback trước khi người dùng cuộn tới thẻ sách.
  void timeoutMs;

  useEffect(() => {
    const image = sourceImageRef.current;
    if (!image?.complete || loadState.settled || loadState.showFallback) return;
    if (isUsableBookCoverDimensions(image.naturalWidth, image.naturalHeight)) {
      dispatch({ type: "SOURCE_LOADED", approvedReal: isApprovedRealCover(bookId, publicSource) });
    } else {
      dispatch({ type: "SOURCE_FAILED", reason: "ERROR" });
    }
  }, [bookId, loadState.settled, loadState.showFallback, publicSource]);

  const markLoaded = () => {
    const image = sourceImageRef.current;
    if (!image || !isUsableBookCoverDimensions(image.naturalWidth, image.naturalHeight)) {
      dispatch({ type: "SOURCE_FAILED", reason: "ERROR" });
      return;
    }
    dispatch({ type: "SOURCE_LOADED", approvedReal: isApprovedRealCover(bookId, publicSource) });
  };

  const markFailed = () => {
    dispatch({ type: "SOURCE_FAILED", reason: "ERROR" });
  };

  return (
    <div
      aria-label={loadState.showFallback ? `Bìa minh họa BookVerse cho ${displayTitle}` : undefined}
      className={cn("relative isolate block overflow-hidden bg-stone-100 [container-type:inline-size]", className)}
      data-cover-book-id={bookId}
      data-cover-fallback={loadState.showFallback ? "true" : "false"}
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
        <div className="absolute inset-0 overflow-hidden bg-[#102B2A] text-white">
          <img
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            decoding="async"
            loading={priority ? "eager" : loading}
            src={generatedArtworkPath}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,24,30,0.3)_0%,rgba(9,24,30,0.18)_34%,rgba(9,24,30,0.88)_100%)]"
          />
          <div aria-hidden="true" className="absolute inset-[5cqw] border border-white/30" />
          <div className={cn("relative flex h-full flex-col px-[9cqw] text-left", titlePosition)}>
            <div>
              <div className="flex items-center gap-[3cqw]">
                <span className={cn("h-[2.4cqw] w-[14cqw] rounded-full", accentClass)} />
                <p className="text-[clamp(0.42rem,2.4cqw,0.68rem)] font-black uppercase tracking-[0.17em] text-white/90">
                  Minh họa BookVerse
                </p>
              </div>
              <p className="mt-[5cqw] line-clamp-1 text-[clamp(0.46rem,2.6cqw,0.72rem)] font-bold uppercase tracking-[0.12em] text-white/75">
                {displayCategory}
              </p>
              <p className="mt-[3cqw] line-clamp-4 text-[clamp(0.82rem,5cqw,1.45rem)] font-black leading-[1.05] tracking-[-0.025em] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
                {displayTitle}
              </p>
              <div className="mt-[5cqw] h-px w-[18cqw] bg-white/55" />
              <p className="mt-[4cqw] line-clamp-2 text-[clamp(0.52rem,2.9cqw,0.82rem)] font-semibold leading-tight text-white/90">
                {displayAuthor}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

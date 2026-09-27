"use client";

import React, { useEffect, useMemo, useReducer, useRef, type CSSProperties } from "react";
import { BookOpen } from "lucide-react";

import {
  bookCoverLoadReducer,
  createBookCoverLoadState,
  getUserDemoCoverPath,
  getUserRealCatalogCoverPath,
  getUserRealCatalogNormalizedCoverPath,
  isApprovedRealCover,
  isUsableBookCoverDimensions,
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
 * đúng record. Khi mọi nguồn đều lỗi, component hiển thị trạng thái trung tính,
 * không tự tạo bìa và không ghép ảnh của đầu sách khác.
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
    () => getUserDemoCoverPath(bookId) ?? getUserRealCatalogCoverPath(bookId),
    [bookId],
  );
  const normalizedSource = useMemo(
    () => getUserRealCatalogNormalizedCoverPath(bookId),
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
  void author;
  void category;

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
      aria-label={loadState.showFallback ? `Chưa có ảnh bìa cho ${displayTitle}` : undefined}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F2EFE7] px-[10cqw] text-center text-bv-heading">
          <span className="flex h-[22cqw] w-[22cqw] items-center justify-center rounded-full border border-bv-border bg-white text-bv-primary shadow-sm">
            <BookOpen aria-hidden="true" className="h-[11cqw] w-[11cqw]" />
          </span>
          <p className="mt-[7cqw] text-[clamp(0.58rem,3.2cqw,0.88rem)] font-black uppercase tracking-[0.1em]">
            Chưa có ảnh bìa
          </p>
          <p className="mt-[4cqw] line-clamp-3 text-[clamp(0.68rem,4cqw,1.05rem)] font-bold leading-tight">
            {displayTitle}
          </p>
          </div>
      )}
    </div>
  );
}

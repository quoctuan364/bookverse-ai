"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

import { BOOK_COVER_FALLBACK, normalizeBookCoverUrl } from "@/lib/book-cover";

interface SafeBookCoverProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> {
  alt: string;
  src?: string | null;
}

/** Ảnh bìa dùng chung: null, URL sai và lỗi tải đều chuyển sang cùng một fallback. */
export function SafeBookCover({ alt, src, ...props }: SafeBookCoverProps) {
  const normalizedSource = normalizeBookCoverUrl(src);
  const [currentSource, setCurrentSource] = useState(normalizedSource ?? BOOK_COVER_FALLBACK);
  const [ready, setReady] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    const useFallback = () => setCurrentSource(BOOK_COVER_FALLBACK);

    setCurrentSource(normalizedSource ?? BOOK_COVER_FALLBACK);
    // Ảnh có thể lỗi trước khi React hydrate và gắn onError; kiểm tra lại DOM sau hydrate.
    if (normalizedSource && image?.complete && image.naturalWidth === 0) {
      useFallback();
    }

    image?.addEventListener("error", useFallback);
    setReady(true);
    return () => image?.removeEventListener("error", useFallback);
  }, [normalizedSource]);

  const usingFallback = currentSource === BOOK_COVER_FALLBACK;

  return (
    <img
      {...props}
      alt={alt}
      data-cover-fallback={usingFallback ? "true" : "false"}
      data-cover-ready={ready ? "true" : "false"}
      onError={() => {
        if (!usingFallback) {
          setCurrentSource(BOOK_COVER_FALLBACK);
        }
      }}
      ref={imageRef}
      src={currentSource}
    />
  );
}

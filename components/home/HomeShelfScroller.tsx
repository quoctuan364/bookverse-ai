"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface HomeShelfScrollerProps {
  ariaLabel: string;
  children: ReactNode;
}

export function HomeShelfScroller({ ariaLabel, children }: HomeShelfScrollerProps) {
  const shelfRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    progress: 0,
  });

  const updateScrollState = useCallback(() => {
    const shelf = shelfRef.current;
    if (!shelf) return;
    const maxScrollLeft = Math.max(0, shelf.scrollWidth - shelf.clientWidth);
    const nextState = {
      canScrollLeft: shelf.scrollLeft > 4,
      canScrollRight: shelf.scrollLeft < maxScrollLeft - 4,
      progress: maxScrollLeft > 0 ? Math.round((shelf.scrollLeft / maxScrollLeft) * 100) : 100,
    };
    setScrollState((current) =>
      current.canScrollLeft === nextState.canScrollLeft &&
      current.canScrollRight === nextState.canScrollRight &&
      current.progress === nextState.progress
        ? current
        : nextState,
    );
  }, []);

  useEffect(() => {
    const shelf = shelfRef.current;
    if (!shelf) return;
    const frameId = window.requestAnimationFrame(updateScrollState);
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(shelf);
    shelf.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      shelf.removeEventListener("scroll", updateScrollState);
    };
  }, [children, updateScrollState]);

  function move(direction: -1 | 1) {
    const shelf = shelfRef.current;
    if (!shelf) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    shelf.scrollBy({
      left: direction * Math.max(280, shelf.clientWidth * 0.82),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  return (
    <div className="relative overflow-hidden">
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3" aria-hidden="true">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-bv-primary/12 sm:w-28">
            <div
              className="h-full rounded-full bg-bv-primary transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${20 + scrollState.progress * 0.8}%` }}
            />
          </div>
          <span className="hidden text-xs font-bold text-bv-text-subtle sm:inline">
            {scrollState.canScrollRight ? "Còn sách để khám phá" : "Bạn đã xem hết kệ"}
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
        <button
          aria-label={`Cuộn ${ariaLabel} sang trái`}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-bv-border bg-white text-bv-primary shadow-sm transition duration-200 hover:border-bv-primary hover:bg-bv-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary disabled:cursor-not-allowed disabled:border-bv-ink/8 disabled:bg-white/55 disabled:text-bv-text-muted/45 disabled:shadow-none"
          disabled={!scrollState.canScrollLeft}
          onClick={() => move(-1)}
          type="button"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          aria-label={`Cuộn ${ariaLabel} sang phải`}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-bv-border bg-white text-bv-primary shadow-sm transition duration-200 hover:border-bv-primary hover:bg-bv-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary disabled:cursor-not-allowed disabled:border-bv-ink/8 disabled:bg-white/55 disabled:text-bv-text-muted/45 disabled:shadow-none"
          disabled={!scrollState.canScrollRight}
          onClick={() => move(1)}
          type="button"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        </div>
      </div>
      <div
        aria-label={ariaLabel}
        className="bv-book-shelf grid touch-pan-x grid-flow-col auto-cols-[172px] gap-3 overflow-x-auto pb-3 sm:auto-cols-[196px] sm:gap-4 lg:auto-cols-[214px]"
        data-scroll-left={scrollState.canScrollLeft}
        data-scroll-right={scrollState.canScrollRight}
        ref={shelfRef}
        role="region"
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Expand,
  Focus,
  List,
  LockKeyhole,
  LogIn,
  Moon,
  Pause,
  PanelRightClose,
  Play,
  Search,
  Settings2,
  Sparkles,
  Square,
  ShoppingCart,
  Sun,
  Type,
  Volume2,
  X,
} from "lucide-react";
import { useHighlightEngine } from "@/components/reader/HighlightProvider";
import {
  ReaderAiAssistant,
  type ReaderSelectionAiMode,
  type ReaderSelectionAiRequest,
} from "@/components/reader/ReaderAiAssistant";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReaderChapter } from "@/actions/reader.actions";

type ReaderTheme = "dark" | "sepia" | "light";
type ReaderPanelTab = "READING" | "AI";

interface ReaderSelectionMenu {
  text: string;
  left: number;
  top: number;
}

interface EbookReaderProps {
  bookId: string;
  bookTitle: string;
  chapters: ReaderChapter[];
  readerSource: string;
  access: "FULL" | "PREVIEW";
  totalBookPages: number;
  purchaseUrl: string;
  canPurchaseEbook: boolean;
  hasDigitalAsset: boolean;
  canPersonalize: boolean;
  ebookUrl: string | null;
  currentPage: number;
  currentChapter: number;
  totalPages: number;
  progressPercent: number;
  pageContent: string;
  pages: Array<{ pageNumber: number; content: string }>;
  timeSpent: number;
  isPending: boolean;
  message: string | null;
  onBack: () => void;
  onBookmark: () => void;
  onPageChange: (page: number) => void;
  children: ReactNode;
}

const themeClass: Record<ReaderTheme, string> = {
  dark: "border-white/10 bg-slate-950/[0.96] text-zinc-100 shadow-[0_24px_90px_rgba(0,0,0,0.34)]",
  sepia:
    "border-[#D8C7A5] bg-[#FFF9ED] text-[#302414] shadow-[0_20px_60px_rgba(84,56,20,0.12)]",
  light:
    "border-zinc-200 bg-white/[0.98] text-zinc-950 shadow-[0_24px_70px_rgba(15,23,42,0.12)]",
};

const proseClass: Record<ReaderTheme, string> = {
  dark: "text-zinc-200",
  sepia: "text-[#372815]",
  light: "text-zinc-800",
};

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function buildPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const visiblePages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  const pages = [...visiblePages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const items: PaginationItem[] = [];

  pages.forEach((page, index) => {
    const previousPage = pages[index - 1];
    if (previousPage && page - previousPage > 1) {
      items.push(previousPage === 1 ? "ellipsis-start" : "ellipsis-end");
    }
    items.push(page);
  });

  return items;
}

export function EbookReader({
  bookId,
  bookTitle,
  chapters,
  readerSource,
  access,
  totalBookPages,
  purchaseUrl,
  canPurchaseEbook,
  hasDigitalAsset,
  canPersonalize,
  ebookUrl,
  currentPage,
  currentChapter,
  totalPages,
  progressPercent,
  pageContent,
  pages,
  timeSpent,
  isPending,
  message,
  onBack,
  onBookmark,
  onPageChange,
  children,
}: EbookReaderProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>("sepia");
  const [fontSize, setFontSize] = useState(19);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(20);
  const [panelTab, setPanelTab] = useState<ReaderPanelTab>("READING");
  const [selectionMenu, setSelectionMenu] =
    useState<ReaderSelectionMenu | null>(null);
  const [selectionAiRequest, setSelectionAiRequest] =
    useState<ReaderSelectionAiRequest | null>(null);
  const autoScrollRef = useRef<number | null>(null);
  const highlightEngine = useHighlightEngine();
  const currentBlockId = `page-${currentPage}`;

  const contentStyle = useMemo(
    () => ({
      fontSize: `${fontSize}px`,
      lineHeight: fontSize >= 23 ? "2" : "1.85",
    }),
    [fontSize],
  );
  const paginationItems = useMemo(
    () => buildPaginationItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("vi");

    if (normalizedQuery.length < 2) {
      return [];
    }

    return pages
      .filter((page) =>
        page.content.toLocaleLowerCase("vi").includes(normalizedQuery),
      )
      .slice(0, 8)
      .map((page) => {
        const normalizedContent = page.content.toLocaleLowerCase("vi");
        const matchIndex = normalizedContent.indexOf(normalizedQuery);
        const excerptStart = Math.max(0, matchIndex - 55);
        const excerptEnd = Math.min(
          page.content.length,
          matchIndex + normalizedQuery.length + 85,
        );

        return {
          pageNumber: page.pageNumber,
          excerpt: `${excerptStart > 0 ? "…" : ""}${page.content.slice(excerptStart, excerptEnd)}${excerptEnd < page.content.length ? "…" : ""}`,
        };
      });
  }, [pages, searchQuery]);
  const wordsRemaining = useMemo(
    () =>
      pages
        .slice(currentPage - 1)
        .reduce(
          (total, page) =>
            total + page.content.trim().split(/\s+/).filter(Boolean).length,
          0,
        ),
    [currentPage, pages],
  );
  const estimatedMinutesRemaining = Math.max(
    1,
    Math.ceil(wordsRemaining / 220),
  );
  const goalProgress = Math.min(
    100,
    Math.round((timeSpent / Math.max(60, dailyGoalMinutes * 60)) * 100),
  );

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const syncPanelWithViewport = (
      event: MediaQueryListEvent | MediaQueryList,
    ) => {
      setIsPanelOpen(event.matches);
    };

    syncPanelWithViewport(desktopQuery);
    desktopQuery.addEventListener("change", syncPanelWithViewport);
    return () =>
      desktopQuery.removeEventListener("change", syncPanelWithViewport);
  }, []);

  useEffect(() => {
    const storedPreferences = window.localStorage.getItem(
      "bookverse-reader-preferences",
    );

    if (!storedPreferences) {
      return;
    }

    try {
      const preferences = JSON.parse(storedPreferences) as Partial<{
        version: number;
        theme: ReaderTheme;
        fontSize: number;
        dailyGoalMinutes: number;
      }>;

      if (preferences.version !== 2 && preferences.version !== 3) {
        return;
      }

      if (["dark", "sepia", "light"].includes(preferences.theme ?? "")) {
        setReaderTheme(preferences.theme as ReaderTheme);
      }
      if (typeof preferences.fontSize === "number") {
        setFontSize(Math.min(28, Math.max(16, preferences.fontSize)));
      }
      if (typeof preferences.dailyGoalMinutes === "number") {
        setDailyGoalMinutes(
          Math.min(180, Math.max(5, preferences.dailyGoalMinutes)),
        );
      }
    } catch {
      window.localStorage.removeItem("bookverse-reader-preferences");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "bookverse-reader-preferences",
      JSON.stringify({
        version: 3,
        theme: readerTheme,
        fontSize,
        dailyGoalMinutes,
      }),
    );
  }, [dailyGoalMinutes, fontSize, readerTheme]);

  useEffect(() => {
    if (!isAutoScrolling) {
      if (autoScrollRef.current !== null) {
        window.clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
      return;
    }

    autoScrollRef.current = window.setInterval(
      () => window.scrollBy({ top: 2, behavior: "auto" }),
      45,
    );
    return () => {
      if (autoScrollRef.current !== null)
        window.clearInterval(autoScrollRef.current);
    };
  }, [isAutoScrolling]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    setSelectionMenu(null);
  }, [currentPage]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }

      if (event.key === "ArrowLeft" && currentPage > 1) {
        onPageChange(currentPage - 1);
      } else if (event.key === "ArrowRight" && currentPage < totalPages) {
        onPageChange(currentPage + 1);
      } else if (event.key.toLowerCase() === "b" && canPersonalize) {
        onBookmark();
      } else if (event.key === "+" || event.key === "=") {
        setFontSize((value) => Math.min(28, value + 1));
      } else if (event.key === "-") {
        setFontSize((value) => Math.max(16, value - 1));
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [canPersonalize, currentPage, onBookmark, onPageChange, totalPages]);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  }

  function toggleSpeech() {
    if (!("speechSynthesis" in window)) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(pageContent);
    utterance.lang = "vi-VN";
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }

  function captureReaderSelection() {
    highlightEngine?.captureSelection();
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setSelectionMenu(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const startElement =
      range.startContainer instanceof HTMLElement
        ? range.startContainer
        : range.startContainer.parentElement;
    const readerBlock = startElement?.closest<HTMLElement>(
      "[data-reader-block-id]",
    );
    const selectedText = selection.toString().replace(/\s+/gu, " ").trim();

    if (!readerBlock || selectedText.length < 3) {
      setSelectionMenu(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    setSelectionMenu({
      text: selectedText.slice(0, 1_800),
      left: Math.min(
        window.innerWidth - 16,
        Math.max(16, rect.left + rect.width / 2),
      ),
      top: Math.max(84, rect.top - 12),
    });
  }

  function askAiAboutSelection(mode: ReaderSelectionAiMode) {
    if (!selectionMenu) return;
    setSelectionAiRequest({
      id: Date.now(),
      mode,
      text: selectionMenu.text,
    });
    setPanelTab("AI");
    setIsPanelOpen(true);
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  }

  function navigateFromCitation(
    chapterNumber: number,
    pageNumber: number | null,
  ) {
    const chapter = chapters.find(
      (item) => item.chapterNumber === chapterNumber,
    );
    const targetPage = pageNumber ?? chapter?.startPage ?? 1;

    if (chapter?.isLocked || targetPage > totalPages) {
      return;
    }

    onPageChange(targetPage);
    window.requestAnimationFrame(() => {
      document.querySelector("[data-reader-theme]")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <main className="bv-reader min-h-dvh overflow-x-hidden bg-[#F4F1EA] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/[0.92] shadow-[0_8px_30px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Button
            aria-label="Quay lại"
            className="min-h-11 min-w-11 border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            onClick={onBack}
            size="icon"
            type="button"
            variant="outline"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-bv-focus">
              Đang đọc
            </p>
            <h1 className="truncate text-sm font-black text-slate-900 sm:text-base">
              {bookTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              aria-label={
                isSpeaking ? "Dừng đọc thành tiếng" : "Đọc trang thành tiếng"
              }
              className="hidden border-slate-200 bg-white text-slate-700 hover:bg-slate-100 sm:inline-flex"
              onClick={toggleSpeech}
              size="icon"
              type="button"
              variant="outline"
            >
              {isSpeaking ? (
                <Square className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <Button
              aria-label={
                isFocusMode ? "Tắt chế độ tập trung" : "Bật chế độ tập trung"
              }
              className="hidden border-slate-200 bg-white text-slate-700 hover:bg-slate-100 sm:inline-flex"
              onClick={() => {
                setIsFocusMode((value) => !value);
                setIsPanelOpen(false);
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <Focus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              aria-label="Bật chế độ toàn màn hình"
              className="hidden border-slate-200 bg-white text-slate-700 hover:bg-slate-100 sm:inline-flex"
              onClick={() => void toggleFullscreen()}
              size="icon"
              type="button"
              variant="outline"
            >
              <Expand className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              aria-label={
                isPanelOpen ? "Ẩn bảng tùy chỉnh" : "Mở bảng tùy chỉnh"
              }
              className="min-h-11 min-w-11 border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              onClick={() => setIsPanelOpen((currentValue) => !currentValue)}
              size="icon"
              type="button"
              variant="outline"
            >
              {isPanelOpen ? (
                <PanelRightClose className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Settings2 className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            {canPersonalize ? (
              <Button
                aria-label="Đánh dấu trang"
                className="min-h-11 min-w-11 gap-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                disabled={isPending}
                onClick={onBookmark}
                type="button"
                variant="outline"
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Bookmark</span>
              </Button>
            ) : (
              <Link
                aria-label="Đăng nhập để lưu tiến độ đọc"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-focus focus-visible:ring-offset-2"
                href={`/login?callbackUrl=${encodeURIComponent(`/read/${bookId}`)}`}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Đăng nhập để lưu</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <section
        className={cn(
          "mx-auto grid w-full gap-6 px-3 py-5 sm:px-6 sm:py-8 lg:px-8",
          isFocusMode
            ? "max-w-4xl"
            : isPanelOpen
              ? "max-w-7xl lg:grid-cols-[minmax(0,1fr)_320px]"
              : "max-w-4xl",
        )}
      >
        {access === "PREVIEW" ? (
          <div
            className="bv-reader-preview flex flex-col gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:col-span-2"
            data-reader-access="PREVIEW"
          >
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-200/70 text-amber-800">
                <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-black text-amber-950">
                  Bạn đang đọc thử Ebook (tối đa 10%)
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Bạn đã đọc hết nội dung xem thử (10%). Hãy đăng ký gói để tiếp tục đọc.
                </p>
              </div>
            </div>
            <Link
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#D6A84F] px-4 py-2 text-sm font-black text-slate-950 shadow-sm transition hover:bg-bv-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              href="/membership"
            >
              <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
              Xem các gói đọc sách
            </Link>
          </div>
        ) : access === "FULL" ? (
          <div
            className="bv-reader-full flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 lg:col-span-2"
            data-reader-access="FULL"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            Đã mở toàn bộ sách · {totalBookPages} trang nội dung
          </div>
        ) : (
          <div
            className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950 lg:col-span-2"
            data-reader-access="INTRO"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-300/15">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-black">Nội dung giới thiệu sách</p>
              <p className="mt-1 text-sm leading-6 text-sky-800">
                Đầu sách này chưa có tệp Ebook được BookVerse xác minh và phát
                hành. Nội dung bên dưới chỉ được tạo từ metadata, không phải
                toàn văn cuốn sách.
              </p>
            </div>
          </div>
        )}
        <div className="min-w-0 lg:self-start">
          <article
            className={cn(
              "mx-auto rounded-[1.5rem] border px-5 py-7 transition-colors sm:px-10 sm:py-12 lg:px-14",
              themeClass[readerTheme],
            )}
            data-reader-theme={readerTheme}
          >
            <div className="mx-auto mb-8 flex max-w-[68ch] items-center justify-between gap-4 border-b border-current/10 pb-4 text-xs font-bold uppercase tracking-[0.08em] opacity-65">
              <span>
                Chương {currentChapter} · Trang {currentPage}
              </span>
              <span>{progressPercent}% hoàn thành</span>
            </div>

            <p className="mx-auto mb-4 max-w-[68ch] text-xs font-bold uppercase tracking-[0.12em] opacity-75">
              Nguồn · {readerSource}
              {hasDigitalAsset ? " · Bản số hóa xác thực" : ""}
            </p>

            <div className="mx-auto max-w-[68ch] font-sans">
              <p
                className={cn(
                  "whitespace-pre-line transition-all",
                  proseClass[readerTheme],
                )}
                data-reader-block-id={currentBlockId}
                onMouseUp={captureReaderSelection}
                style={contentStyle}
              >
                {highlightEngine?.renderHighlightedText(
                  pageContent,
                  currentBlockId,
                ) ?? pageContent}
              </p>
            </div>
          </article>

          {access === "PREVIEW" ? (
            <section
              aria-label="Thông báo khóa nội dung xem thử"
              className="mt-6 rounded-2xl border border-amber-300/90 bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-100/40 p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-200/80 text-amber-900 shadow-inner">
                  <LockKeyhole className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-amber-950">
                    Giới hạn xem thử 10%
                  </h3>
                  <p className="mt-1.5 text-sm font-medium leading-6 text-amber-900">
                    Bạn đã đọc hết nội dung xem thử (10%). Hãy đăng ký gói để tiếp tục đọc.
                  </p>

                  <div className="mt-4 rounded-xl border border-amber-200 bg-white/90 p-3.5 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                      <span>Tiến độ đọc thử</span>
                      <span>
                        {totalPages} / {totalBookPages} phần (10% sách)
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-amber-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(10, Math.round((currentPage / totalPages) * 100)),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#D6A84F] px-5 py-2.5 text-sm font-black text-slate-950 shadow-sm transition hover:bg-[#c99b42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                      href="/membership"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
                      Xem các gói đọc sách
                    </Link>
                    {canPurchaseEbook && purchaseUrl ? (
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300/80 bg-white px-5 py-2.5 text-sm font-bold text-amber-950 shadow-sm transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                        href={purchaseUrl}
                      >
                        Mua riêng bản Ebook này
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {children}

          {message || highlightEngine?.message ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              {message ?? highlightEngine?.message}
            </p>
          ) : null}
        </div>

        {isPanelOpen ? (
          <>
            <button
              aria-label="Đóng bảng công cụ"
              className="fixed inset-0 z-40 cursor-default bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
              onClick={() => setIsPanelOpen(false)}
              type="button"
            />
            <aside className="bv-reader-chrome fixed inset-x-3 bottom-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/[0.98] p-5 text-zinc-100 shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl lg:sticky lg:inset-auto lg:top-24 lg:z-10 lg:h-fit lg:max-h-[calc(100dvh-7rem)]">
              <div className="mb-4 flex items-center justify-between lg:hidden">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-bv-gold">
                    Trình đọc
                  </p>
                  <h2 className="mt-0.5 font-black text-white">
                    Mục lục & công cụ
                  </h2>
                </div>
                <Button
                  aria-label="Đóng bảng công cụ"
                  className="min-h-11 min-w-11 border-white/10 bg-white/[0.06] text-white hover:bg-white/12"
                  onClick={() => setIsPanelOpen(false)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div
                aria-label="Công cụ bên cạnh trình đọc"
                className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-white/[0.05] p-1"
                role="tablist"
              >
                <button
                  aria-selected={panelTab === "READING"}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold",
                    panelTab === "READING"
                      ? "bg-bv-focus text-white"
                      : "text-zinc-300 hover:bg-white/[0.08]",
                  )}
                  onClick={() => setPanelTab("READING")}
                  role="tab"
                  type="button"
                >
                  <List className="h-4 w-4" aria-hidden="true" />
                  Đọc sách
                </button>
                <button
                  aria-selected={panelTab === "AI"}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold",
                    panelTab === "AI"
                      ? "bg-bv-focus text-white"
                      : "text-zinc-300 hover:bg-white/[0.08]",
                  )}
                  onClick={() => setPanelTab("AI")}
                  role="tab"
                  type="button"
                >
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  Nova AI
                </button>
              </div>

              {panelTab === "AI" ? (
                <ReaderAiAssistant
                  bookId={bookId}
                  currentChapterNumber={currentChapter}
                  onCitationNavigate={navigateFromCitation}
                  selectionRequest={selectionAiRequest}
                />
              ) : (
                <>
                  {chapters.length > 0 ? (
                    <nav
                      aria-label="Mục lục Ebook"
                      className="border-b border-white/10 pb-5"
                    >
                      <div className="flex items-center gap-2">
                        <List
                          className="h-5 w-5 text-bv-gold"
                          aria-hidden="true"
                        />
                        <h2 className="text-lg font-black">Mục lục</h2>
                      </div>
                      <ol className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                        {chapters.map((chapter) => (
                          <li key={chapter.chapterNumber}>
                            <button
                              aria-current={
                                currentChapter === chapter.chapterNumber
                                  ? "location"
                                  : undefined
                              }
                              className={cn(
                                "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold/70 disabled:cursor-not-allowed disabled:opacity-55",
                                currentChapter === chapter.chapterNumber
                                  ? "border-bv-gold/60 bg-bv-gold/14 text-[#F7D98A]"
                                  : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.09]",
                              )}
                              disabled={chapter.isLocked}
                              onClick={() => onPageChange(chapter.startPage)}
                              type="button"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-xs font-black">
                                {chapter.chapterNumber}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 block font-bold">
                                  {chapter.chapterTitle}
                                </span>
                                <span className="mt-0.5 block text-xs opacity-65">
                                  {chapter.isLocked
                                    ? "Cần mua Ebook"
                                    : `Bắt đầu từ trang ${chapter.startPage}`}
                                </span>
                              </span>
                              {chapter.isLocked ? (
                                <LockKeyhole
                                  className="h-4 w-4 shrink-0"
                                  aria-hidden="true"
                                />
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ol>
                    </nav>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <Settings2
                      className="h-5 w-5 text-bv-gold"
                      aria-hidden="true"
                    />
                    <h2 className="text-lg font-black">Tùy chỉnh đọc</h2>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-zinc-300">Cỡ chữ</p>
                      <span className="rounded-full bg-white/[0.07] px-2 py-1 text-xs font-bold text-bv-gold">
                        {fontSize}px
                      </span>
                    </div>
                    <input
                      aria-label="Tăng giảm cỡ chữ"
                      className="h-11 w-full cursor-pointer accent-[#D6A84F]"
                      max={28}
                      min={16}
                      onChange={(event) =>
                        setFontSize(Number(event.target.value))
                      }
                      type="range"
                      value={fontSize}
                    />
                  </div>

                  <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                    <div className="flex items-center gap-2">
                      <Search
                        className="h-4 w-4 text-bv-gold"
                        aria-hidden="true"
                      />
                      <p className="text-sm font-bold text-zinc-300">
                        Tìm trong sách
                      </p>
                    </div>
                    <input
                      aria-label="Tìm trong nội dung sách"
                      className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.07] px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-[#D6A84F]/35"
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Nhập ít nhất 2 ký tự..."
                      type="search"
                      value={searchQuery}
                    />
                    {searchQuery.trim().length >= 2 ? (
                      <div
                        className="max-h-64 space-y-2 overflow-y-auto"
                        aria-live="polite"
                      >
                        {searchResults.length > 0 ? (
                          searchResults.map((result) => (
                            <button
                              className="w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-left transition hover:bg-white/[0.1]"
                              key={result.pageNumber}
                              onClick={() => onPageChange(result.pageNumber)}
                              type="button"
                            >
                              <span className="block text-xs font-black text-bv-gold">
                                Trang {result.pageNumber}
                              </span>
                              <span className="mt-1 line-clamp-3 block text-xs leading-5 text-zinc-300">
                                {result.excerpt}
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-zinc-500">
                            Không tìm thấy nội dung phù hợp.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                    <p className="text-sm font-bold text-zinc-300">
                      Công cụ hỗ trợ đọc
                    </p>
                    <button
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-bold text-zinc-300 transition hover:bg-white/[0.1]"
                      onClick={() => setIsAutoScrolling((value) => !value)}
                      type="button"
                    >
                      {isAutoScrolling ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {isAutoScrolling ? "Dừng tự cuộn" : "Bắt đầu tự cuộn"}
                    </button>
                    <button
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-bold text-zinc-300 transition hover:bg-white/[0.1]"
                      onClick={toggleSpeech}
                      type="button"
                    >
                      {isSpeaking ? (
                        <Square className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                      {isSpeaking
                        ? "Dừng đọc thành tiếng"
                        : "Đọc trang thành tiếng"}
                    </button>
                    <div className="rounded-xl bg-white/[0.05] p-3 text-xs leading-5 text-zinc-400">
                      Còn khoảng{" "}
                      <strong className="text-bv-gold">
                        {estimatedMinutesRemaining} phút
                      </strong>{" "}
                      đọc ở tốc độ 220 từ/phút.
                    </div>
                  </div>

                  <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-zinc-300">
                        Mục tiêu phiên đọc
                      </p>
                      <span className="text-xs font-black text-bv-gold">
                        {goalProgress}%
                      </span>
                    </div>
                    <input
                      aria-label="Mục tiêu số phút đọc"
                      className="h-11 w-full cursor-pointer accent-[#D6A84F]"
                      max={180}
                      min={5}
                      onChange={(event) =>
                        setDailyGoalMinutes(Number(event.target.value))
                      }
                      step={5}
                      type="range"
                      value={dailyGoalMinutes}
                    />
                    <p className="text-xs text-zinc-500">
                      Mục tiêu {dailyGoalMinutes} phút · đã đọc{" "}
                      {Math.floor(timeSpent / 60)} phút trong phiên.
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-bv-focus transition-all"
                        style={{ width: `${goalProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                    <div className="flex items-center gap-2">
                      <List
                        className="h-4 w-4 text-bv-gold"
                        aria-hidden="true"
                      />
                      <p className="text-sm font-bold text-zinc-300">
                        Đi đến trang
                      </p>
                    </div>
                    <select
                      aria-label="Chọn trang cần đọc"
                      className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-zinc-100"
                      onChange={(event) =>
                        onPageChange(Number(event.target.value))
                      }
                      value={currentPage}
                    >
                      {pages.map((page) => (
                        <option key={page.pageNumber} value={page.pageNumber}>
                          Trang {page.pageNumber}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs leading-5 text-zinc-500">
                      Phím tắt: ←/→ chuyển trang, B đánh dấu, +/- đổi cỡ chữ.
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <p className="text-sm font-bold text-zinc-300">
                      Theme đọc sách
                    </p>
                    <div className="grid gap-2">
                      {(
                        [
                          { value: "dark", label: "Dark", icon: Moon },
                          { value: "sepia", label: "Sepia", icon: Type },
                          { value: "light", label: "Light", icon: Sun },
                        ] as const
                      ).map((theme) => {
                        const Icon = theme.icon;

                        return (
                          <button
                            className={cn(
                              "inline-flex min-h-11 items-center justify-between rounded-xl border px-3 text-sm font-bold transition",
                              readerTheme === theme.value
                                ? "border-bv-focus/70 bg-bv-focus/22 text-white"
                                : "border-white/10 bg-white/[0.05] text-zinc-300 hover:bg-white/[0.09]",
                            )}
                            key={theme.value}
                            onClick={() => setReaderTheme(theme.value)}
                            type="button"
                          >
                            <span className="inline-flex items-center gap-2">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                              {theme.label}
                            </span>
                            <span
                              className={cn(
                                "h-4 w-4 rounded-full border",
                                theme.value === "dark" &&
                                  "border-zinc-600 bg-slate-950",
                                theme.value === "sepia" &&
                                  "border-[#7C5D2E] bg-[#E8D9B8]",
                                theme.value === "light" &&
                                  "border-zinc-200 bg-white",
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </aside>
          </>
        ) : null}
      </section>

      {selectionMenu ? (
        <div
          aria-label="Thao tác AI với văn bản đã chọn"
          className="fixed z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-full flex-wrap justify-center gap-1 rounded-xl border border-white/15 bg-[#102A28]/[0.98] p-1.5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
          role="toolbar"
          style={{ left: selectionMenu.left, top: selectionMenu.top }}
        >
          {(
            [
              { mode: "EXPLAIN", label: "AI Giải thích" },
              { mode: "SUMMARIZE", label: "Tóm tắt đoạn này" },
              { mode: "QUIZ", label: "Tạo câu hỏi ôn tập" },
            ] as const
          ).map((action) => (
            <button
              className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-black text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
              key={action.mode}
              onClick={() => askAiAboutSelection(action.mode)}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              <Sparkles
                className="h-3.5 w-3.5 text-bv-gold"
                aria-hidden="true"
              />
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      <footer className="bv-reader-chrome sticky bottom-0 z-30 border-t border-white/10 bg-slate-950/[0.96] shadow-[0_-10px_30px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <div className="grid min-w-0 grid-cols-[auto_minmax(5rem,1fr)_auto] items-center gap-2 sm:gap-3">
            <Button
              aria-label="Trang trước"
              className="gap-2 border-white/10 bg-white/[0.06] text-zinc-100 hover:bg-white/12"
              disabled={currentPage === 1 || isPending}
              onClick={() => onPageChange(currentPage - 1)}
              type="button"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Trang trước</span>
            </Button>

            <div className="flex min-h-11 min-w-0 items-center justify-center">
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-center text-xs font-bold text-zinc-300 sm:text-sm">
                <strong className="text-bv-gold">{progressPercent}%</strong> đã đọc
              </span>
            </div>

            <Button
              aria-label="Trang sau"
              className="gap-2 bg-bv-focus text-white hover:bg-[#0F5F59]"
              disabled={currentPage === totalPages || isPending}
              onClick={() => onPageChange(currentPage + 1)}
              type="button"
            >
              <span className="hidden sm:inline">Trang sau</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>
              Trang {currentPage} / {totalPages}
            </span>
            <span>Thời gian phiên: {timeSpent}s</span>
          </div>

          <nav
            aria-label="Chọn trang đọc"
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {paginationItems.map((item) =>
              typeof item === "number" ? (
                <button
                  aria-current={item === currentPage ? "page" : undefined}
                  aria-label={`Đi đến trang ${item}`}
                  className={cn(
                    "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold",
                    item === currentPage
                      ? "border-[#D6A84F] bg-[#D6A84F] text-slate-950 shadow-[0_8px_24px_rgba(214,168,79,0.24)]"
                      : "border-white/10 bg-white/[0.06] text-zinc-200 hover:border-white/25 hover:bg-white/12",
                  )}
                  disabled={isPending}
                  key={item}
                  onClick={() => onPageChange(item)}
                  type="button"
                >
                  {item}
                </button>
              ) : (
                <span
                  aria-hidden="true"
                  className="inline-flex min-h-11 min-w-6 items-center justify-center text-zinc-500"
                  key={item}
                >
                  …
                </span>
              ),
            )}
          </nav>

          {ebookUrl ? (
            <Link
              className="hidden text-sm font-bold text-bv-gold hover:underline lg:inline"
              href={ebookUrl}
              target="_blank"
            >
              Mở bản HTML gốc
            </Link>
          ) : null}

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#D6A84F] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <Link className="sr-only" href={`/book/${bookId}`}>
            Quay về chi tiết sách
          </Link>
        </div>
      </footer>
    </main>
  );
}

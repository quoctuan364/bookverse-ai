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
  Copy,
  Crown,
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
type ReaderPanelTab = "CHAPTERS" | "NOTES" | "AI" | "SETTINGS";

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

const mainThemeClass: Record<ReaderTheme, string> = {
  dark: "bg-[#0E1318] text-[#E4E8EC]",
  sepia: "bg-[#F7F2E6] text-[#2C2016]",
  light: "bg-[#F8F6F0] text-[#1E2925]",
};

const headerThemeClass: Record<ReaderTheme, string> = {
  dark: "border-white/10 bg-[#141B22]/90 text-white backdrop-blur-xl shadow-xs",
  sepia: "border-[#DFD2B7] bg-[#EFE3C9]/90 text-[#2C2016] backdrop-blur-xl shadow-xs",
  light: "border-bv-ink/10 bg-white/90 text-bv-ink backdrop-blur-xl shadow-xs",
};

const headerButtonClass: Record<ReaderTheme, string> = {
  dark: "border-white/10 bg-white/[0.06] text-zinc-200 hover:bg-white/12 hover:text-white",
  sepia: "border-[#DECDB0] bg-white/60 text-[#3D2E1E] hover:bg-white/90 hover:text-[#2C2016]",
  light: "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
};

const themeClass: Record<ReaderTheme, string> = {
  dark: "border-white/10 bg-[#161D26] text-zinc-100 shadow-[0_20px_60px_rgba(0,0,0,0.6)]",
  sepia: "border-[#DECDB0] bg-[#FFFDF7] text-[#2C2016] shadow-[0_16px_50px_rgba(84,56,20,0.06)]",
  light: "border-bv-ink/10 bg-white text-[#1C2825] shadow-[0_16px_50px_rgba(15,76,71,0.05)]",
};

const proseClass: Record<ReaderTheme, string> = {
  dark: "text-zinc-200",
  sepia: "text-[#2E2012]",
  light: "text-[#1C2825]",
};

const footerThemeClass: Record<ReaderTheme, string> = {
  dark: "border-white/10 bg-[#141B22]/95 text-zinc-200 backdrop-blur-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.3)]",
  sepia: "border-[#DFD2B7] bg-[#EFE3C9]/95 text-[#2C2016] backdrop-blur-2xl shadow-[0_-10px_30px_rgba(84,56,20,0.06)]",
  light: "border-zinc-200 bg-white/95 text-zinc-800 backdrop-blur-2xl shadow-[0_-10px_30px_rgba(15,23,42,0.05)]",
};

const footerButtonClass: Record<ReaderTheme, string> = {
  dark: "border-white/10 bg-white/[0.06] text-zinc-200 hover:bg-white/12",
  sepia: "border-[#DECDB0] bg-white/60 text-[#3D2E1E] hover:bg-white/90",
  light: "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100",
};

const panelThemeClass: Record<ReaderTheme, string> = {
  dark: "border-white/10 bg-[#161D26]/[0.98] text-zinc-100 shadow-[0_24px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl",
  sepia: "border-[#DECDB0] bg-[#FFFDF7]/[0.98] text-[#2C2016] shadow-[0_24px_80px_rgba(84,56,20,0.12)] backdrop-blur-2xl",
  light: "border-bv-ink/10 bg-white/[0.98] text-bv-ink shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl",
};

export function EbookReader({
  bookId,
  bookTitle,
  chapters,
  access,
  totalBookPages,
  purchaseUrl,
  canPurchaseEbook,
  canPersonalize,
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
  const [isSerif, setIsSerif] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(20);
  const [panelTab, setPanelTab] = useState<ReaderPanelTab>("CHAPTERS");
  const [selectionMenu, setSelectionMenu] =
    useState<ReaderSelectionMenu | null>(null);
  const [selectionAiRequest, setSelectionAiRequest] =
    useState<ReaderSelectionAiRequest | null>(null);
  const autoScrollRef = useRef<number | null>(null);
  const highlightEngine = useHighlightEngine();
  const currentBlockId = `page-${currentPage}`;

  const currentChapterObj = chapters.find((c) => c.chapterNumber === currentChapter);

  const contentStyle = useMemo(
    () => ({
      fontSize: `${fontSize}px`,
      lineHeight: fontSize >= 23 ? "2.15" : "1.9",
      fontFamily: isSerif
        ? 'Georgia, Cambria, "Times New Roman", Times, serif'
        : 'var(--font-bookverse-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
    [fontSize, isSerif],
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
        isSerif: boolean;
        dailyGoalMinutes: number;
      }>;

      if (["dark", "sepia", "light"].includes(preferences.theme ?? "")) {
        setReaderTheme(preferences.theme as ReaderTheme);
      }
      if (typeof preferences.fontSize === "number") {
        setFontSize(Math.min(28, Math.max(15, preferences.fontSize)));
      }
      if (typeof preferences.isSerif === "boolean") {
        setIsSerif(preferences.isSerif);
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
        version: 4,
        theme: readerTheme,
        fontSize,
        isSerif,
        dailyGoalMinutes,
      }),
    );
  }, [dailyGoalMinutes, fontSize, isSerif, readerTheme]);

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
        setFontSize((value) => Math.max(15, value - 1));
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
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = pageContent.slice(0, 3_000);
    if (!textToSpeak.trim()) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "vi-VN";
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang.startsWith("vi"));
    if (viVoice) {
      utterance.voice = viVoice;
    }

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

  async function quickHighlight(color: "YELLOW" | "GREEN" | "PINK") {
    if (!highlightEngine) return;
    try {
      await highlightEngine.saveSelectionHighlight("", color);
    } catch (e) {
      console.error(e);
    }
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  }

  async function copySelectedText() {
    if (!selectionMenu) return;
    try {
      await navigator.clipboard.writeText(selectionMenu.text);
    } catch (e) {
      console.error(e);
    }
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
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
    <main className={cn("bv-reader min-h-dvh overflow-x-hidden transition-colors duration-300", mainThemeClass[readerTheme])}>
      {/* Top Navigation Bar */}
      <header className={cn("sticky top-0 z-40 border-b transition-colors duration-300", headerThemeClass[readerTheme])}>
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          {/* Left: Back & Title */}
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-label="Quay lại"
              className={cn("h-10 w-10 shrink-0 transition-all rounded-xl", headerButtonClass[readerTheme])}
              onClick={onBack}
              size="icon"
              type="button"
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>

            <div className="min-w-0">
              <h1 className="truncate text-xs font-black sm:text-sm">
                {bookTitle}
              </h1>
              <p className="truncate text-[11px] font-bold text-bv-primary">
                {currentChapterObj ? `Chương ${currentChapter}: ${currentChapterObj.chapterTitle}` : `Trang ${currentPage} / ${totalPages}`}
              </p>
            </div>
          </div>

          {/* Right: Quick Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Font Size A- / A+ */}
            <div className="hidden sm:flex items-center rounded-xl border border-current/15 p-0.5">
              <button
                aria-label="Giảm cỡ chữ"
                className="h-8 px-2 text-xs font-black opacity-80 hover:opacity-100 hover:bg-current/10 rounded-lg transition"
                onClick={() => setFontSize((value) => Math.max(15, value - 1))}
                type="button"
              >
                A-
              </button>
              <button
                aria-label="Tăng cỡ chữ"
                className="h-8 px-2 text-sm font-black opacity-80 hover:opacity-100 hover:bg-current/10 rounded-lg transition"
                onClick={() => setFontSize((value) => Math.min(28, value + 1))}
                type="button"
              >
                A+
              </button>
            </div>

            {/* Quick Themes: Sáng / Sepia / Tối */}
            <div className="hidden md:flex items-center gap-1 rounded-xl border border-current/15 p-0.5">
              <button
                aria-label="Nền sáng"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition",
                  readerTheme === "light" ? "bg-white text-zinc-900 shadow-xs" : "opacity-60 hover:opacity-100",
                )}
                onClick={() => setReaderTheme("light")}
                title="Giao diện Sáng"
                type="button"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                aria-label="Nền cổ điển"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition",
                  readerTheme === "sepia" ? "bg-[#DECDB0] text-[#2C2016] shadow-xs" : "opacity-60 hover:opacity-100",
                )}
                onClick={() => setReaderTheme("sepia")}
                title="Giao diện Sepia (Cổ điển)"
                type="button"
              >
                <Type className="h-4 w-4" />
              </button>
              <button
                aria-label="Nền tối"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition",
                  readerTheme === "dark" ? "bg-white/20 text-white shadow-xs" : "opacity-60 hover:opacity-100",
                )}
                onClick={() => setReaderTheme("dark")}
                title="Giao diện Tối"
                type="button"
              >
                <Moon className="h-4 w-4" />
              </button>
            </div>

            {/* Bookmark */}
            {canPersonalize ? (
              <Button
                aria-label="Đánh dấu trang"
                className={cn("h-10 px-3 gap-1.5 rounded-xl", headerButtonClass[readerTheme])}
                disabled={isPending}
                onClick={onBookmark}
                title="Đánh dấu trang hiện tại (Phím tắt B)"
                type="button"
                variant="outline"
              >
                <Bookmark className="h-4 w-4 text-amber-500" aria-hidden="true" />
                <span className="hidden lg:inline text-xs font-bold">Dấu trang</span>
              </Button>
            ) : null}

            {/* Read Aloud Voice */}
            <Button
              aria-label={isSpeaking ? "Dừng đọc" : "Đọc thành tiếng"}
              className={cn("hidden lg:inline-flex h-10 w-10 rounded-xl", headerButtonClass[readerTheme])}
              onClick={toggleSpeech}
              size="icon"
              title="Đọc trang thành tiếng"
              type="button"
              variant="outline"
            >
              {isSpeaking ? (
                <Square className="h-4 w-4 text-rose-500" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>

            {/* Focus mode */}
            <Button
              aria-label={isFocusMode ? "Tắt tập trung" : "Bật tập trung"}
              className={cn("hidden lg:inline-flex h-10 w-10 rounded-xl", headerButtonClass[readerTheme])}
              onClick={() => {
                setIsFocusMode((v) => !v);
                setIsPanelOpen(false);
              }}
              size="icon"
              title="Chế độ đọc tập trung"
              type="button"
              variant="outline"
            >
              <Focus className="h-4 w-4" />
            </Button>

            {/* Fullscreen */}
            <Button
              aria-label="Toàn màn hình"
              className={cn("hidden lg:inline-flex h-10 w-10 rounded-xl", headerButtonClass[readerTheme])}
              onClick={() => void toggleFullscreen()}
              size="icon"
              title="Toàn màn hình"
              type="button"
              variant="outline"
            >
              <Expand className="h-4 w-4" />
            </Button>

            {/* Panel Drawer Toggle Button */}
            <Button
              aria-label={isPanelOpen ? "Đóng bảng công cụ" : "Mở bảng công cụ"}
              className={cn("h-10 px-3.5 gap-2 rounded-xl bg-bv-primary text-white hover:bg-bv-primary-dark transition shadow-xs")}
              onClick={() => setIsPanelOpen((currentValue) => !currentValue)}
              type="button"
            >
              {isPanelOpen ? (
                <PanelRightClose className="h-4 w-4" aria-hidden="true" />
              ) : (
                <List className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="text-xs font-bold">Mục lục & Nova</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Reading Canvas & Sidebar Drawer */}
      <section
        className={cn(
          "mx-auto grid w-full gap-8 px-3 py-6 sm:px-6 sm:py-10 transition-all",
          isFocusMode
            ? "max-w-3xl"
            : isPanelOpen
              ? "max-w-7xl lg:grid-cols-[minmax(0,1fr)_380px]"
              : "max-w-4xl",
        )}
      >
        {/* Central Book Reader */}
        <div className="mx-auto w-full min-w-0">
          {/* Access Preview Banner */}
          {access === "PREVIEW" ? (
            <div
              className={cn(
                "bv-reader-preview mb-6 flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between",
                readerTheme === "dark"
                  ? "border-amber-400/25 bg-amber-950/40 text-amber-100"
                  : readerTheme === "sepia"
                    ? "border-amber-300/80 bg-amber-50/70 text-[#6A4700]"
                    : "border-amber-200 bg-amber-50 text-amber-950",
              )}
              data-reader-access="PREVIEW"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-600 font-bold">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">
                    Bản đọc thử 10% · {totalPages} phần xem trước
                  </p>
                  <p className="text-xs opacity-80">
                    Đăng ký gói Hội viên VIP để mở khóa đọc không giới hạn toàn bộ cuốn sách.
                  </p>
                </div>
              </div>
              <Link
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F2C14E] to-[#E5AB2D] px-4 py-2 text-xs font-black text-[#4A3000] shadow-md transition hover:brightness-105 active:scale-95"
                href="/membership"
              >
                <Crown className="h-3.5 w-3.5 fill-[#4A3000]" aria-hidden="true" />
                Mở khóa toàn bộ
              </Link>
            </div>
          ) : access === "FULL" ? (
            <div
              className={cn(
                "bv-reader-full mb-6 flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold",
                readerTheme === "dark"
                  ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800",
              )}
              data-reader-access="FULL"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              Đặc quyền Hội viên VIP: Đọc toàn bộ tác phẩm · {totalBookPages} trang
            </div>
          ) : null}

          {/* Book Canvas (The Paper Page) */}
          <article
            className={cn(
              "relative mx-auto rounded-3xl border px-6 py-8 transition-all sm:px-12 sm:py-14 lg:px-16 shadow-[0_16px_50px_rgba(0,0,0,0.05)]",
              themeClass[readerTheme],
            )}
            data-reader-theme={readerTheme}
          >
            {/* Header info inside paper */}
            <div className="mx-auto mb-8 flex max-w-[68ch] items-center justify-between border-b border-current/10 pb-4 text-xs font-bold uppercase tracking-[0.08em] opacity-60">
              <span className="line-clamp-1">
                {currentChapterObj ? `Chương ${currentChapter} · Trang ${currentPage}` : `Trang ${currentPage} / ${totalPages}`}
              </span>
              <span>{progressPercent}% hoàn thành</span>
            </div>

            {/* Book text */}
            <div className="mx-auto max-w-[68ch]">
              <p
                className={cn(
                  "whitespace-pre-line select-text selection:bg-amber-300/40",
                  proseClass[readerTheme],
                )}
                data-reader-block-id={currentBlockId}
                onMouseUp={captureReaderSelection}
                onTouchEnd={captureReaderSelection}
                style={contentStyle}
              >
                {highlightEngine?.renderHighlightedText(
                  pageContent,
                  currentBlockId,
                ) ?? pageContent}
              </p>
            </div>
          </article>

          {/* Paywall Locked Section at End of Preview */}
          {access === "PREVIEW" && currentPage >= totalPages ? (
            <section
              aria-label="Thông báo khóa nội dung xem thử"
              className="mt-8 rounded-3xl border border-amber-300/90 bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-100/40 p-6 sm:p-8 shadow-sm text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-200/80 text-amber-900 shadow-inner">
                <LockKeyhole className="h-7 w-7" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-xl font-black text-amber-950">
                Đã xem hết 10% phần đọc thử
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-amber-900/90">
                Bạn đã hoàn thành nội dung xem trước của cuốn sách. Hãy mở khóa trọn vẹn ấn bản cùng 10.000+ tựa sách khác với gói Hội viên BookVerse VIP.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F2C14E] to-[#E5AB2D] px-6 py-2.5 text-sm font-black text-[#4A3000] shadow-md transition hover:brightness-105 active:scale-95"
                  href="/membership"
                >
                  <Crown className="h-4 w-4" />
                  Mở khóa Hội viên VIP
                </Link>
                {canPurchaseEbook && purchaseUrl && !purchaseUrl.startsWith("/membership") ? (
                  <Link
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-bold text-amber-950 shadow-xs transition hover:bg-amber-50"
                    href={purchaseUrl}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Mua sách giấy / Đơn lẻ
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}

          {message || highlightEngine?.message ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xs">
              {message ?? highlightEngine?.message}
            </p>
          ) : null}
        </div>

        {/* Slide-over Side Panel (Mục lục, Ghi chú, Nova AI, Cài đặt) */}
        {isPanelOpen ? (
          <>
            <button
              aria-label="Đóng bảng công cụ"
              className="fixed inset-0 z-40 cursor-default bg-black/40 backdrop-blur-xs lg:hidden"
              onClick={() => setIsPanelOpen(false)}
              type="button"
            />
            <aside
              className={cn(
                "bv-reader-chrome fixed inset-x-3 bottom-3 z-50 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300 lg:sticky lg:inset-auto lg:top-24 lg:z-10 lg:h-fit lg:max-h-[calc(100dvh-7rem)] w-full lg:w-96",
                panelThemeClass[readerTheme],
              )}
            >
              {/* Panel Header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bv-gold">
                    Tiện ích đọc sách
                  </p>
                  <h2 className="text-base font-black">
                    Công cụ & Trợ lý
                  </h2>
                </div>
                <Button
                  aria-label="Đóng bảng công cụ"
                  className={cn("h-8 w-8 rounded-xl border", headerButtonClass[readerTheme])}
                  onClick={() => setIsPanelOpen(false)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              {/* 4 Tabs */}
              <div
                aria-label="Chọn chức năng"
                className="mb-5 grid grid-cols-4 gap-1 rounded-2xl bg-white/[0.06] p-1 border border-white/10"
                role="tablist"
              >
                <button
                  aria-selected={panelTab === "CHAPTERS"}
                  className={cn(
                    "flex min-h-10 cursor-pointer flex-col items-center justify-center rounded-xl p-1 text-[11px] font-black transition",
                    panelTab === "CHAPTERS" ? "bg-bv-primary text-white shadow-xs" : "text-zinc-400 hover:text-white hover:bg-white/5",
                  )}
                  onClick={() => setPanelTab("CHAPTERS")}
                  role="tab"
                  type="button"
                >
                  <List className="h-4 w-4" />
                  Mục lục
                </button>
                <button
                  aria-selected={panelTab === "NOTES"}
                  className={cn(
                    "flex min-h-10 cursor-pointer flex-col items-center justify-center rounded-xl p-1 text-[11px] font-black transition",
                    panelTab === "NOTES" ? "bg-bv-primary text-white shadow-xs" : "text-zinc-400 hover:text-white hover:bg-white/5",
                  )}
                  onClick={() => setPanelTab("NOTES")}
                  role="tab"
                  type="button"
                >
                  <Bookmark className="h-4 w-4" />
                  Ghi chú
                </button>
                <button
                  aria-selected={panelTab === "AI"}
                  className={cn(
                    "flex min-h-10 cursor-pointer flex-col items-center justify-center rounded-xl p-1 text-[11px] font-black transition",
                    panelTab === "AI" ? "bg-bv-primary text-white shadow-xs" : "text-zinc-400 hover:text-white hover:bg-white/5",
                  )}
                  onClick={() => setPanelTab("AI")}
                  role="tab"
                  type="button"
                >
                  <Bot className="h-4 w-4" />
                  Nova AI
                </button>
                <button
                  aria-selected={panelTab === "SETTINGS"}
                  className={cn(
                    "flex min-h-10 cursor-pointer flex-col items-center justify-center rounded-xl p-1 text-[11px] font-black transition",
                    panelTab === "SETTINGS" ? "bg-bv-primary text-white shadow-xs" : "text-zinc-400 hover:text-white hover:bg-white/5",
                  )}
                  onClick={() => setPanelTab("SETTINGS")}
                  role="tab"
                  type="button"
                >
                  <Settings2 className="h-4 w-4" />
                  Cài đặt
                </button>
              </div>

              {/* TAB 1: MỤC LỤC */}
              {panelTab === "CHAPTERS" ? (
                <div className="space-y-4">
                  {/* Search in book */}
                  <div className="relative">
                    <input
                      aria-label="Tìm trong sách"
                      className="min-h-10 w-full rounded-xl border border-white/10 bg-white/[0.07] px-3.5 pl-9 text-xs text-zinc-100 outline-none placeholder:text-zinc-400 focus:border-bv-primary"
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm từ khóa trong sách..."
                      type="search"
                      value={searchQuery}
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  </div>

                  {searchQuery.trim().length >= 2 ? (
                    <div className="max-h-56 space-y-2 overflow-y-auto" aria-live="polite">
                      {searchResults.length > 0 ? (
                        searchResults.map((result) => (
                          <button
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-left text-xs transition hover:bg-white/[0.08]"
                            key={result.pageNumber}
                            onClick={() => onPageChange(result.pageNumber)}
                            type="button"
                          >
                            <span className="block font-black text-bv-gold">Trang {result.pageNumber}</span>
                            <span className="mt-1 line-clamp-2 block text-[11px] opacity-80">{result.excerpt}</span>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-zinc-400 text-center py-3">Không tìm thấy nội dung phù hợp.</p>
                      )}
                    </div>
                  ) : null}

                  {/* Chapters List */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-bv-gold">Danh sách chương ({chapters.length})</p>
                    <ol className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                      {chapters.map((chapter) => (
                        <li key={chapter.chapterNumber}>
                          <button
                            className={cn(
                              "flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs transition",
                              currentChapter === chapter.chapterNumber
                                ? "border-bv-gold/60 bg-bv-gold/15 text-amber-300 font-bold"
                                : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]",
                            )}
                            disabled={chapter.isLocked}
                            onClick={() => onPageChange(chapter.startPage)}
                            type="button"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-[10px] font-black">
                              {chapter.chapterNumber}
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {chapter.chapterTitle}
                            </span>
                            {chapter.isLocked ? (
                              <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                            ) : (
                              <span className="text-[10px] opacity-60">Tr.{chapter.startPage}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : null}

              {/* TAB 2: GHI CHÚ & DẤU TRANG */}
              {panelTab === "NOTES" ? (
                <div className="space-y-4">
                  {children}
                </div>
              ) : null}

              {/* TAB 3: NOVA AI */}
              {panelTab === "AI" ? (
                <ReaderAiAssistant
                  bookId={bookId}
                  currentChapterNumber={currentChapter}
                  onCitationNavigate={navigateFromCitation}
                  selectionRequest={selectionAiRequest}
                />
              ) : null}

              {/* TAB 4: CÀI ĐẶT ĐỌC */}
              {panelTab === "SETTINGS" ? (
                <div className="space-y-5 text-xs">
                  {/* Phông chữ Serif vs Sans */}
                  <div>
                    <p className="font-bold text-zinc-300 mb-2">Kiểu chữ sách</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className={cn(
                          "flex h-10 items-center justify-center rounded-xl border font-serif font-bold text-sm transition",
                          isSerif ? "border-bv-primary bg-bv-primary text-white" : "border-white/10 bg-white/[0.05] text-zinc-300 hover:bg-white/10",
                        )}
                        onClick={() => setIsSerif(true)}
                        type="button"
                      >
                        Serif (Cổ điển)
                      </button>
                      <button
                        className={cn(
                          "flex h-10 items-center justify-center rounded-xl border font-sans font-bold text-xs transition",
                          !isSerif ? "border-bv-primary bg-bv-primary text-white" : "border-white/10 bg-white/[0.05] text-zinc-300 hover:bg-white/10",
                        )}
                        onClick={() => setIsSerif(false)}
                        type="button"
                      >
                        Sans (Hiện đại)
                      </button>
                    </div>
                  </div>

                  {/* Cỡ chữ */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-zinc-300">Cỡ chữ ({fontSize}px)</p>
                      <span className="text-[11px] text-zinc-400">15px - 28px</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] font-black text-xs hover:bg-white/10"
                        onClick={() => setFontSize((f) => Math.max(15, f - 1))}
                        type="button"
                      >
                        A-
                      </button>
                      <input
                        aria-label="Điều chỉnh cỡ chữ"
                        className="h-10 flex-1 cursor-pointer accent-[#0F766E]"
                        max={28}
                        min={15}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        type="range"
                        value={fontSize}
                      />
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] font-black text-sm hover:bg-white/10"
                        onClick={() => setFontSize((f) => Math.min(28, f + 1))}
                        type="button"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Tông màu nền */}
                  <div>
                    <p className="font-bold text-zinc-300 mb-2">Tông màu giao diện</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { value: "light", label: "Sáng", icon: Sun },
                          { value: "sepia", label: "Sepia", icon: Type },
                          { value: "dark", label: "Tối", icon: Moon },
                        ] as const
                      ).map((theme) => {
                        const Icon = theme.icon;
                        return (
                          <button
                            className={cn(
                              "flex flex-col items-center justify-center gap-1.5 h-14 rounded-xl border text-xs font-bold transition",
                              readerTheme === theme.value
                                ? "border-bv-primary bg-bv-primary/20 text-white font-black"
                                : "border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]",
                            )}
                            key={theme.value}
                            onClick={() => setReaderTheme(theme.value)}
                            type="button"
                          >
                            <Icon className="h-4 w-4" />
                            {theme.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tự cuộn trang */}
                  <div className="pt-2 border-t border-white/10">
                    <button
                      className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-bold text-zinc-300 transition hover:bg-white/10"
                      onClick={() => setIsAutoScrolling((v) => !v)}
                      type="button"
                    >
                      {isAutoScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {isAutoScrolling ? "Dừng tự động cuộn trang" : "Bật tự động cuộn trang"}
                    </button>
                  </div>

                  {/* Thời gian đọc ước tính */}
                  <div className="rounded-xl bg-white/[0.04] p-3 text-[11px] leading-5 text-zinc-400">
                    Ước tính còn khoảng <strong className="text-bv-gold">{estimatedMinutesRemaining} phút</strong> đọc cuốn sách này.
                  </div>
                </div>
              ) : null}
            </aside>
          </>
        ) : null}
      </section>

      {/* Floating Text Selection Menu */}
      {selectionMenu ? (
        <div
          aria-label="Công cụ cho đoạn văn đã chọn"
          className="fixed z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-full items-center gap-1.5 rounded-2xl border border-white/15 bg-slate-950/95 px-2.5 py-1.5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          role="toolbar"
          style={{ left: selectionMenu.left, top: selectionMenu.top }}
        >
          {/* Quick Highlight Colors */}
          <div className="flex items-center gap-1 border-r border-white/15 pr-2">
            <button
              aria-label="Đánh dấu vàng"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow-xs transition hover:scale-110 active:scale-95"
              onClick={() => void quickHighlight("YELLOW")}
              title="Đánh dấu vàng"
              type="button"
            >
              A
            </button>
            <button
              aria-label="Đánh dấu xanh"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white font-black text-[10px] shadow-xs transition hover:scale-110 active:scale-95"
              onClick={() => void quickHighlight("GREEN")}
              title="Đánh dấu xanh"
              type="button"
            >
              A
            </button>
            <button
              aria-label="Đánh dấu hồng"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-400 text-white font-black text-[10px] shadow-xs transition hover:scale-110 active:scale-95"
              onClick={() => void quickHighlight("PINK")}
              title="Đánh dấu hồng"
              type="button"
            >
              A
            </button>
          </div>

          {/* AI Tools */}
          <button
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-amber-200 transition hover:bg-white/10 hover:text-white"
            onClick={() => askAiAboutSelection("EXPLAIN")}
            type="button"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Giải thích</span>
          </button>
          <button
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-emerald-200 transition hover:bg-white/10 hover:text-white"
            onClick={() => askAiAboutSelection("SUMMARIZE")}
            type="button"
          >
            <Bot className="h-3.5 w-3.5 text-emerald-300" />
            <span>Tóm tắt</span>
          </button>

          {/* Copy Quote */}
          <button
            aria-label="Sao chép trích dẫn"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-white/10 hover:text-white"
            onClick={() => void copySelectedText()}
            title="Sao chép"
            type="button"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* Sleek Minimal Bottom Bar */}
      <footer className={cn("bv-reader-chrome sticky bottom-0 z-30 border-t transition-colors duration-300 py-3", footerThemeClass[readerTheme])}>
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <Button
            aria-label="Trang trước"
            className={cn("gap-1.5 min-h-11 px-4 font-bold text-xs sm:text-sm rounded-xl", footerButtonClass[readerTheme])}
            disabled={currentPage === 1 || isPending}
            onClick={() => onPageChange(currentPage - 1)}
            type="button"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span>Trang trước</span>
          </Button>

          {/* Central Progress indicator & Scrubber */}
          <div className="flex flex-1 flex-col items-center justify-center max-w-xs px-2">
            <div className="flex items-center gap-2 text-xs font-black">
              <span>Trang {currentPage} / {totalPages}</span>
              <span className="text-bv-primary font-bold">({progressPercent}%)</span>
            </div>
            <input
              aria-label="Cuộn nhanh đến trang"
              className="mt-1 h-1.5 w-full cursor-pointer accent-[#0F766E] rounded-full"
              max={totalPages}
              min={1}
              onChange={(e) => onPageChange(Number(e.target.value))}
              type="range"
              value={currentPage}
            />
          </div>

          <Button
            aria-label="Trang sau"
            className="gap-1.5 min-h-11 px-4 font-bold text-xs sm:text-sm rounded-xl bg-bv-primary text-white hover:bg-bv-primary-dark shadow-sm"
            disabled={currentPage === totalPages || isPending}
            onClick={() => onPageChange(currentPage + 1)}
            type="button"
          >
            <span>Trang sau</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </footer>
    </main>
  );
}

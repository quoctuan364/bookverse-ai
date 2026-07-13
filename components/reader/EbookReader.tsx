"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Moon,
  PanelRightClose,
  Settings2,
  Sun,
  Type,
} from "lucide-react";
import { useHighlightEngine } from "@/components/reader/HighlightProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReaderFont = "serif" | "sans";
type ReaderTheme = "dark" | "sepia" | "light";

interface EbookReaderProps {
  bookId: string;
  bookTitle: string;
  readerSource: string;
  ebookUrl: string | null;
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  pageContent: string;
  timeSpent: number;
  isPending: boolean;
  message: string | null;
  onBack: () => void;
  onBookmark: () => void;
  onPageChange: (page: number) => void;
  children: ReactNode;
}

const themeClass: Record<ReaderTheme, string> = {
  dark: "border-white/10 bg-slate-950/78 text-zinc-100 shadow-[0_24px_90px_rgba(0,0,0,0.34)]",
  sepia: "border-[#7C5D2E]/20 bg-[#E8D9B8]/92 text-[#302414] shadow-[0_24px_70px_rgba(84,56,20,0.22)]",
  light: "border-zinc-200 bg-white/94 text-zinc-950 shadow-[0_24px_70px_rgba(15,23,42,0.12)]",
};

const proseClass: Record<ReaderTheme, string> = {
  dark: "text-zinc-200",
  sepia: "text-[#372815]",
  light: "text-zinc-800",
};

export function EbookReader({
  bookId,
  bookTitle,
  readerSource,
  ebookUrl,
  currentPage,
  totalPages,
  progressPercent,
  pageContent,
  timeSpent,
  isPending,
  message,
  onBack,
  onBookmark,
  onPageChange,
  children,
}: EbookReaderProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [readerFont, setReaderFont] = useState<ReaderFont>("serif");
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>("dark");
  const [fontSize, setFontSize] = useState(20);
  const highlightEngine = useHighlightEngine();
  const currentBlockId = `page-${currentPage}`;

  const fontClass = readerFont === "serif" ? "font-serif" : "font-sans";
  const contentStyle = useMemo(
    () => ({
      fontSize: `${fontSize}px`,
      lineHeight: fontSize >= 23 ? "2" : "1.85",
    }),
    [fontSize],
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.22),transparent_34%),linear-gradient(180deg,#020617_0%,#111827_48%,#18181b_100%)] text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/72 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Button
            aria-label="Quay lại"
            className="border-white/10 bg-white/[0.06] text-zinc-100 hover:bg-white/12"
            onClick={onBack}
            size="icon"
            type="button"
            variant="outline"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-bold text-zinc-400">Đang đọc</p>
            <h1 className="truncate text-base font-black text-zinc-50 sm:text-lg">{bookTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              aria-label={isPanelOpen ? "Ẩn bảng tùy chỉnh" : "Mở bảng tùy chỉnh"}
              className="border-white/10 bg-white/[0.06] text-zinc-100 hover:bg-white/12"
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
            <Button
              aria-label="Đánh dấu trang"
              className="gap-2 border-white/10 bg-white/[0.06] text-zinc-100 hover:bg-white/12"
              disabled={isPending}
              onClick={onBookmark}
              type="button"
              variant="outline"
            >
              <Bookmark className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Bookmark</span>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div className="min-w-0">
          <article
            className={cn(
              "rounded-2xl border p-6 backdrop-blur-2xl transition-colors sm:p-10",
              themeClass[readerTheme],
            )}
          >
            <div className="mb-6 flex items-center justify-between gap-4 text-sm font-bold opacity-80">
              <span>Trang {currentPage}</span>
              <span>{progressPercent}% hoàn thành</span>
            </div>

            <p className="mb-6 rounded-xl border border-current/10 bg-white/[0.06] px-3 py-2 text-xs font-bold opacity-80">
              Nguồn đọc: {readerSource}
            </p>

            <div className={cn("max-w-none", fontClass)}>
              <p
                className={cn("whitespace-pre-line transition-all", proseClass[readerTheme])}
                data-reader-block-id={currentBlockId}
                onMouseUp={highlightEngine?.captureSelection}
                style={contentStyle}
              >
                {highlightEngine?.renderHighlightedText(pageContent, currentBlockId) ?? pageContent}
              </p>
            </div>
          </article>

          {children}

          {message || highlightEngine?.message ? (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-zinc-300 shadow-[0_18px_55px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              {message ?? highlightEngine?.message}
            </p>
          ) : null}
        </div>

        {isPanelOpen ? (
          <aside className="h-fit rounded-2xl border border-white/10 bg-slate-950/72 p-5 text-zinc-100 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
              <h2 className="text-lg font-black">Tùy chỉnh đọc</h2>
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-sm font-bold text-zinc-300">Font chữ</p>
              <div className="grid grid-cols-2 gap-2">
                {(["serif", "sans"] as const).map((font) => (
                  <button
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition",
                      readerFont === font
                        ? "border-[#F2C14E]/70 bg-[#F2C14E]/16 text-[#F2C14E]"
                        : "border-white/10 bg-white/[0.05] text-zinc-300 hover:bg-white/[0.09]",
                    )}
                    key={font}
                    onClick={() => setReaderFont(font)}
                    type="button"
                  >
                    <Type className="h-4 w-4" aria-hidden="true" />
                    {font === "serif" ? "Serif" : "Sans-serif"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-zinc-300">Cỡ chữ</p>
                <span className="rounded-full bg-white/[0.07] px-2 py-1 text-xs font-bold text-[#F2C14E]">
                  {fontSize}px
                </span>
              </div>
              <input
                aria-label="Tăng giảm cỡ chữ"
                className="h-2 w-full cursor-pointer accent-[#D6A84F]"
                max={28}
                min={16}
                onChange={(event) => setFontSize(Number(event.target.value))}
                type="range"
                value={fontSize}
              />
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-sm font-bold text-zinc-300">Theme đọc sách</p>
              <div className="grid gap-2">
                {([
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "sepia", label: "Sepia", icon: Type },
                  { value: "light", label: "Light", icon: Sun },
                ] as const).map((theme) => {
                  const Icon = theme.icon;

                  return (
                    <button
                      className={cn(
                        "inline-flex h-10 items-center justify-between rounded-xl border px-3 text-sm font-bold transition",
                        readerTheme === theme.value
                          ? "border-[#0F766E]/70 bg-[#0F766E]/22 text-white"
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
                          theme.value === "dark" && "border-zinc-600 bg-slate-950",
                          theme.value === "sepia" && "border-[#7C5D2E] bg-[#E8D9B8]",
                          theme.value === "light" && "border-zinc-200 bg-white",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        ) : null}
      </section>

      <footer className="sticky bottom-0 z-30 border-t border-white/10 bg-slate-950/76 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              className="gap-2 border-white/10 bg-white/[0.06] text-zinc-100 hover:bg-white/12"
              disabled={currentPage === 1 || isPending}
              onClick={() => onPageChange(currentPage - 1)}
              type="button"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Trang trước
            </Button>

            <input
              aria-label="Tiến độ đọc"
              className="h-2 flex-1 cursor-pointer accent-[#D6A84F]"
              max={totalPages}
              min={1}
              onChange={(event) => onPageChange(Number(event.target.value))}
              type="range"
              value={currentPage}
            />

            <Button
              className="gap-2 bg-[#0F766E] text-white hover:bg-[#0F5F59]"
              disabled={currentPage === totalPages || isPending}
              onClick={() => onPageChange(currentPage + 1)}
              type="button"
            >
              Trang sau
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>
              Trang {currentPage} / {totalPages}
            </span>
            <span>Thời gian phiên: {timeSpent}s</span>
          </div>

          {ebookUrl ? (
            <Link className="text-sm font-bold text-[#F2C14E] hover:underline" href={ebookUrl} target="_blank">
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

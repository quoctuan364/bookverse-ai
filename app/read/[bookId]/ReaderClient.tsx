"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getReaderInitialState,
  getReaderPageData,
  logInteraction,
  saveHighlight,
  saveReadingProgress,
  toggleBookmark,
  type ReaderActionResult,
  type ReaderChapter,
  type ReaderHighlight,
  type ReaderPageData,
} from "@/actions/reader.actions";
import { EbookReader } from "@/components/reader/EbookReader";
import { HighlightProvider, useHighlightEngine } from "@/components/reader/HighlightProvider";
import { BookViewTracker } from "@/components/shared/BookViewTracker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  Copy,
  Download,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

interface ReaderPage {
  pageNumber: number;
  content: string;
  chapterNumber: number;
  chapterTitle: string;
  chunkIndex: number;
}

const TOTAL_PAGES = 12;

function buildDemoPages(bookId: string): ReaderPage[] {
  return Array.from({ length: TOTAL_PAGES }, (_, index) => {
    const pageNumber = index + 1;

    return {
      pageNumber,
      chapterNumber: 1,
      chapterTitle: "Nội dung mô phỏng",
      chunkIndex: index,
      content:
        `Trang ${pageNumber} của sách ${bookId}. ` +
        "Đây là nội dung đọc minh họa của BookVerse. Bạn có thể chuyển trang, lưu trang đang đọc và ghi chú những đoạn quan trọng. " +
        "Nội dung chính thức sẽ được hiển thị tại đây khi nhà sách có quyền phát hành bản điện tử. ".repeat(
          7,
        ),
    };
  });
}

function persistReadingProgressInBackground(payload: {
  bookId: string;
  currentPage: number;
  totalPages: number;
  timeSpent: number;
  currentChapter: number;
}) {
  const body = JSON.stringify(payload);
  const blob = new Blob([body], { type: "application/json" });

  if (window.navigator.sendBeacon("/api/reader/progress", blob)) {
    return;
  }

  // Một số trình duyệt có thể từ chối beacon khi hàng đợi đầy. keepalive vẫn
  // cho phép request hoàn tất sau khi tài liệu hiện tại đã bị đóng.
  void fetch("/api/reader/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

function ReaderLoadingState({
  error,
  onBack,
  onRetry,
}: {
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <main className="bv-page min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <Button
          className="min-h-11 gap-2 border border-bv-ink/10 bg-white text-bv-ink hover:bg-bv-surface shadow-xs"
          onClick={onBack}
          type="button"
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại
        </Button>

        {error ? (
          <section
            aria-live="assertive"
            className="mt-8 rounded-3xl border border-rose-200 bg-rose-50/90 p-6 shadow-xl sm:p-8"
            role="alert"
          >
            <AlertCircle className="h-10 w-10 text-rose-600" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-black text-rose-950">Chưa tải được nội dung sách</h1>
            <p className="mt-2 max-w-2xl leading-7 text-rose-800">{error}</p>
            <Button
              className="mt-6 min-h-11 gap-2 bg-bv-primary text-white hover:bg-bv-primary-dark shadow-sm"
              onClick={onRetry}
              type="button"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Thử tải lại
            </Button>
          </section>
        ) : (
          <section
            aria-busy="true"
            aria-live="polite"
            className="mt-8 rounded-3xl border border-bv-ink/10 bg-white/95 p-6 shadow-xl backdrop-blur-md sm:p-8"
            role="status"
          >
            <div className="flex items-center gap-3">
              <LoaderCircle
                className="h-7 w-7 animate-spin text-bv-primary motion-reduce:animate-none"
                aria-hidden="true"
              />
              <div>
                <h1 className="text-xl font-black text-bv-ink sm:text-2xl">Đang tải trang đọc sách</h1>
                <p className="mt-1 text-sm text-bv-text-muted">
                  BookVerse đang chuẩn bị nội dung và đồng bộ tiến độ đọc của bạn...
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4" aria-hidden="true">
              <div className="h-5 w-2/5 animate-pulse rounded-full bg-bv-ink/10 motion-reduce:animate-none" />
              <div className="h-4 w-full animate-pulse rounded-full bg-bv-ink/[0.06] motion-reduce:animate-none" />
              <div className="h-4 w-11/12 animate-pulse rounded-full bg-bv-ink/[0.06] motion-reduce:animate-none" />
              <div className="h-4 w-4/5 animate-pulse rounded-full bg-bv-ink/[0.06] motion-reduce:animate-none" />
              <div className="h-36 animate-pulse rounded-2xl bg-bv-ink/[0.04] motion-reduce:animate-none" />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

interface ReaderHighlightToolsProps {
  bookmarks: number[];
  highlights: ReaderHighlight[];
  highlightText: string;
  highlightNote: string;
  highlightColor: ReaderHighlight["color"];
  isPending: boolean;
  onHighlightTextChange: (value: string) => void;
  onHighlightNoteChange: (value: string) => void;
  onHighlightColorChange: (value: ReaderHighlight["color"]) => void;
  onManualHighlight: () => void;
  onGoToPage: (page: number) => void;
}

function ReaderHighlightTools({
  bookmarks,
  highlights,
  highlightText,
  highlightNote,
  highlightColor,
  isPending,
  onHighlightTextChange,
  onHighlightNoteChange,
  onHighlightColorChange,
  onManualHighlight,
  onGoToPage,
}: ReaderHighlightToolsProps) {
  const highlightEngine = useHighlightEngine();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState("");
  const visibleHighlights = highlightEngine?.highlights.length
    ? highlightEngine.highlights
    : highlights.map((highlight) => ({
        ...highlight,
        bookId: "",
        blockId: null,
        startOffset: null,
        endOffset: null,
        createdAt: highlight.createdAt.toISOString(),
      }));

  async function handleSelectionHighlight() {
    try {
      await highlightEngine?.saveSelectionHighlight(highlightNote, highlightColor);
    } catch (error: unknown) {
      console.error(error);
    }
  }

  async function copyQuote(text: string, pageNumber: number) {
    await navigator.clipboard.writeText(`“${text}”\n— Trang ${pageNumber}`);
  }

  function exportHighlights() {
    if (visibleHighlights.length === 0) {
      return;
    }

    const content = visibleHighlights
      .map((item) => [`Trang ${item.pageNumber}`, item.text, item.note ? `Ghi chú: ${item.note}` : ""].filter(Boolean).join("\n"))
      .join("\n\n---\n\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bookverse-highlights.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 text-sm">
      {/* Bookmarks Section */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-bv-gold">Trang đã đánh dấu ({bookmarks.length})</p>
        </div>
        {bookmarks.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {bookmarks.map((pageNumber) => (
              <button
                className="rounded-full border border-bv-gold/40 bg-bv-gold/15 px-3 py-1 text-xs font-bold text-bv-gold transition hover:bg-bv-gold hover:text-slate-950 focus-visible:outline-none"
                key={pageNumber}
                onClick={() => onGoToPage(pageNumber)}
                type="button"
              >
                Trang {pageNumber}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-zinc-400">Chưa đánh dấu trang nào. Bấm nút Dấu trang ở thanh trên để lưu nhanh.</p>
        )}
      </div>

      {/* Highlights Section */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-bv-gold">Đoạn đã ghi chú ({visibleHighlights.length})</p>
          <button
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            disabled={visibleHighlights.length === 0}
            onClick={exportHighlights}
            type="button"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Xuất .txt
          </button>
        </div>
        {visibleHighlights.length > 0 ? (
          <div className="mt-3 max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {visibleHighlights.map((highlight) => (
              <div className="relative rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs" key={highlight.id}>
                <p className="line-clamp-3 leading-relaxed text-zinc-200">{highlight.text}</p>
                {editingId === highlight.id ? (
                  <div className="mt-2 flex gap-1.5">
                    <input
                      aria-label="Sửa ghi chú"
                      className="h-8 min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-2.5 text-xs text-white outline-none focus:border-bv-focus"
                      maxLength={500}
                      onChange={(event) => setEditingNote(event.target.value)}
                      value={editingNote}
                    />
                    <button aria-label="Lưu ghi chú" className="flex h-8 w-8 items-center justify-center rounded-lg bg-bv-primary text-white" onClick={() => { void highlightEngine?.updateHighlightNote(highlight.id, editingNote); setEditingId(null); }} type="button"><Save className="h-3.5 w-3.5" /></button>
                    <button aria-label="Hủy sửa" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/20" onClick={() => setEditingId(null)} type="button"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <p className="mt-1.5 text-[11px] font-medium text-zinc-400">Trang {highlight.pageNumber}{highlight.note ? ` · ${highlight.note}` : ""}</p>
                )}
                {highlight.bookId ? (
                  <div className="mt-2 flex justify-end gap-1 border-t border-white/5 pt-1.5">
                    <button aria-label="Sao chép trích dẫn" className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-white" onClick={() => void copyQuote(highlight.text, highlight.pageNumber)} type="button"><Copy className="h-3 w-3" /></button>
                    <button aria-label="Sửa ghi chú" className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-white" onClick={() => { setEditingId(highlight.id); setEditingNote(highlight.note ?? ""); }} type="button"><Pencil className="h-3 w-3" /></button>
                    <button aria-label="Xóa ghi chú" className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-rose-400" disabled={highlightEngine?.isLoading} onClick={() => void highlightEngine?.deleteHighlight(highlight.id)} type="button"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-zinc-400">Bôi đen đoạn văn bất kỳ trong trang sách để đánh dấu màu hoặc lưu ghi chú.</p>
        )}
      </div>

      {/* Manual Free Note Accordion */}
      <details className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs">
        <summary className="cursor-pointer font-bold text-zinc-300 hover:text-white">Thêm ghi chú tự do</summary>
        <div className="mt-2.5 space-y-2">
          <textarea
            aria-label="Nhập đoạn văn cần ghi chú"
            className="min-h-18 w-full resize-y rounded-xl border border-white/10 bg-black/20 p-2.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-bv-focus"
            onChange={(event) => onHighlightTextChange(event.target.value)}
            placeholder="Nhập hoặc dán nội dung muốn ghi chú..."
            value={highlightText}
          />
          <input
            aria-label="Ghi chú cho đoạn đã chọn"
            className="h-9 w-full rounded-xl border border-white/10 bg-black/20 px-2.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-bv-focus"
            onChange={(event) => onHighlightNoteChange(event.target.value)}
            placeholder="Ghi chú ngắn..."
            value={highlightNote}
          />
          <div className="flex justify-end pt-1">
            <Button
              className="bg-bv-primary text-white hover:bg-bv-primary-dark text-xs h-8 px-3"
              disabled={isPending || !highlightText.trim()}
              onClick={onManualHighlight}
              type="button"
            >
              Lưu ghi chú
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
}

interface OnlineReaderClientProps {
  bookId: string;
  initialData: ReaderPageData;
}

export function OnlineReaderClient({ bookId, initialData }: OnlineReaderClientProps) {
  const router = useRouter();
  const initialPages =
    initialData.readerContent.pages.length > 0
      ? initialData.readerContent.pages
      : buildDemoPages(bookId);
  const initialPage = Math.min(
    Math.max(initialData.initialState?.currentPage ?? 1, 1),
    Math.max(1, initialPages.length),
  );
  const [pages, setPages] = useState<ReaderPage[]>(initialPages);
  const [chapters, setChapters] = useState<ReaderChapter[]>(initialData.readerContent.chapters);
  const totalPages = Math.max(1, pages.length);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [timeSpent, setTimeSpent] = useState(0);
  const [message, setMessage] = useState<string | null>(
    initialData.initialState && initialData.initialState.progressPercent > 0
      ? `Tiếp tục đọc từ ${initialData.initialState.progressPercent.toFixed(0)}% tiến độ trước đó.`
      : null,
  );
  const [bookTitle, setBookTitle] = useState(
    initialData.initialState?.title ?? `Đọc sách trên BookVerse - ${bookId}`,
  );
  const [readerSource, setReaderSource] = useState(initialData.readerContent.sourceLabel);
  const [ebookUrl, setEbookUrl] = useState<string | null>(initialData.readerContent.ebookUrl);
  const [readerAccess, setReaderAccess] = useState<"FULL" | "PREVIEW">(
    initialData.readerContent.access,
  );
  const [totalBookPages, setTotalBookPages] = useState(initialData.readerContent.totalPageCount);
  const [purchaseUrl, setPurchaseUrl] = useState(
    initialData.readerContent.purchaseUrl,
  );
  const [canPurchaseEbook, setCanPurchaseEbook] = useState(
    initialData.readerContent.canPurchaseEbook,
  );
  const [hasDigitalAsset, setHasDigitalAsset] = useState(
    initialData.readerContent.hasDigitalAsset,
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    initialData.initialState?.isAuthenticated ?? false,
  );
  const [bookmarks, setBookmarks] = useState<number[]>(
    initialData.initialState?.bookmarks ?? [],
  );
  const [highlights, setHighlights] = useState<ReaderHighlight[]>(
    initialData.initialState?.highlights ?? [],
  );
  const [highlightText, setHighlightText] = useState("");
  const [highlightNote, setHighlightNote] = useState("");
  const [highlightColor, setHighlightColor] = useState<ReaderHighlight["color"]>("YELLOW");
  const [isReaderLoading, setIsReaderLoading] = useState(false);
  const [readerLoadError, setReaderLoadError] = useState<string | null>(null);
  const [readerLoadAttempt, setReaderLoadAttempt] = useState(0);
  const [isPending, startTransition] = useTransition();
  const timeSpentRef = useRef(0);
  const currentPageRef = useRef(1);

  const progressPercent = Math.round((currentPage / Math.max(1, totalBookPages)) * 100);
  const pageContent = pages[currentPage - 1]?.content ?? "";
  const currentChapter = pages[currentPage - 1]?.chapterNumber ?? 1;

  useEffect(() => {
    if (readerLoadAttempt === 0) {
      return;
    }

    let isActive = true;

    setIsReaderLoading(true);
    setReaderLoadError(null);
    setPages([]);
    setChapters([]);
    setCurrentPage(1);
    setReaderSource("Đang tải nội dung đọc...");
    setEbookUrl(null);
    setReaderAccess("PREVIEW");
    setPurchaseUrl(`/membership?bookId=${encodeURIComponent(bookId)}`);
    setCanPurchaseEbook(false);
    setHasDigitalAsset(false);
    setIsAuthenticated(false);

    startTransition(async () => {
      try {
        const { initialState, readerContent } = await getReaderPageData(bookId);

        if (!isActive) {
          return;
        }

        const nextPages =
          readerContent.pages.length > 0 ? readerContent.pages : buildDemoPages(bookId);
        const nextTotalPages = Math.max(1, nextPages.length);
        setPages(nextPages);
        setChapters(readerContent.chapters);
        setReaderSource(readerContent.sourceLabel);
        setEbookUrl(readerContent.ebookUrl);
        setReaderAccess(readerContent.access);
        setTotalBookPages(readerContent.totalPageCount);
        setPurchaseUrl(readerContent.purchaseUrl);
        setCanPurchaseEbook(readerContent.canPurchaseEbook);
        setHasDigitalAsset(readerContent.hasDigitalAsset);

        if (initialState) {
          const safeInitialPage = Math.min(
            Math.max(initialState.currentPage, 1),
            nextTotalPages,
          );
          setCurrentPage(safeInitialPage);
          setBookTitle(initialState.title);
          setBookmarks(initialState.bookmarks);
          setHighlights(initialState.highlights);
          setIsAuthenticated(initialState.isAuthenticated);

          if (initialState.progressPercent > 0) {
            setMessage(
              `Tiếp tục đọc từ ${initialState.progressPercent.toFixed(0)}% tiến độ trước đó.`,
            );
          }
        }
      } catch (error: unknown) {
        if (isActive) {
          console.error(error);
          setReaderLoadError(
            "Chưa thể tải nội dung sách. Hãy kiểm tra kết nối rồi thử lại.",
          );
        }
      } finally {
        if (isActive) {
          setIsReaderLoading(false);
        }
      }
    });

    return () => {
      isActive = false;
    };
  }, [bookId, readerLoadAttempt]);

  useEffect(() => {
    timeSpentRef.current = timeSpent;
  }, [timeSpent]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    if (isReaderLoading || readerLoadError) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeSpent((currentValue) => currentValue + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isReaderLoading, readerLoadError]);

  const handleActionResult = useCallback((result: ReaderActionResult) => {
    setMessage(result.message);
  }, []);

  const persistReadingData = useCallback(
    (pageToSave: number, spentSeconds: number) => {
      if (!isAuthenticated) {
        return;
      }

      startTransition(async () => {
        try {
          const progressResult = await saveReadingProgress(
            bookId,
            pageToSave,
            totalBookPages,
            spentSeconds,
            pages[pageToSave - 1]?.chapterNumber ?? 1,
          );
          handleActionResult(progressResult);
          await logInteraction(bookId, "READ");
          setTimeSpent(0);
          timeSpentRef.current = 0;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Không thể lưu tiến độ đọc.";
          setMessage(errorMessage);
        }
      });
    },
    [bookId, handleActionResult, isAuthenticated, pages, totalBookPages],
  );

  useEffect(() => {
    let scrollSaveTimer: number | null = null;

    function handleScroll() {
      if (scrollSaveTimer !== null) {
        window.clearTimeout(scrollSaveTimer);
      }

      scrollSaveTimer = window.setTimeout(() => {
        if (isAuthenticated && timeSpentRef.current > 0) {
          void saveReadingProgress(
            bookId,
            currentPageRef.current,
            totalBookPages,
            timeSpentRef.current,
            pages[currentPageRef.current - 1]?.chapterNumber ?? 1,
          );
          setTimeSpent(0);
          timeSpentRef.current = 0;
        }
      }, 1_200);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollSaveTimer !== null) {
        window.clearTimeout(scrollSaveTimer);
      }
    };
  }, [bookId, isAuthenticated, pages, totalBookPages]);

  useEffect(() => {
    function flushProgress() {
      if (isAuthenticated && timeSpentRef.current > 0) {
        persistReadingProgressInBackground({
          bookId,
          currentPage: currentPageRef.current,
          totalPages: totalBookPages,
          timeSpent: timeSpentRef.current,
          currentChapter: pages[currentPageRef.current - 1]?.chapterNumber ?? 1,
        });
        timeSpentRef.current = 0;
      }
    }

    // pagehide chạy được cho cả reload/đóng tab; cleanup xử lý điều hướng nội
    // bộ của React. Ref được đặt về 0 để hai đường không gửi trùng phiên đọc.
    window.addEventListener("pagehide", flushProgress);
    return () => {
      window.removeEventListener("pagehide", flushProgress);
      flushProgress();
    };
  }, [bookId, isAuthenticated, pages, totalBookPages]);

  function goToPage(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    if (safePage === currentPage) {
      return;
    }

    persistReadingData(currentPage, timeSpentRef.current);
    setCurrentPage(safePage);
  }

  function handleBookmark() {
    if (!isAuthenticated) {
      setMessage("Đăng nhập để lưu đánh dấu trang và đồng bộ tiến độ đọc.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await toggleBookmark(bookId, currentPage);
        handleActionResult(result);
        setBookmarks((currentBookmarks) =>
          currentBookmarks.includes(currentPage)
            ? currentBookmarks.filter((pageNumber) => pageNumber !== currentPage)
            : [...currentBookmarks, currentPage].sort((left, right) => left - right),
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Không thể đánh dấu trang.";
        setMessage(errorMessage);
      }
    });
  }

  function handleHighlight() {
    if (!isAuthenticated) {
      setMessage("Đăng nhập để lưu đoạn tô sáng và ghi chú cá nhân.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveHighlight(
          bookId,
          currentPage,
          highlightText,
          highlightNote,
          highlightColor,
        );
        handleActionResult(result);

        if (result.success) {
          const refreshedState = await getReaderInitialState(bookId);
          setHighlights(refreshedState?.highlights ?? []);
          setHighlightText("");
          setHighlightNote("");
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Không thể lưu đoạn tô sáng.";
        setMessage(errorMessage);
      }
    });
  }

  function handleBack() {
    persistReadingData(currentPage, timeSpentRef.current);
    router.back();
  }

  if (isReaderLoading || readerLoadError) {
    return (
      <ReaderLoadingState
        error={readerLoadError}
        onBack={() => router.back()}
        onRetry={() => setReaderLoadAttempt((attempt) => attempt + 1)}
      />
    );
  }

  return (
    <>
      <BookViewTracker bookId={bookId} />
      <HighlightProvider bookId={bookId} currentPage={currentPage} enabled={isAuthenticated}>
        <EbookReader
          bookId={bookId}
          bookTitle={bookTitle}
          chapters={chapters}
          canPurchaseEbook={canPurchaseEbook}
          canPersonalize={isAuthenticated}
          hasDigitalAsset={hasDigitalAsset}
          currentPage={currentPage}
          currentChapter={currentChapter}
          ebookUrl={ebookUrl}
          access={readerAccess}
          isPending={isPending}
          message={message}
          onBack={handleBack}
          onBookmark={handleBookmark}
          onPageChange={goToPage}
          pageContent={pageContent}
          pages={pages}
          progressPercent={progressPercent}
          readerSource={readerSource}
          purchaseUrl={purchaseUrl}
          timeSpent={timeSpent}
          totalBookPages={totalBookPages}
          totalPages={totalPages}
        >
          {isAuthenticated ? (
            <ReaderHighlightTools
              bookmarks={bookmarks}
              highlightColor={highlightColor}
              highlightNote={highlightNote}
              highlightText={highlightText}
              highlights={highlights}
              isPending={isPending}
              onGoToPage={goToPage}
              onHighlightColorChange={setHighlightColor}
              onHighlightNoteChange={setHighlightNote}
              onHighlightTextChange={setHighlightText}
              onManualHighlight={handleHighlight}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-zinc-300">
              <p className="text-xs font-bold uppercase tracking-wider text-bv-gold">Lưu tiến độ đọc</p>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Đăng nhập tài khoản BookVerse để tự động ghi nhớ trang đọc, lưu trích dẫn và đồng bộ trên mọi thiết bị.
              </p>
              <Link
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-bv-primary px-4 text-xs font-bold text-white shadow-xs transition hover:bg-bv-primary-dark"
                href={`/login?callbackUrl=${encodeURIComponent(`/read/${bookId}`)}`}
              >
                Đăng nhập ngay
              </Link>
            </div>
          )}
        </EbookReader>
      </HighlightProvider>
    </>
  );
}

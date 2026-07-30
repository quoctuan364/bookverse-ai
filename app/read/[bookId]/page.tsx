"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getReaderBookContent,
  getReaderInitialState,
  logInteraction,
  saveHighlight,
  saveReadingProgress,
  toggleBookmark,
  type ReaderActionResult,
  type ReaderChapter,
  type ReaderHighlight,
} from "@/actions/reader.actions";
import { EbookReader } from "@/components/reader/EbookReader";
import { HighlightProvider, useHighlightEngine } from "@/components/reader/HighlightProvider";
import { BookViewTracker } from "@/components/shared/BookViewTracker";
import { Button } from "@/components/ui/button";
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

type ReaderParams = Record<string, string | string[] | undefined>;

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
        "BookVerse AI đang mô phỏng nội dung đọc trực tuyến để ghi nhận tiến độ, thời gian đọc, bookmark và hành vi tương tác của người dùng. " +
        "Trong bản triển khai thật, vùng này có thể thay bằng nội dung ePub, PDF viewer hoặc trình đọc chương sách từ database. ".repeat(
          7,
        ),
    };
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
    <main className="min-h-[70vh] bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_36%),linear-gradient(180deg,#020617_0%,#111827_100%)] px-4 py-10 text-zinc-100 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <Button
          className="min-h-11 gap-2 border-white/10 bg-white/[0.06] text-zinc-100 hover:bg-white/12"
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
            className="mt-8 rounded-3xl border border-red-400/30 bg-red-950/35 p-6 shadow-2xl sm:p-8"
            role="alert"
          >
            <AlertCircle className="h-10 w-10 text-red-300" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-black">Chưa tải được nội dung sách</h1>
            <p className="mt-2 max-w-2xl leading-7 text-red-100/85">{error}</p>
            <Button
              className="mt-6 min-h-11 gap-2 bg-[#D6A84F] text-slate-950 hover:bg-[#E5BC66]"
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
            className="mt-8 rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl sm:p-8"
            role="status"
          >
            <div className="flex items-center gap-3">
              <LoaderCircle
                className="h-7 w-7 animate-spin text-[#D6A84F] motion-reduce:animate-none"
                aria-hidden="true"
              />
              <div>
                <h1 className="text-xl font-black sm:text-2xl">Đang tải nội dung sách</h1>
                <p className="mt-1 text-sm text-zinc-400">
                  BookVerse đang kiểm tra quyền đọc và chuẩn bị đúng số trang.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4" aria-hidden="true">
              <div className="h-5 w-2/5 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
              <div className="h-4 w-full animate-pulse rounded-full bg-white/[0.07] motion-reduce:animate-none" />
              <div className="h-4 w-11/12 animate-pulse rounded-full bg-white/[0.07] motion-reduce:animate-none" />
              <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/[0.07] motion-reduce:animate-none" />
              <div className="h-36 animate-pulse rounded-2xl bg-white/[0.05] motion-reduce:animate-none" />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function getBookIdFromParams(params: ReaderParams): string {
  const rawBookId = params.bookId;

  if (typeof rawBookId === "string" && rawBookId.trim()) {
    return rawBookId.trim();
  }

  if (Array.isArray(rawBookId) && typeof rawBookId[0] === "string" && rawBookId[0].trim()) {
    return rawBookId[0].trim();
  }

  return "unknown-book";
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
    <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-zinc-100 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
        <h2 className="text-lg font-black">Highlight nội dung</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Bôi đen trực tiếp trong trang đọc để lưu theo blockId, hoặc nhập thủ công nếu muốn ghi chú nhanh.
        </p>

        {highlightEngine?.selectionDraft ? (
          <div className="mt-4 rounded-xl border border-[#F2C14E]/25 bg-[#F2C14E]/10 px-3 py-2 text-sm text-[#F7D98A]">
            Đã chọn: “{highlightEngine.selectionDraft.text.slice(0, 120)}”
          </div>
        ) : null}

        <textarea
          aria-label="Nội dung highlight thủ công"
          className="mt-4 min-h-24 w-full resize-y rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-[#D6A84F]/35"
          onChange={(event) => onHighlightTextChange(event.target.value)}
          placeholder="Nhập đoạn cần highlight thủ công..."
          value={highlightText}
        />
        <input
          aria-label="Ghi chú cho đoạn highlight"
          className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-white/[0.07] px-3 text-base text-zinc-100 outline-none transition placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-[#D6A84F]/35 sm:text-sm"
          onChange={(event) => onHighlightNoteChange(event.target.value)}
          placeholder="Ghi chú ngắn, ví dụ: ý quan trọng cho môn học"
          value={highlightNote}
        />
        <fieldset className="mt-3">
          <legend className="text-xs font-bold text-zinc-300">Màu highlight</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {([
              { value: "YELLOW", label: "Vàng", className: "bg-amber-300" },
              { value: "GREEN", label: "Xanh", className: "bg-emerald-400" },
              { value: "PINK", label: "Hồng", className: "bg-pink-400" },
            ] as const).map((option) => (
              <button
                aria-pressed={highlightColor === option.value}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                  highlightColor === option.value
                    ? "border-white/60 bg-white/15 text-white"
                    : "border-white/10 bg-white/[0.05] text-zinc-300 hover:bg-white/10"
                }`}
                key={option.value}
                onClick={() => onHighlightColorChange(option.value)}
                type="button"
              >
                <span className={`h-3 w-3 rounded-full ${option.className}`} aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            className="border-white/10 bg-white/[0.07] text-zinc-100 hover:bg-white/[0.12]"
            disabled={isPending || !highlightEngine?.selectionDraft}
            onClick={handleSelectionHighlight}
            type="button"
            variant="outline"
          >
            Lưu đoạn bôi đen
          </Button>
          <Button
            className="bg-[#D6A84F] text-slate-950 hover:bg-[#F2C14E]"
            disabled={isPending || !highlightText.trim()}
            onClick={onManualHighlight}
            type="button"
          >
            Lưu thủ công
          </Button>
        </div>
      </div>

      <aside className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-zinc-100 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">Dữ liệu đọc đã lưu</h2>
          <button
            className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
            disabled={visibleHighlights.length === 0}
            onClick={exportHighlights}
            type="button"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Xuất ghi chú
          </button>
        </div>
        <div className="mt-4">
          <p className="text-sm font-black text-zinc-200">Bookmark</p>
          {bookmarks.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {bookmarks.map((pageNumber) => (
                <button
                  className="min-h-11 rounded-full bg-[#0F766E]/18 px-3 py-2 text-xs font-bold text-[#7DD3C7] ring-1 ring-[#0F766E]/35 transition hover:bg-[#0F766E]/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  key={pageNumber}
                  onClick={() => onGoToPage(pageNumber)}
                  type="button"
                >
                  Trang {pageNumber}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Chưa có bookmark.</p>
          )}
        </div>

        <div className="mt-5">
          <p className="text-sm font-black text-zinc-200">Highlight gần đây</p>
          {visibleHighlights.length > 0 ? (
            <div className="mt-2 space-y-3">
              {visibleHighlights.slice(0, 4).map((highlight) => (
                <div className="relative rounded-xl border border-white/10 bg-white/[0.06] p-3 text-sm" key={highlight.id}>
                  <p className="line-clamp-3 leading-6 text-zinc-300">{highlight.text}</p>
                  {editingId === highlight.id ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        aria-label="Sửa ghi chú highlight"
                        className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#D6A84F]/40"
                        maxLength={500}
                        onChange={(event) => setEditingNote(event.target.value)}
                        value={editingNote}
                      />
                      <button aria-label="Lưu ghi chú" className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0F766E] transition hover:bg-[#0F5F59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" onClick={() => { void highlightEngine?.updateHighlightNote(highlight.id, editingNote); setEditingId(null); }} type="button"><Save className="h-4 w-4" /></button>
                      <button aria-label="Hủy sửa" className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" onClick={() => setEditingId(null)} type="button"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">Trang {highlight.pageNumber}{highlight.note ? ` - ${highlight.note}` : ""}</p>
                  )}
                  {highlight.bookId ? (
                    <div className="mt-3 flex justify-end gap-1">
                      <button aria-label="Sao chép trích dẫn" className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" onClick={() => void copyQuote(highlight.text, highlight.pageNumber)} type="button"><Copy className="h-4 w-4" /></button>
                      <button aria-label="Sửa ghi chú" className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" onClick={() => { setEditingId(highlight.id); setEditingNote(highlight.note ?? ""); }} type="button"><Pencil className="h-4 w-4" /></button>
                      <button aria-label="Xóa highlight" className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-500/15 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" disabled={highlightEngine?.isLoading} onClick={() => void highlightEngine?.deleteHighlight(highlight.id)} type="button"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Chưa có highlight.</p>
          )}
        </div>
      </aside>
    </section>
  );
}

export default function OnlineReaderPage() {
  const router = useRouter();
  const params = useParams<ReaderParams>();
  const bookId = getBookIdFromParams(params);
  const [pages, setPages] = useState<ReaderPage[]>([]);
  const [chapters, setChapters] = useState<ReaderChapter[]>([]);
  const totalPages = Math.max(1, pages.length);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeSpent, setTimeSpent] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState(`BookVerse Reader - ${bookId}`);
  const [readerSource, setReaderSource] = useState("Nội dung mô phỏng");
  const [ebookUrl, setEbookUrl] = useState<string | null>(null);
  const [readerAccess, setReaderAccess] = useState<"FULL" | "PREVIEW">("PREVIEW");
  const [totalBookPages, setTotalBookPages] = useState(TOTAL_PAGES);
  const [purchaseUrl, setPurchaseUrl] = useState(
    `/membership?bookId=${encodeURIComponent(bookId)}`,
  );
  const [canPurchaseEbook, setCanPurchaseEbook] = useState(false);
  const [hasDigitalAsset, setHasDigitalAsset] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [highlights, setHighlights] = useState<ReaderHighlight[]>([]);
  const [highlightText, setHighlightText] = useState("");
  const [highlightNote, setHighlightNote] = useState("");
  const [highlightColor, setHighlightColor] = useState<ReaderHighlight["color"]>("YELLOW");
  const [isReaderLoading, setIsReaderLoading] = useState(true);
  const [readerLoadError, setReaderLoadError] = useState<string | null>(null);
  const [readerLoadAttempt, setReaderLoadAttempt] = useState(0);
  const [isPending, startTransition] = useTransition();
  const timeSpentRef = useRef(0);
  const currentPageRef = useRef(1);

  const progressPercent = Math.round((currentPage / Math.max(1, totalBookPages)) * 100);
  const pageContent = pages[currentPage - 1]?.content ?? "";
  const currentChapter = pages[currentPage - 1]?.chapterNumber ?? 1;

  useEffect(() => {
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

    startTransition(async () => {
      try {
        const [initialState, readerContent] = await Promise.all([
          getReaderInitialState(bookId),
          getReaderBookContent(bookId),
        ]);

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
            "Không thể kết nối dữ liệu Reader. Hãy kiểm tra máy chủ rồi thử tải lại.",
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
    [bookId, handleActionResult, pages, totalBookPages],
  );

  useEffect(() => {
    let scrollSaveTimer: number | null = null;

    function handleScroll() {
      if (scrollSaveTimer !== null) {
        window.clearTimeout(scrollSaveTimer);
      }

      scrollSaveTimer = window.setTimeout(() => {
        if (timeSpentRef.current > 0) {
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
  }, [bookId, pages, totalBookPages]);

  useEffect(() => {
    return () => {
      if (timeSpentRef.current > 0) {
        void saveReadingProgress(
          bookId,
          currentPageRef.current,
          totalBookPages,
          timeSpentRef.current,
          pages[currentPageRef.current - 1]?.chapterNumber ?? 1,
        );
        void logInteraction(bookId, "READ");
      }
    };
  }, [bookId, pages, totalBookPages]);

  function goToPage(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    if (safePage === currentPage) {
      return;
    }

    persistReadingData(currentPage, timeSpentRef.current);
    setCurrentPage(safePage);
  }

  function handleBookmark() {
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
        const errorMessage = error instanceof Error ? error.message : "Không thể lưu highlight.";
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
      <HighlightProvider bookId={bookId} currentPage={currentPage}>
        <EbookReader
          bookId={bookId}
          bookTitle={bookTitle}
          chapters={chapters}
          canPurchaseEbook={canPurchaseEbook}
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
        </EbookReader>
      </HighlightProvider>
    </>
  );
}

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
  type ReaderHighlight,
} from "@/actions/reader.actions";
import { EbookReader } from "@/components/reader/EbookReader";
import { HighlightProvider, useHighlightEngine } from "@/components/reader/HighlightProvider";
import { BookViewTracker } from "@/components/shared/BookViewTracker";
import { Button } from "@/components/ui/button";

type ReaderParams = Record<string, string | string[] | undefined>;

interface ReaderPage {
  pageNumber: number;
  content: string;
}

const TOTAL_PAGES = 12;

function buildDemoPages(bookId: string): ReaderPage[] {
  return Array.from({ length: TOTAL_PAGES }, (_, index) => {
    const pageNumber = index + 1;

    return {
      pageNumber,
      content:
        `Trang ${pageNumber} của sách ${bookId}. ` +
        "BookVerse AI đang mô phỏng nội dung đọc trực tuyến để ghi nhận tiến độ, thời gian đọc, bookmark và hành vi tương tác của người dùng. " +
        "Trong bản triển khai thật, vùng này có thể thay bằng nội dung ePub, PDF viewer hoặc trình đọc chương sách từ database. ".repeat(
          7,
        ),
    };
  });
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
  isPending: boolean;
  onHighlightTextChange: (value: string) => void;
  onHighlightNoteChange: (value: string) => void;
  onManualHighlight: () => void;
  onGoToPage: (page: number) => void;
}

function ReaderHighlightTools({
  bookmarks,
  highlights,
  highlightText,
  highlightNote,
  isPending,
  onHighlightTextChange,
  onHighlightNoteChange,
  onManualHighlight,
  onGoToPage,
}: ReaderHighlightToolsProps) {
  const highlightEngine = useHighlightEngine();
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
      await highlightEngine?.saveSelectionHighlight(highlightNote);
    } catch (error: unknown) {
      console.error(error);
    }
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
          className="mt-4 min-h-24 w-full resize-y rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-[#D6A84F]/35"
          onChange={(event) => onHighlightTextChange(event.target.value)}
          placeholder="Nhập đoạn cần highlight thủ công..."
          value={highlightText}
        />
        <input
          className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-white/[0.07] px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-[#D6A84F]/35"
          onChange={(event) => onHighlightNoteChange(event.target.value)}
          placeholder="Ghi chú ngắn, ví dụ: ý quan trọng cho môn học"
          value={highlightNote}
        />
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
        <h2 className="text-lg font-black">Dữ liệu đọc đã lưu</h2>
        <div className="mt-4">
          <p className="text-sm font-black text-zinc-200">Bookmark</p>
          {bookmarks.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {bookmarks.map((pageNumber) => (
                <button
                  className="rounded-full bg-[#0F766E]/18 px-3 py-1 text-xs font-bold text-[#7DD3C7] ring-1 ring-[#0F766E]/35 transition hover:bg-[#0F766E]/28"
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
                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-sm" key={highlight.id}>
                  <p className="line-clamp-3 leading-6 text-zinc-300">{highlight.text}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Trang {highlight.pageNumber}
                    {highlight.note ? ` - ${highlight.note}` : ""}
                  </p>
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
  const [pages, setPages] = useState<ReaderPage[]>(() => buildDemoPages(bookId));
  const totalPages = Math.max(1, pages.length);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeSpent, setTimeSpent] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState(`BookVerse Reader - ${bookId}`);
  const [readerSource, setReaderSource] = useState("Nội dung mô phỏng");
  const [ebookUrl, setEbookUrl] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [highlights, setHighlights] = useState<ReaderHighlight[]>([]);
  const [highlightText, setHighlightText] = useState("");
  const [highlightNote, setHighlightNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const timeSpentRef = useRef(0);
  const currentPageRef = useRef(1);

  const progressPercent = Math.round((currentPage / totalPages) * 100);
  const pageContent = pages[currentPage - 1]?.content ?? "";

  useEffect(() => {
    let isActive = true;

    setPages(buildDemoPages(bookId));
    setCurrentPage(1);
    setReaderSource("Đang tải nội dung đọc...");
    setEbookUrl(null);

    startTransition(async () => {
      const [initialState, readerContent] = await Promise.all([
        getReaderInitialState(bookId),
        getReaderBookContent(bookId),
      ]);

      if (!isActive) {
        return;
      }

      const nextPages = readerContent.pages.length > 0 ? readerContent.pages : buildDemoPages(bookId);
      const nextTotalPages = Math.max(1, nextPages.length);
      setPages(nextPages);
      setReaderSource(readerContent.sourceLabel);
      setEbookUrl(readerContent.ebookUrl);

      if (!initialState) {
        return;
      }

      const safeInitialPage = Math.min(Math.max(initialState.currentPage, 1), nextTotalPages);
      setCurrentPage(safeInitialPage);
      setBookTitle(initialState.title);
      setBookmarks(initialState.bookmarks);
      setHighlights(initialState.highlights);

      if (initialState.progressPercent > 0) {
        setMessage(`Tiếp tục đọc từ ${initialState.progressPercent.toFixed(0)}% tiến độ trước đó.`);
      }
    });

    return () => {
      isActive = false;
    };
  }, [bookId]);

  useEffect(() => {
    timeSpentRef.current = timeSpent;
  }, [timeSpent]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeSpent((currentValue) => currentValue + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

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
            totalPages,
            spentSeconds,
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
    [bookId, handleActionResult, totalPages],
  );

  useEffect(() => {
    return () => {
      if (timeSpentRef.current > 0) {
        void saveReadingProgress(bookId, currentPageRef.current, totalPages, timeSpentRef.current);
        void logInteraction(bookId, "READ");
      }
    };
  }, [bookId, totalPages]);

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
        const result = await saveHighlight(bookId, currentPage, highlightText, highlightNote);
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

  return (
    <>
      <BookViewTracker bookId={bookId} />
      <HighlightProvider bookId={bookId} currentPage={currentPage}>
        <EbookReader
          bookId={bookId}
          bookTitle={bookTitle}
          currentPage={currentPage}
          ebookUrl={ebookUrl}
          isPending={isPending}
          message={message}
          onBack={handleBack}
          onBookmark={handleBookmark}
          onPageChange={goToPage}
          pageContent={pageContent}
          progressPercent={progressPercent}
          readerSource={readerSource}
          timeSpent={timeSpent}
          totalPages={totalPages}
        >
          <ReaderHighlightTools
            bookmarks={bookmarks}
            highlightNote={highlightNote}
            highlightText={highlightText}
            highlights={highlights}
            isPending={isPending}
            onGoToPage={goToPage}
            onHighlightNoteChange={setHighlightNote}
            onHighlightTextChange={setHighlightText}
            onManualHighlight={handleHighlight}
          />
        </EbookReader>
      </HighlightProvider>
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Bot, BookOpenCheck, Loader2, Quote, Send, Sparkles } from "lucide-react";
import {
  askReaderRag,
  type ReaderRagActionResult,
} from "@/actions/ai-reader-rag.actions";
import { createClientId } from "@/lib/client-id";

export type ReaderSelectionAiMode = "EXPLAIN" | "SUMMARIZE" | "QUIZ";

export interface ReaderSelectionAiRequest {
  id: number;
  mode: ReaderSelectionAiMode;
  text: string;
}

interface ReaderAiAssistantProps {
  bookId: string;
  currentChapterNumber: number;
  selectionRequest: ReaderSelectionAiRequest | null;
  onCitationNavigate: (chapterNumber: number, pageNumber: number | null) => void;
}

interface ReaderAiMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  result?: ReaderRagActionResult;
}

function buildSelectionPrompt(request: ReaderSelectionAiRequest): {
  query: string;
  label: string;
} {
  const selectedText = request.text.slice(0, 1_800);

  if (request.mode === "SUMMARIZE") {
    return {
      label: "Tóm tắt đoạn đã chọn",
      query: `Tóm tắt đoạn này thành 2-3 ý ngắn gọn. Đoạn được chọn: "${selectedText}"`,
    };
  }

  if (request.mode === "QUIZ") {
    return {
      label: "Tạo câu hỏi ôn tập từ đoạn đã chọn",
      query: `Tạo câu hỏi ôn tập: hãy tạo 1-2 câu hỏi dựa trên đoạn này. Đoạn được chọn: "${selectedText}"`,
    };
  }

  return {
    label: "Giải thích đoạn đã chọn",
    query: `Giải thích đoạn này bằng ngôn ngữ ngắn gọn, dễ hiểu. Đoạn được chọn: "${selectedText}"`,
  };
}

function renderAnswerWithCitationBadges(
  message: ReaderAiMessage,
  onCitationNavigate: ReaderAiAssistantProps["onCitationNavigate"],
): ReactNode {
  const parts = message.content.split(/(\[Chương\s+\d+(?:,\s*Trang\s+\d+)?\])/giu);

  return parts.map((part, index) => {
    const match = part.match(/^\[Chương\s+(\d+)(?:,\s*Trang\s+(\d+))?\]$/iu);

    if (!match) {
      return <span key={`${message.id}-text-${index}`}>{part}</span>;
    }

    const chapterNumber = Number(match[1]);
    const pageNumber = match[2] ? Number(match[2]) : null;
    const citation = message.result?.citations.find(
      (item) =>
        item.chapterNumber === chapterNumber &&
        (pageNumber === null || item.pageNumber === pageNumber),
    );

    return (
      <button
        aria-label={`Đi tới ${part.replace(/[[\]]/gu, "")}${citation?.chapterTitle ? `, ${citation.chapterTitle}` : ""}`}
        className="mx-1 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full border border-[#D6A84F]/45 bg-[#D6A84F]/15 px-2.5 py-1 align-middle text-xs font-black text-[#F7D98A] transition hover:bg-[#D6A84F]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
        key={`${message.id}-citation-${index}`}
        onClick={() => onCitationNavigate(chapterNumber, pageNumber)}
        title={citation?.chapterTitle ?? `Chương ${chapterNumber}`}
        type="button"
      >
        <Quote className="h-3 w-3" aria-hidden="true" />
        {part}
      </button>
    );
  });
}

export function ReaderAiAssistant({
  bookId,
  currentChapterNumber,
  selectionRequest,
  onCitationNavigate,
}: ReaderAiAssistantProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ReaderAiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledSelectionId = useRef<number | null>(null);

  const sendQuery = useCallback(
    async (ragQuery: string, displayLabel = ragQuery) => {
      const cleanQuery = ragQuery.replace(/\s+/gu, " ").trim();
      if (cleanQuery.length < 2 || isLoading) return;

      const requestId = createClientId("reader");
      setMessages((items) => [
        ...items,
        {
          id: `${requestId}-user`,
          role: "USER",
          content: displayLabel,
        },
      ]);
      setIsLoading(true);
      setError(null);

      try {
        const result = await askReaderRag(bookId, cleanQuery, currentChapterNumber);
        setMessages((items) => [
          ...items,
          {
            id: `${requestId}-assistant`,
            role: "ASSISTANT",
            content: result.answer,
            result,
          },
        ]);

        if (!result.success) {
          setError(result.error ?? "Nova chưa thể trả lời câu hỏi.");
        }
      } catch (caughtError: unknown) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Không thể kết nối Nova đọc sách.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [bookId, currentChapterNumber, isLoading],
  );

  useEffect(() => {
    if (
      !selectionRequest ||
      handledSelectionId.current === selectionRequest.id ||
      isLoading
    ) {
      return;
    }

    handledSelectionId.current = selectionRequest.id;
    const prompt = buildSelectionPrompt(selectionRequest);
    void sendQuery(prompt.query, prompt.label);
  }, [isLoading, selectionRequest, sendQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query;
    setQuery("");
    void sendQuery(nextQuery);
  }

  return (
    <section aria-labelledby="reader-ai-title" className="min-w-0">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bv-focus/30 text-[#7DD3C7]">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-black text-zinc-50" id="reader-ai-title">
            Nova đọc sách
          </h2>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Chỉ trả lời từ nội dung được phép đọc và luôn kiểm tra nguồn trích dẫn.
          </p>
        </div>
      </div>

      <div
        aria-live="polite"
        className="bv-scrollbar mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1"
      >
        {messages.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4 text-sm leading-6 text-zinc-300">
            <p className="font-bold text-zinc-100">Bạn có thể hỏi:</p>
            <div className="mt-3 grid gap-2">
              {[
                "Chương hiện tại nói về điều gì?",
                "Giải thích ý chính bằng ví dụ dễ hiểu.",
                "Tạo câu hỏi ôn tập cho chương này.",
              ].map((suggestion) => (
                <button
                  className="min-h-11 cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs font-bold transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-gold"
                  key={suggestion}
                  onClick={() => void sendQuery(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message) => (
          <article
            className={
              message.role === "USER"
                ? "ml-6 rounded-xl bg-bv-focus px-3 py-2.5 text-sm leading-6 text-white"
                : "mr-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-sm leading-7 text-zinc-200"
            }
            key={message.id}
          >
            {message.role === "ASSISTANT" ? (
              <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-[#7DD3C7]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Nội dung do Nova hỗ trợ
              </p>
            ) : null}
            <p className="whitespace-pre-line">
              {message.role === "ASSISTANT"
                ? renderAnswerWithCitationBadges(message, onCitationNavigate)
                : message.content}
            </p>
            {message.result ? (
              <p className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2 text-[11px] text-zinc-400">
                <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {message.result.provider === "local"
                  ? "Trích từ nội dung sách"
                  : "Nova hỗ trợ đọc sách"}{" "}
                · Dựa trên {message.result.retrievedChunkCount} đoạn trong sách ·{" "}
                {message.result.access === "FULL" ? "Toàn văn" : "Bản đọc thử"}
              </p>
            ) : null}
          </article>
        ))}

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm text-zinc-300">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Đang tìm nội dung liên quan trong sách…
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-300/25 bg-red-400/10 px-3 py-2 text-xs text-red-200" role="alert">
          {error}
        </p>
      ) : null}

      <form className="mt-4 space-y-2" onSubmit={handleSubmit}>
        <label className="text-xs font-bold text-zinc-300" htmlFor="reader-ai-query">
          Hỏi về nội dung sách
        </label>
        <textarea
          className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 text-base leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-[#D6A84F]/55 sm:text-sm"
          disabled={isLoading}
          id="reader-ai-query"
          maxLength={2_500}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ví dụ: Dòng năng lượng được mô tả như thế nào?"
          value={query}
        />
        <button
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#D6A84F] px-4 text-sm font-black text-slate-950 transition hover:bg-bv-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isLoading || query.trim().length < 2}
          type="submit"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          Gửi câu hỏi
        </button>
      </form>
    </section>
  );
}

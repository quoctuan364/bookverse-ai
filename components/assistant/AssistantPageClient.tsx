"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_ASSISTANT_MESSAGE_LENGTH, type AssistantSuccessResponse } from "@/lib/assistant-contract";
import { requestAssistant, submitAssistantFeedback } from "@/lib/assistant-client";
import { cn } from "@/lib/utils";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AssistantSuccessResponse;
  feedback?: "HELPFUL" | "NOT_HELPFUL";
  isError?: boolean;
}

const welcomeMessage: UiMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content:
    "Xin chào! Hãy cho mình biết chủ đề, mục tiêu đọc hoặc ngân sách. Mọi sách hiển thị bên dưới đều được xác minh từ catalog BookVerse.",
};

export function AssistantPageClient({ initialQuery }: { initialQuery: string }) {
  const [messages, setMessages] = useState<UiMessage[]>([welcomeMessage]);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const initialSentRef = useRef(false);

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || isSending) return;
      setMessages((current) => [
        ...current,
        { id: `user-${crypto.randomUUID()}`, role: "user", content: message },
      ]);
      setInputValue("");
      setFeedbackError(null);
      setIsSending(true);
      try {
        const response = await requestAssistant(message, sessionId);
        setSessionId(response.sessionId);
        setMessages((current) => [
          ...current,
          {
            id: `assistant-${crypto.randomUUID()}`,
            role: "assistant",
            content: response.answer,
            response,
          },
        ]);
      } catch (error: unknown) {
        const messageText =
          error instanceof Error
            ? error.message
            : "Trợ lý chưa sẵn sàng. Vui lòng thử lại sau.";
        setMessages((current) => [
          ...current,
          {
            id: `assistant-error-${crypto.randomUUID()}`,
            role: "assistant",
            content: messageText,
            isError: true,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, sessionId],
  );

  useEffect(() => {
    const query = initialQuery.trim();
    if (!query || initialSentRef.current) return;
    initialSentRef.current = true;
    void sendMessage(query);
  }, [initialQuery, sendMessage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(inputValue);
  }

  async function handleFeedback(message: UiMessage, value: "HELPFUL" | "NOT_HELPFUL") {
    const response = message.response;
    if (!response) return;
    setFeedbackError(null);
    setMessages((current) =>
      current.map((item) => (item.id === message.id ? { ...item, feedback: value } : item)),
    );
    try {
      await submitAssistantFeedback({
        sessionId: response.sessionId,
        messageId: response.assistantMessageId,
        value,
      });
    } catch (error: unknown) {
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, feedback: undefined } : item,
        ),
      );
      setFeedbackError(error instanceof Error ? error.message : "Không thể lưu feedback.");
    }
  }

  const latestResponse = [...messages]
    .reverse()
    .find((message) => message.response)?.response;

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
            <Bot className="h-4 w-4 text-[#F2C14E]" aria-hidden="true" />
            BookVerse AI Assistant
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Một contract, một trải nghiệm trợ lý
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#EAF5F1]">
            Câu trả lời AI và chế độ dự phòng đều chỉ liên kết tới sách đã xác minh trong catalog.
            Khi provider lỗi, giao diện nói rõ trạng thái thay vì giả lập thành công.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="bv-card h-fit rounded-lg p-5 lg:sticky lg:top-24">
          <h2 className="text-xl font-black text-[#17202A]">Hỏi trợ lý</h2>
          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66706B]"
              />
              <Input
                aria-describedby="assistant-character-count"
                aria-label="Nhu cầu tìm sách"
                className="pl-10"
                disabled={isSending}
                maxLength={MAX_ASSISTANT_MESSAGE_LENGTH}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Ví dụ: sách AI nhập môn dưới 200.000đ"
                type="search"
                value={inputValue}
              />
            </div>
            <p className="text-right text-xs text-[#66706B]" id="assistant-character-count">
              {inputValue.length}/{MAX_ASSISTANT_MESSAGE_LENGTH}
            </p>
            <Button className="w-full gap-2" disabled={isSending || !inputValue.trim()} type="submit">
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {isSending ? "Đang tư vấn..." : "Gửi câu hỏi"}
            </Button>
          </form>

          <div className="mt-5 rounded-lg bg-[#EAF2EF] px-4 py-3 text-sm leading-6 text-[#42524D]">
            Gợi ý câu hỏi: AI cho người mới, UX/UI thực chiến, tài chính cá nhân hoặc sách cũ
            giá tốt.
          </div>
          {latestResponse ? (
            <div
              className={cn(
                "mt-4 rounded-lg border px-4 py-3 text-sm",
                latestResponse.degraded
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800",
              )}
              role="status"
            >
              <div className="flex items-start gap-2">
                {latestResponse.degraded ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {latestResponse.degraded
                    ? latestResponse.mocked
                      ? "Development mock đang bật rõ ràng. Không dùng cấu hình này ở production."
                      : "Chế độ dự phòng từ catalog đã xác minh; không phải phản hồi giả."
                    : `${latestResponse.provider} + ${latestResponse.source}`}
                </span>
              </div>
            </div>
          ) : null}
        </aside>

        <section aria-label="Hội thoại với trợ lý" aria-live="polite" className="space-y-5">
          {messages.map((message) => (
            <article
              className={cn(
                "rounded-lg border p-5 shadow-sm",
                message.role === "user"
                  ? "ml-auto max-w-2xl border-[#0F766E]/20 bg-[#EAF2EF]"
                  : message.isError
                    ? "border-red-200 bg-red-50"
                    : "bv-card",
              )}
              key={message.id}
            >
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#E76F51]">
                {message.role === "user" ? "Bạn" : "BookVerse Assistant"}
              </p>
              <p className="mt-2 whitespace-pre-wrap leading-7 text-[#42524D]">{message.content}</p>

              {message.response?.validatedBooks.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {message.response.validatedBooks.map((book) => (
                    <Link
                      className="rounded-lg border border-[#17191F]/10 bg-[#FFFDF8] p-4 transition hover:border-[#0F766E]/40 hover:shadow-md"
                      href={book.href}
                      key={book.id}
                    >
                      <h3 className="font-black text-[#17202A]">{book.title}</h3>
                      <p className="mt-1 text-sm text-[#66706B]">{book.author}</p>
                      <p className="mt-2 text-xs font-semibold text-[#0F766E]">
                        Sách đã xác minh · điểm {book.score.toFixed(3)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : null}

              {message.response ? (
                <div className="mt-4 flex items-center gap-2 border-t border-[#17191F]/10 pt-3">
                  <span className="text-xs text-[#66706B]">Phản hồi này hữu ích?</span>
                  <button
                    aria-label="Câu trả lời hữu ích"
                    className={cn(
                      "rounded-full border p-2 text-[#66706B]",
                      message.feedback === "HELPFUL" && "border-emerald-400 bg-emerald-50 text-emerald-700",
                    )}
                    onClick={() => handleFeedback(message, "HELPFUL")}
                    type="button"
                  >
                    <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    aria-label="Câu trả lời chưa hữu ích"
                    className={cn(
                      "rounded-full border p-2 text-[#66706B]",
                      message.feedback === "NOT_HELPFUL" && "border-red-300 bg-red-50 text-red-700",
                    )}
                    onClick={() => handleFeedback(message, "NOT_HELPFUL")}
                    type="button"
                  >
                    <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </article>
          ))}

          {isSending ? (
            <div className="bv-card inline-flex items-center gap-2 rounded-lg px-4 py-3" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Đang truy xuất catalog và provider...
            </div>
          ) : null}
          {feedbackError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {feedbackError}
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}

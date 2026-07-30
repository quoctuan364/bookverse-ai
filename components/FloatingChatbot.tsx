"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Loader2,
  MessageCircle,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  MAX_ASSISTANT_MESSAGE_LENGTH,
  type AssistantSuccessResponse,
} from "@/lib/assistant-contract";
import { requestAssistant, submitAssistantFeedback } from "@/lib/assistant-client";
import { ASSISTANT_STORE_QUICK_QUESTIONS } from "@/lib/assistant-knowledge";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AssistantSuccessResponse;
  feedback?: "HELPFUL" | "NOT_HELPFUL";
  isError?: boolean;
}

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Xin chào! Mình có thể tìm sách và giải đáp về hội viên, đọc Ebook, đơn hàng, chợ sách hoặc tài khoản BookVerse.",
  },
];

export function FloatingChatbot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanMessage = inputValue.trim();
    if (!cleanMessage || isSending) return;

    setMessages((current) => [
      ...current,
      { id: `user-${crypto.randomUUID()}`, role: "user", content: cleanMessage },
    ]);
    setInputValue("");
    setFeedbackError(null);
    setIsSending(true);
    try {
      const response = await requestAssistant(cleanMessage, sessionId);
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
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${crypto.randomUUID()}`,
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Trợ lý chưa sẵn sàng. Vui lòng thử lại sau.",
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleFeedback(message: ChatMessage, value: "HELPFUL" | "NOT_HELPFUL") {
    if (!message.response) return;
    setFeedbackError(null);
    setMessages((current) =>
      current.map((item) => (item.id === message.id ? { ...item, feedback: value } : item)),
    );
    try {
      await submitAssistantFeedback({
        sessionId: message.response.sessionId,
        messageId: message.response.assistantMessageId,
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

  // Không che nội dung ở màn hình đã có AI riêng hoặc các luồng biểu mẫu quan trọng.
  const shouldHideChatbot =
    pathname === "/assistant" ||
    pathname.startsWith("/read/") ||
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/membership/checkout") ||
    pathname.startsWith("/membership/payment");

  if (shouldHideChatbot) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-3 z-[70] lg:bottom-5 lg:right-5">
      {isOpen ? (
        <section
          aria-label="BookVerse AI Assistant"
          aria-modal="false"
          className="mb-4 flex h-[min(620px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-white/12 bg-slate-950/90 text-zinc-100 shadow-[0_24px_90px_rgba(0,0,0,0.46)] backdrop-blur-2xl"
          role="dialog"
        >
          <header className="flex items-center justify-between border-b border-white/10 bg-white/[0.06] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D6A84F]/18 text-[#F2C14E] ring-1 ring-[#F2C14E]/25">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black">BookVerse AI Assistant</h2>
                <p className="text-xs text-zinc-400">
                  {latestResponse?.degraded
                    ? latestResponse.mocked
                      ? "DEV MOCK đang bật"
                      : "Dự phòng từ dữ liệu BookVerse"
                    : latestResponse
                      ? `${latestResponse.provider} · ${latestResponse.source}`
                      : "RAG và fallback minh bạch"}
                </p>
              </div>
            </div>
            <Button
              aria-label="Đóng chatbot"
              className="h-11 w-11 rounded-full border-white/10 bg-white/8 text-zinc-100 hover:bg-white/14"
              onClick={() => setIsOpen(false)}
              size="icon"
              type="button"
              variant="outline"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </header>

          {latestResponse?.degraded ? (
            <div
              className="flex items-start gap-2 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs leading-5 text-amber-100"
              role="status"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {latestResponse.mocked
                ? "Chỉ dùng để phát triển; production luôn vô hiệu hóa mock."
                : "Provider hoặc vector chưa sẵn sàng; kết quả hiện lấy từ dữ liệu BookVerse đã xác minh, không giả phản hồi AI."}
            </div>
          ) : null}

          <div aria-live="polite" className="bv-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 1 ? (
              <div className="grid grid-cols-2 gap-2">
                {ASSISTANT_STORE_QUICK_QUESTIONS.map((question) => (
                  <button
                    className="min-h-11 cursor-pointer rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-xs font-bold text-zinc-200 transition hover:border-[#F2C14E]/35 hover:bg-white/10 hover:text-[#F2C14E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2C14E]"
                    disabled={isSending}
                    key={question.id}
                    onClick={() => {
                      setInputValue(question.query);
                    }}
                    type="button"
                  >
                    {question.label}
                  </button>
                ))}
              </div>
            ) : null}
            {messages.map((message) => (
              <div
                className={cn("flex flex-col", message.role === "user" ? "items-end" : "items-start")}
                key={message.id}
              >
                <div
                  className={cn(
                    "max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg",
                    message.role === "user"
                      ? "bg-[#0F766E] text-white shadow-[#0F766E]/18"
                      : message.isError
                        ? "border border-red-400/30 bg-red-500/10 text-red-100"
                        : "border border-white/10 bg-white/[0.08] text-zinc-100",
                  )}
                >
                  {message.content}
                </div>

                {message.response?.validatedBooks.length ? (
                  <div className="mt-2 grid w-[86%] gap-1.5">
                    {message.response.validatedBooks.slice(0, 3).map((book) => (
                      <Link
                        className="inline-flex min-h-11 flex-col justify-center rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-zinc-200 transition hover:border-[#F2C14E]/40 hover:text-[#F2C14E]"
                        href={book.href}
                        key={book.id}
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="line-clamp-1 font-bold">{book.title}</span>
                        <span className="line-clamp-1 text-zinc-400">{book.author}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {message.response ? (
                  <div className="mt-1 flex max-w-[86%] gap-1 self-start pl-1">
                    <button
                      aria-label="Câu trả lời hữu ích"
                      className={cn(
                        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-[#F2C14E]",
                        message.feedback === "HELPFUL" && "bg-[#F2C14E]/20 text-[#F2C14E]",
                      )}
                      onClick={() => handleFeedback(message, "HELPFUL")}
                      type="button"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      aria-label="Câu trả lời chưa hữu ích"
                      className={cn(
                        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-red-300",
                        message.feedback === "NOT_HELPFUL" && "bg-red-500/15 text-red-300",
                      )}
                      onClick={() => handleFeedback(message, "NOT_HELPFUL")}
                      type="button"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}

            {isSending ? (
              <div className="flex justify-start" role="status">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm text-zinc-300">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Đang tư vấn...
                </div>
              </div>
            ) : null}
            {feedbackError ? (
              <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-100" role="alert">
                {feedbackError}
              </p>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form className="border-t border-white/10 bg-black/20 p-3" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 focus-within:ring-2 focus-within:ring-[#D6A84F]/35">
              <input
                aria-label="Nhập câu hỏi cho chatbot"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                disabled={isSending}
                maxLength={MAX_ASSISTANT_MESSAGE_LENGTH}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Hỏi sách, hội viên, đơn hàng..."
                value={inputValue}
              />
              <Button
                aria-label="Gửi tin nhắn"
                className="h-11 w-11 rounded-full bg-[#D6A84F] text-slate-950 hover:bg-[#F2C14E]"
                disabled={isSending || !inputValue.trim()}
                size="icon"
                type="submit"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        aria-label={isOpen ? "Đóng chatbot" : "Mở chatbot"}
        className="group flex h-14 w-14 items-center justify-center rounded-full border border-[#F2C14E]/35 bg-slate-950/80 text-[#F2C14E] shadow-[0_18px_55px_rgba(0,0,0,0.42)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-[#0F766E]/88 hover:text-white sm:h-16 sm:w-16"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-7 w-7 transition group-hover:scale-110" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

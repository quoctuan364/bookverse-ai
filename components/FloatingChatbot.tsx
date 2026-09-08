"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Loader2,
  MessageCircle,
  RotateCcw,
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
import { extractAssistantInternalLinks } from "@/lib/assistant-message-links";
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
      "Xin chào! Mình là Nova, trợ lý đọc sách của BookVerse. Bạn có thể nhờ mình tìm sách, giải đáp về Ebook, hội viên, đơn hàng, chợ sách, cộng đồng hoặc tài khoản.",
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    messagesEndRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && window.matchMedia("(min-width: 1024px)").matches) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        toggleRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  async function sendMessage(message: string) {
    const cleanMessage = message.trim();
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(inputValue);
  }

  function resetConversation() {
    setMessages(initialMessages);
    setSessionId(null);
    setInputValue("");
    setFeedbackError(null);
    inputRef.current?.focus();
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
    pathname === "/cart" ||
    pathname === "/marketplace" ||
    pathname.startsWith("/book/") ||
    pathname.startsWith("/orders") ||
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
    <div
      className={cn(
        "fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[70] flex flex-col items-end lg:bottom-5 lg:left-auto lg:right-5 lg:w-[410px]",
        // Trang chủ đã có lối vào AI và bottom navigation trên mobile.
        pathname === "/" && "hidden lg:flex",
      )}
    >
      {isOpen ? (
        <section
          aria-labelledby="bookverse-chat-title"
          aria-modal="false"
          className="mb-3 flex h-[min(610px,calc(100dvh-11rem))] w-full max-w-[410px] flex-col overflow-hidden rounded-3xl border border-bv-ink/10 bg-[#FFFDF8] text-bv-ink shadow-[0_28px_90px_rgba(21,50,47,0.28)] lg:h-[min(650px,calc(100dvh-6.5rem))]"
          id="bookverse-support-chat"
          role="dialog"
        >
          <header className="flex items-center justify-between bg-bv-primary px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12 text-[#F5D98B] ring-1 ring-white/20">
                <Bot className="h-5 w-5" aria-hidden="true" />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bv-primary bg-emerald-300" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black" id="bookverse-chat-title">Nova</h2>
                <p className="mt-0.5 text-xs text-[#D9EEEA]">
                  {latestResponse?.degraded
                    ? latestResponse.mocked
                      ? "DEV MOCK đang bật"
                      : "Đang dùng tri thức BookVerse"
                    : latestResponse
                      ? `${latestResponse.provider} · ${latestResponse.source}`
                      : "Sẵn sàng hỗ trợ bạn"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                aria-label="Bắt đầu cuộc trò chuyện mới"
                className="h-11 w-11 rounded-full border-white/15 bg-white/10 text-white hover:bg-white/20"
                onClick={resetConversation}
                size="icon"
                title="Cuộc trò chuyện mới"
                type="button"
                variant="outline"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                aria-label="Thu nhỏ Nova"
                className="h-11 w-11 rounded-full border-white/15 bg-white/10 text-white hover:bg-white/20"
                onClick={() => {
                  setIsOpen(false);
                  toggleRef.current?.focus();
                }}
                size="icon"
                type="button"
                variant="outline"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </header>

          {latestResponse?.degraded ? (
            <div
              className="flex items-start gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-900"
              role="status"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {latestResponse.mocked
                ? "Chỉ dùng để phát triển; production luôn vô hiệu hóa mock."
                : "Provider hoặc vector chưa sẵn sàng; kết quả hiện lấy từ dữ liệu BookVerse đã xác minh, không giả phản hồi AI."}
            </div>
          ) : null}

          <div aria-live="polite" className="bv-scrollbar flex-1 space-y-3 overflow-y-auto bg-[#F5F2EA] px-4 py-4">
            {messages.length === 1 ? (
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-bv-text-muted">Hỏi nhanh</p>
                <div className="grid grid-cols-2 gap-2">
                {ASSISTANT_STORE_QUICK_QUESTIONS.slice(0, 6).map((question) => (
                  <button
                    className="min-h-12 cursor-pointer rounded-xl border border-bv-primary/15 bg-white px-3 py-2 text-left text-xs font-bold leading-5 text-bv-primary transition duration-200 hover:border-bv-primary/35 hover:bg-bv-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
                    disabled={isSending}
                    key={question.id}
                    onClick={() => void sendMessage(question.query)}
                    type="button"
                  >
                    {question.label}
                  </button>
                ))}
                </div>
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
                      ? "rounded-br-md bg-bv-primary text-white shadow-bv-primary/15"
                      : message.isError
                        ? "rounded-bl-md border border-red-200 bg-red-50 text-red-800"
                        : "rounded-bl-md border border-bv-ink/10 bg-white text-bv-ink shadow-[0_8px_22px_rgba(37,49,56,0.08)]",
                  )}
                >
                  <span className="whitespace-pre-wrap">{message.content}</span>
                </div>

                {message.response?.validatedBooks.length ? (
                  <div className="mt-2 grid w-[86%] gap-1.5">
                    {message.response.validatedBooks.slice(0, 3).map((book) => (
                      <Link
                        className="inline-flex min-h-12 flex-col justify-center rounded-xl border border-bv-primary/15 bg-white px-3 py-2 text-xs text-bv-ink transition duration-200 hover:border-bv-primary/35 hover:bg-bv-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
                        href={book.href}
                        key={book.id}
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="line-clamp-1 font-bold">{book.title}</span>
                        <span className="line-clamp-1 text-bv-text-muted">{book.author}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && extractAssistantInternalLinks(message.content).length > 0 ? (
                  <div className="mt-2 flex w-[86%] flex-wrap gap-2">
                    {extractAssistantInternalLinks(message.content).map((link) => (
                      <Link
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-bv-primary/20 bg-bv-mint px-3 py-2 text-xs font-black text-bv-primary transition duration-200 hover:border-bv-primary/40 hover:bg-[#D8EDE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
                        href={link.href}
                        key={link.href}
                        onClick={() => setIsOpen(false)}
                      >
                        {link.label}
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                ) : null}

                {message.response ? (
                  <div className="mt-1 flex max-w-[86%] gap-1 self-start pl-1">
                    <button
                      aria-label="Câu trả lời hữu ích"
                      className={cn(
                        "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-bv-ink/10 bg-white text-bv-text-muted transition hover:bg-bv-mint hover:text-bv-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary",
                        message.feedback === "HELPFUL" && "border-bv-primary/25 bg-bv-mint text-bv-primary",
                      )}
                      onClick={() => handleFeedback(message, "HELPFUL")}
                      type="button"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      aria-label="Câu trả lời chưa hữu ích"
                      className={cn(
                        "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-bv-ink/10 bg-white text-bv-text-muted transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600",
                        message.feedback === "NOT_HELPFUL" && "border-red-200 bg-red-50 text-red-700",
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
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-bv-ink/10 bg-white px-4 py-3 text-sm text-bv-text-muted shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Đang tư vấn...
                </div>
              </div>
            ) : null}
            {feedbackError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">
                {feedbackError}
              </p>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form className="border-t border-bv-ink/10 bg-[#FFFDF8] p-3" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 rounded-2xl border border-bv-ink/15 bg-white px-3 py-2 shadow-sm focus-within:border-bv-primary/35 focus-within:ring-2 focus-within:ring-bv-primary/20">
              <input
                aria-label="Nhập câu hỏi cho Nova"
                autoComplete="off"
                className="h-11 min-w-0 flex-1 bg-transparent text-base text-bv-ink outline-none placeholder:text-bv-text-muted sm:text-sm"
                disabled={isSending}
                maxLength={MAX_ASSISTANT_MESSAGE_LENGTH}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Hỏi Nova về sách hoặc BookVerse..."
                ref={inputRef}
                value={inputValue}
              />
              <Button
                aria-label="Gửi tin nhắn"
                className="h-11 w-11 cursor-pointer rounded-full bg-bv-primary text-white hover:bg-bv-primary-dark focus-visible:ring-bv-primary"
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
        aria-label={isOpen ? "Đóng Nova" : "Mở Nova"}
        aria-controls="bookverse-support-chat"
        aria-expanded={isOpen}
        className="ml-auto flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/25 bg-bv-primary px-4 text-white shadow-[0_18px_48px_rgba(13,76,70,0.34)] transition-colors duration-200 hover:bg-bv-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2 sm:min-h-16 sm:px-5"
        onClick={() => setIsOpen((current) => !current)}
        ref={toggleRef}
        type="button"
      >
        {isOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
        <span className="hidden text-sm font-black sm:inline">
          {isOpen ? "Thu nhỏ" : "Hỏi Nova"}
        </span>
      </button>
    </div>
  );
}

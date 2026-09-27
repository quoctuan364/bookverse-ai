"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ExternalLink,
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
import { createClientId } from "@/lib/client-id";
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
      "Xin chào! Mình là Nova — hỗ trợ viên BookVerse. Bạn cần tìm sách hay cần giải đáp về gói Hội viên, cách đọc sách hoặc đơn hàng cứ nhắn mình nhé!",
  },
];

const QUICK_SUGGESTIONS = [
  {
    id: "trending",
    label: "Sách đang thịnh hành",
    query: "Sách nào đang được xem nhiều nhất trên BookVerse? Gợi ý top 3 cuốn nổi bật.",
  },
  {
    id: "self-help",
    label: "Sách kỹ năng sống",
    query: "Gợi ý sách kỹ năng sống, phát triển bản thân và tư duy tích cực.",
  },
  {
    id: "novel",
    label: "Tiểu thuyết nổi bật",
    query: "Gợi ý cho tôi 3 cuốn tiểu thuyết hay nhất đang có trên BookVerse.",
  },
  {
    id: "membership",
    label: "Quyền lợi hội viên",
    query: "Gói hội viên BookVerse mở được những gì?",
  },
];

export function FloatingChatbot() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  async function sendMessage(text: string) {
    const cleanMessage = text.trim();
    if (!cleanMessage || isSending) return;

    setMessages((current) => [
      ...current,
      { id: createClientId("user"), role: "user", content: cleanMessage },
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
          id: createClientId("assistant"),
          role: "assistant",
          content: response.answer,
          response,
        },
      ]);
    } catch (error: unknown) {
      setMessages((current) => [
        ...current,
        {
          id: createClientId("assistant-error"),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Nova chưa sẵn sàng. Vui lòng thử lại sau.",
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(inputValue);
  }

  async function handleFeedback(message: ChatMessage, feedback: "HELPFUL" | "NOT_HELPFUL") {
    if (!message.response || message.feedback) return;
    try {
      await submitAssistantFeedback({
        sessionId: message.response.sessionId,
        messageId: message.response.assistantMessageId,
        value: feedback,
      });
      setMessages((current) =>
        current.map((item) => (item.id === message.id ? { ...item, feedback } : item)),
      );
    } catch {
      setFeedbackError("Không thể lưu phản hồi lúc này.");
    }
  }

  // Không che nội dung ở màn hình đã có AI riêng hoặc các luồng biểu mẫu quan trọng.
  const currentPath = pathname || "";
  const shouldHideChatbot =
    currentPath === "/assistant" ||
    currentPath.startsWith("/read/") ||
    currentPath.startsWith("/admin") ||
    currentPath === "/login" ||
    currentPath === "/register" ||
    currentPath === "/forgot-password" ||
    currentPath === "/reset-password" ||
    currentPath.startsWith("/membership/checkout") ||
    currentPath.startsWith("/membership/payment");

  if (!mounted || shouldHideChatbot) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-[70] lg:bottom-6 lg:right-6">
      {isOpen ? (
        <section
          aria-label="Trợ lý hỗ trợ BookVerse"
          aria-modal="false"
          className="mb-3 flex h-[min(600px,calc(100vh-6.5rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-bv-ink/15 bg-white text-bv-ink shadow-[0_24px_60px_rgba(23,107,98,0.22)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-emerald-900/10 bg-gradient-to-r from-[#0F4C47] to-[#146059] px-4 py-3.5 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20 shadow-xs">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-black tracking-tight">Nova · Hỗ trợ BookVerse</h2>
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" title="Đang trực tuyến" />
                </div>
                <p className="truncate text-xs text-emerald-100/80">
                  Tư vấn sách &amp; giải đáp độc giả
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/90 transition hover:bg-white/20 hover:text-white"
                href="/assistant"
                onClick={() => setIsOpen(false)}
                title="Mở toàn màn hình"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Button
                aria-label="Đóng chatbot"
                className="h-9 w-9 rounded-xl border-0 bg-white/10 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </header>

          {/* Messages list */}
          <div aria-live="polite" className="bv-scrollbar flex-1 space-y-3.5 overflow-y-auto bg-[#FAF8F2] p-4">
            {messages.map((message) => (
              <div
                className={cn("flex flex-col", message.role === "user" ? "items-end" : "items-start")}
                key={message.id}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-xs",
                    message.role === "user"
                      ? "rounded-tr-xs bg-[#176B62] text-white shadow-[#176B62]/10"
                      : message.isError
                        ? "rounded-tl-xs border border-red-200 bg-red-50 text-red-800"
                        : "rounded-tl-xs border border-bv-ink/10 bg-white text-bv-ink shadow-xs",
                  )}
                >
                  {message.content}
                </div>

                {message.response?.validatedBooks?.length ? (
                  <div className="mt-2 grid w-[88%] gap-1.5">
                    {message.response.validatedBooks.slice(0, 3).map((book) => (
                      <Link
                        className="flex flex-col justify-center rounded-xl border border-bv-ink/10 bg-white p-2.5 text-xs text-bv-heading shadow-xs transition hover:border-[#176B62] hover:bg-[#EBF6F3] hover:text-[#176B62]"
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

                {message.response ? (
                  <div className="mt-1 flex max-w-[88%] gap-1 self-start pl-1">
                    <button
                      aria-label="Câu trả lời hữu ích"
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-bv-ink/10 text-bv-text-muted transition hover:bg-white hover:text-amber-500",
                        message.feedback === "HELPFUL" && "bg-amber-100 text-amber-600 border-amber-300",
                      )}
                      onClick={() => handleFeedback(message, "HELPFUL")}
                      title="Hữu ích"
                      type="button"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      aria-label="Câu trả lời chưa hữu ích"
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-bv-ink/10 text-bv-text-muted transition hover:bg-white hover:text-red-500",
                        message.feedback === "NOT_HELPFUL" && "bg-red-100 text-red-600 border-red-300",
                      )}
                      onClick={() => handleFeedback(message, "NOT_HELPFUL")}
                      title="Chưa hữu ích"
                      type="button"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}

            {/* Quick Suggestions (hiển thị gọn gàng dưới tin nhắn chào đầu tiên) */}
            {messages.length === 1 ? (
              <div className="pt-1">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-bv-text-muted">
                  Gợi ý nhanh cho bạn:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_SUGGESTIONS.map((item) => (
                    <button
                      className="flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border border-[#1D2433]/10 bg-white px-3 py-2 text-center text-xs font-bold text-[#1D2433] shadow-xs transition hover:border-[#176B62] hover:bg-[#EBF6F3] hover:text-[#176B62] active:scale-[0.98] disabled:opacity-50"
                      disabled={isSending}
                      key={item.id}
                      onClick={() => void sendMessage(item.query)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {isSending ? (
              <div className="flex justify-start" role="status">
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-xs border border-bv-ink/10 bg-white px-4 py-2.5 text-xs font-semibold text-bv-text-subtle shadow-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#176B62]" aria-hidden="true" />
                  Đang tra cứu kho sách...
                </div>
              </div>
            ) : null}

            {feedbackError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                {feedbackError}
              </p>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <form className="border-t border-bv-ink/10 bg-white p-3" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 rounded-2xl border border-bv-ink/15 bg-[#FAF8F2] px-3.5 py-1.5 focus-within:border-[#176B62] focus-within:ring-2 focus-within:ring-[#176B62]/20 transition-all">
              <input
                aria-label="Nhập câu hỏi"
                className="h-10 min-w-0 flex-1 bg-transparent text-sm text-bv-ink outline-none placeholder:text-bv-text-muted"
                disabled={isSending}
                maxLength={MAX_ASSISTANT_MESSAGE_LENGTH}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Hỏi sách, tác giả, hội viên..."
                value={inputValue}
              />
              <Button
                aria-label="Gửi tin nhắn"
                className="h-9 w-9 shrink-0 rounded-xl bg-[#176B62] text-white hover:bg-[#104C47] transition-all disabled:opacity-40"
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

      {/* Trigger floating button */}
      <button
        aria-label={isOpen ? "Đóng khung chat hỗ trợ" : "Mở khung chat hỗ trợ"}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#176B62] text-white shadow-[0_12px_36px_rgba(23,107,98,0.36)] ring-4 ring-white transition-all duration-200 hover:-translate-y-1 hover:bg-[#104C47] hover:shadow-[0_16px_44px_rgba(23,107,98,0.48)] active:translate-y-0 sm:h-15 sm:w-15 cursor-pointer"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-7 w-7" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

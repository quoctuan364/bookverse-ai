"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  messageId?: string;
  feedback?: "HELPFUL" | "NOT_HELPFUL";
}

interface ChatbotApiResponse {
  success: true;
  sessionId: string;
  assistantMessageId: string;
  reply: string;
  provider: string;
  model: string;
  mocked: boolean;
}

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Xin chào, mình là BookVerse AI Assistant. Bạn muốn tìm sách theo chủ đề nào?",
  },
];

function isChatbotApiResponse(value: unknown): value is ChatbotApiResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as ChatbotApiResponse;

  return (
    response.success === true &&
    typeof response.sessionId === "string" &&
    typeof response.assistantMessageId === "string" &&
    typeof response.reply === "string" &&
    typeof response.provider === "string" &&
    typeof response.model === "string" &&
    typeof response.mocked === "boolean"
  );
}

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanMessage = inputValue.trim();
    if (!cleanMessage || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: "user",
      content: cleanMessage,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cleanMessage,
          sessionId,
        }),
      });

      const payload: unknown = await response.json();
      if (!response.ok || !isChatbotApiResponse(payload)) {
        throw new Error("API chatbot trả dữ liệu không hợp lệ.");
      }

      setSessionId(payload.sessionId);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${crypto.randomUUID()}`,
          messageId: payload.assistantMessageId,
          role: "assistant",
          content: payload.reply,
        },
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể gọi chatbot.";
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-error-${crypto.randomUUID()}`,
          role: "assistant",
          content: `Mình chưa phản hồi được lúc này. Chi tiết: ${message}`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleFeedback(message: ChatMessage, value: "HELPFUL" | "NOT_HELPFUL") {
    if (!sessionId || !message.messageId) {
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((currentMessage) =>
        currentMessage.id === message.id ? { ...currentMessage, feedback: value } : currentMessage,
      ),
    );

    await fetch("/api/chat/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        messageId: message.messageId,
        value,
      }),
    }).catch(() => {
      setMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === message.id ? { ...currentMessage, feedback: undefined } : currentMessage,
        ),
      );
    });
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {isOpen ? (
        <section className="mb-4 flex h-[min(620px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-white/12 bg-slate-950/78 text-zinc-100 shadow-[0_24px_90px_rgba(0,0,0,0.46)] backdrop-blur-2xl">
          <header className="flex items-center justify-between border-b border-white/10 bg-white/[0.06] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D6A84F]/18 text-[#F2C14E] ring-1 ring-[#F2C14E]/25">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black">BookVerse AI Assistant</h2>
                <p className="text-xs text-zinc-400">Mock API, sẵn sàng nối dữ liệu hội thoại</p>
              </div>
            </div>

            <Button
              aria-label="Đóng chatbot"
              className="h-9 w-9 rounded-full border-white/10 bg-white/8 text-zinc-100 hover:bg-white/14"
              onClick={() => setIsOpen(false)}
              size="icon"
              type="button"
              variant="outline"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </header>

          <div className="bv-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                className={cn(
                  "flex flex-col",
                  message.role === "user" ? "items-end" : "items-start",
                )}
                key={message.id}
              >
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg",
                    message.role === "user"
                      ? "bg-[#0F766E] text-white shadow-[#0F766E]/18"
                      : "border border-white/10 bg-white/[0.08] text-zinc-100",
                  )}
                >
                  {message.content}
                </div>
                {message.role === "assistant" && message.messageId ? (
                  <div className="mt-1 flex max-w-[82%] gap-1 self-start pl-1">
                    <button
                      aria-label="Câu trả lời hữu ích"
                      className={cn(
                        "rounded-full border border-white/10 p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-[#F2C14E]",
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
                        "rounded-full border border-white/10 p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-red-300",
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
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm text-zinc-300">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Đang tư vấn...
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form className="border-t border-white/10 bg-black/20 p-3" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 focus-within:ring-2 focus-within:ring-[#D6A84F]/35">
              <input
                aria-label="Nhập câu hỏi cho chatbot"
                className="h-10 min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                disabled={isSending}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Ví dụ: Gợi ý sách AI dễ đọc..."
                value={inputValue}
              />
              <Button
                aria-label="Gửi tin nhắn"
                className="h-10 w-10 rounded-full bg-[#D6A84F] text-slate-950 hover:bg-[#F2C14E]"
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
        className="group flex h-16 w-16 items-center justify-center rounded-full border border-[#F2C14E]/35 bg-slate-950/80 text-[#F2C14E] shadow-[0_18px_55px_rgba(0,0,0,0.42)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-[#0F766E]/88 hover:text-white"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
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

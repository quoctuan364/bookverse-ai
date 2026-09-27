"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Bot,
  ChevronRight,
  History,
  Loader2,
  MessageSquareText,
  PanelLeft,
  PanelLeftClose,
  Pencil,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteMyAssistantSession,
  renameMyAssistantSession,
  type AssistantHistorySession,
} from "@/actions/assistant-history.actions";
import type { AssistantBookSuggestion } from "@/actions/assistant.actions";
import { BookCover } from "@/components/shared/BookCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AI_DISCOVERY_PROMPTS } from "@/lib/ai-discovery-prompts";
import { ASSISTANT_STORE_QUICK_QUESTIONS } from "@/lib/assistant-knowledge";
import {
  MAX_ASSISTANT_MESSAGE_LENGTH,
  type AssistantSuccessResponse,
} from "@/lib/assistant-contract";
import { requestAssistant, selectAssistantContextQuery, submitAssistantFeedback } from "@/lib/assistant-client";
import { createClientId } from "@/lib/client-id";
import { cn } from "@/lib/utils";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AssistantSuccessResponse;
  feedback?: "HELPFUL" | "NOT_HELPFUL";
  isError?: boolean;
}

interface AssistantPageClientProps {
  initialQuery: string;
  history: AssistantHistorySession[];
  runtimeMode: "external" | "local";
  starterBooks: AssistantBookSuggestion[];
}

export function AssistantPageClient({
  initialQuery,
  history,
  runtimeMode,
  starterBooks,
}: AssistantPageClientProps) {
  // Bắt đầu với mảng rỗng để hiển thị Empty State sạch sẽ chuẩn ChatGPT
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState(history);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [isHistoryPending, startHistoryTransition] = useTransition();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const initialSentRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    // Không tự cuộn trang ở empty state, đặc biệt trên mobile.
    if (messages.length === 0 && !isSending) return;
    scrollToBottom();
  }, [messages, isSending, scrollToBottom]);

  function startNewConversation() {
    setMessages([]);
    setSessionId(null);
    setInputValue("");
    setFeedbackError(null);
    setIsMobileSidebarOpen(false);
  }

  function openHistorySession(session: AssistantHistorySession) {
    setMessages(
      session.messages.length > 0
        ? session.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
          }))
        : [],
    );
    setSessionId(session.id);
    setInputValue("");
    setFeedbackError(null);
    setIsMobileSidebarOpen(false);
  }

  function beginRename(session: AssistantHistorySession) {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
    setHistoryMessage(null);
  }

  function saveHistoryTitle(sessionIdValue: string) {
    startHistoryTransition(async () => {
      const result = await renameMyAssistantSession(sessionIdValue, editingTitle);
      setHistoryMessage(result.message);
      if (!result.success || !result.title) return;

      setHistoryItems((current) =>
        current.map((item) =>
          item.id === sessionIdValue ? { ...item, title: result.title } : item,
        ),
      );
      setEditingSessionId(null);
      setEditingTitle("");
    });
  }

  function deleteHistorySession(session: AssistantHistorySession) {
    const confirmed = window.confirm(
      `Xóa cuộc trò chuyện “${session.title}”? Tin nhắn trong phiên này sẽ bị xóa.`,
    );
    if (!confirmed) return;

    startHistoryTransition(async () => {
      const result = await deleteMyAssistantSession(session.id);
      setHistoryMessage(result.message);
      if (!result.success) return;

      setHistoryItems((current) =>
        current.filter((item) => item.id !== session.id),
      );
      if (sessionId === session.id) startNewConversation();
      if (editingSessionId === session.id) {
        setEditingSessionId(null);
        setEditingTitle("");
      }
    });
  }

  const sendMessage = useCallback(
    async (rawMessage: string, focusedBookId?: string) => {
      const message = rawMessage.trim();
      if (!message || isSending) return;

      setMessages((current) => [
        ...current,
        { id: createClientId("user"), role: "user", content: message },
      ]);
      setInputValue("");
      setFeedbackError(null);
      setIsSending(true);

      try {
        const contextBooks = [...messages].reverse().find((item) => item.response)?.response?.validatedBooks ?? [];
        const contextQuery = selectAssistantContextQuery(messages);
        const response = await requestAssistant(message, sessionId, contextBooks.map((book) => book.id), focusedBookId, contextQuery);
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
        const messageText =
          error instanceof Error
            ? error.message
            : "Trợ lý chưa sẵn sàng. Vui lòng thử lại sau.";
        setMessages((current) => [
          ...current,
          {
            id: createClientId("assistant-error"),
            role: "assistant",
            content: messageText,
            isError: true,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, sessionId, messages],
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
      setFeedbackError(error instanceof Error ? error.message : "Không thể lưu phản hồi.");
    }
  }

  const isConversationEmpty = messages.length === 0;

  return (
    <div className="bv-assistant-page relative flex h-[calc(100dvh-72px)] w-full overflow-hidden bg-[#FAF8F2] text-bv-ink">
      {/* Hidden heading for SEO & E2E smoke tests */}
      <h2 className="sr-only">Hỏi trợ lý</h2>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isMobileSidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      ) : null}

      {/* SIDEBAR (CỘT TRÁI - 260px) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-bv-ink/10 bg-[#F4EFE6] transition-transform duration-300 ease-in-out lg:static lg:w-[260px] lg:translate-x-0",
          isSidebarOpen ? "lg:flex" : "lg:hidden",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Top Header Sidebar */}
        <div className="flex items-center justify-between border-b border-bv-ink/10 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-bv-primary text-white shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-black text-bv-heading">Nova</span>
              <span className="block text-[10px] font-bold text-bv-accent">Trợ lý đọc sách</span>
            </div>
          </div>
          <button
            aria-label="Đóng thanh bên"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-bv-text-muted hover:bg-black/5 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Button
            className="w-full justify-start gap-2.5 rounded-xl border border-bv-primary/25 bg-white py-2.5 text-sm font-black text-bv-primary shadow-xs hover:border-bv-primary hover:bg-[#EBF6F3]"
            onClick={startNewConversation}
            type="button"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Cuộc trò chuyện mới
          </Button>
        </div>

        {/* History List */}
        <div className="bv-scrollbar flex-1 overflow-y-auto px-3 py-1">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-bv-text-muted">
              <History className="h-3.5 w-3.5" />
              Lịch sử hội thoại
            </span>
            <span className="text-[11px] font-bold text-bv-text-muted">
              {historyItems.length}/8
            </span>
          </div>

          {historyMessage ? (
            <p className="mb-2 rounded-lg bg-[#EBF6F3] p-2 text-xs font-bold text-bv-primary" role="status">
              {historyMessage}
            </p>
          ) : null}

          {historyItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-bv-text-muted">
              Chưa có phiên lưu trước đó
            </div>
          ) : (
            <div className="space-y-1">
              {historyItems.map((session) => {
                const isActive = sessionId === session.id;
                const isEditing = editingSessionId === session.id;

                if (isEditing) {
                  return (
                    <div
                      className="rounded-xl border border-bv-primary/30 bg-white p-2"
                      key={session.id}
                    >
                      <input
                        autoFocus
                        className="h-8 w-full rounded-md border border-bv-border bg-white px-2 text-xs font-bold text-bv-ink focus:outline-none focus:ring-1 focus:ring-bv-primary"
                        disabled={isHistoryPending}
                        maxLength={80}
                        minLength={3}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveHistoryTitle(session.id);
                          if (e.key === "Escape") setEditingSessionId(null);
                        }}
                        value={editingTitle}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          aria-label="Lưu tên cuộc trò chuyện"
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-bv-primary px-2 py-1 text-[11px] font-bold text-white hover:bg-bv-primary-dark"
                          disabled={isHistoryPending}
                          onClick={() => saveHistoryTitle(session.id)}
                          type="button"
                        >
                          <Save className="h-3 w-3" />
                        </button>
                        <button
                          aria-label="Hủy đổi tên cuộc trò chuyện"
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-bv-border px-2 py-1 text-[11px] font-bold text-bv-text-muted hover:bg-black/5"
                          disabled={isHistoryPending}
                          onClick={() => setEditingSessionId(null)}
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    className={cn(
                      "group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition duration-150",
                      isActive
                        ? "bg-white font-bold text-bv-primary shadow-xs border border-bv-primary/20"
                        : "text-bv-ink hover:bg-black/5",
                    )}
                    key={session.id}
                  >
                    <button
                      aria-label={`Mở cuộc trò chuyện: ${session.title}`}
                      className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => openHistorySession(session)}
                      type="button"
                    >
                      <MessageSquareText className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{session.title}</span>
                    </button>

                    <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                      <button
                        aria-label={`Đổi tên cuộc trò chuyện: ${session.title}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-bv-text-muted hover:bg-black/5 hover:text-bv-primary"
                        disabled={isHistoryPending}
                        onClick={() => beginRename(session)}
                        title="Đổi tên"
                        type="button"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        aria-label={`Xóa cuộc trò chuyện: ${session.title}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-bv-text-muted hover:bg-red-50 hover:text-red-600"
                        disabled={isHistoryPending}
                        onClick={() => deleteHistorySession(session)}
                        title="Xóa"
                        type="button"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick prompt suggestions in sidebar */}
          <div className="mt-5 border-t border-bv-ink/10 pt-4">
            <span className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-bv-text-muted">
              <Sparkles className="h-3.5 w-3.5 text-bv-gold" />
              Chủ đề đọc nhanh
            </span>
            <div className="space-y-1">
              {ASSISTANT_STORE_QUICK_QUESTIONS.slice(0, 3).map((question) => (
                <button
                  className="w-full truncate rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-bv-text-subtle transition hover:bg-black/5 hover:text-bv-primary"
                  disabled={isSending}
                  key={question.id}
                  onClick={() => void sendMessage(question.query)}
                  type="button"
                >
                  • {question.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Runtime Mode Footer */}
        <div className="border-t border-bv-ink/10 p-3 text-[11px] text-bv-text-muted">
          <div className="flex items-center gap-2 rounded-lg bg-white/70 p-2 border border-bv-ink/5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="truncate">
              {runtimeMode === "external" ? "Thông tin từ BookVerse" : "Tra cứu trong BookVerse"}
            </span>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT AREA (KHU VỰC CHÍNH) */}
      <section className="flex flex-1 flex-col overflow-hidden bg-[#FAF8F2]">
        {/* Top Control Bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-bv-ink/10 bg-white/80 px-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              aria-label="Ẩn/Hiện thanh bên"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-bv-ink/10 text-bv-text-muted transition hover:bg-black/5"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileSidebarOpen(!isMobileSidebarOpen);
                } else {
                  setIsSidebarOpen(!isSidebarOpen);
                }
              }}
              type="button"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-bv-heading">
                Nova · Trợ lý đọc sách
              </h1>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="gap-1.5 rounded-xl text-xs font-bold lg:hidden"
              onClick={startNewConversation}
              size="sm"
              variant="outline"
            >
              <Plus className="h-3.5 w-3.5" />
              Mới
            </Button>
          </div>
        </header>

        {/* Message Stream List */}
        <div
          ref={scrollContainerRef}
          aria-label="Dòng thời gian hội thoại"
          aria-live="polite"
          className="bv-scrollbar flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
        >
          <div className="mx-auto max-w-3xl space-y-5">
            {/* EMPTY STATE: 3 BƯỚC RAG + PROMPT CARDS (Hiển thị mờ, tinh tế ở chính giữa khi chưa chat) */}
            {isConversationEmpty ? (
              <div className="my-auto py-6 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-bv-primary text-white shadow-md shadow-bv-primary/20">
                  <Bot className="h-7 w-7" />
                </div>
                <h2 className="mt-3.5 text-2xl font-black tracking-tight text-bv-heading sm:text-3xl">
                  Chào bạn, mình là Nova
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-bv-text-subtle">
                  Nova có thể tìm sách, tra cứu đơn hàng, giải đáp về gói hội viên và hỗ trợ bạn đọc sách.
                </p>

                {/* Gợi ý thật từ catalog để người dùng có thể bắt đầu ngay. */}
                <p className="mt-6 text-xs font-black uppercase tracking-wider text-bv-text-muted">
                  3 sách để bắt đầu cùng Nova
                </p>
                <div className="mt-2.5 grid gap-3 sm:grid-cols-3">
                  {starterBooks.map((book) => (
                    <article
                      className="overflow-hidden rounded-2xl border border-bv-ink/10 bg-white text-left shadow-xs transition hover:border-bv-primary/40 hover:shadow-md"
                      key={book.id}
                    >
                      <Link className="flex gap-3 p-3" href={`/book/${book.id}`}>
                        <div className="aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg bg-bv-surface">
                          <BookCover
                            alt={`Bìa sách ${book.title}`}
                            author={book.author}
                            bookId={book.id}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            src={book.coverImage}
                            title={book.title}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-xs font-black leading-5 text-bv-heading">
                            {book.title}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-bv-text-muted">
                            {book.author}
                          </p>
                        </div>
                      </Link>
                      <button
                        className="min-h-11 w-full border-t border-bv-ink/10 px-3 text-xs font-black text-bv-primary transition hover:bg-[#EBF6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bv-focus disabled:opacity-50"
                        disabled={isSending}
                        onClick={() => void sendMessage(`Tóm tắt nội dung chính của chương đầu cuốn “${book.title}”.`, book.id)}
                        type="button"
                      >
                        Hỏi Nova về nội dung
                      </button>
                    </article>
                  ))}
                </div>

                {/* Quick Prompts Pills */}
                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-bv-text-muted">
                    Gợi ý câu hỏi phổ biến
                  </p>
                  <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                    {AI_DISCOVERY_PROMPTS.map((prompt) => (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-full border border-bv-ink/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-bv-ink shadow-xs transition hover:border-bv-primary hover:bg-[#EBF6F3] hover:text-bv-primary"
                        disabled={isSending}
                        key={prompt.id}
                        onClick={() => void sendMessage(prompt.query)}
                        type="button"
                      >
                        <Sparkles className="h-3 w-3 text-bv-gold" />
                        <span>{prompt.label}</span>
                        <ChevronRight className="h-3 w-3 opacity-40" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* MESSAGES FLOW */}
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  className={cn(
                    "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                    isUser ? "justify-end" : "justify-start gap-3",
                  )}
                  key={message.id}
                >
                  {/* AI Avatar */}
                  {!isUser ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bv-primary text-white shadow-xs">
                      <Bot className="h-4 w-4" />
                    </div>
                  ) : null}

                  {/* Bubble */}
                  <div
                    className={cn(
                      "group relative max-w-[88%] sm:max-w-[80%]",
                      isUser
                        ? "rounded-2xl rounded-tr-xs bg-bv-primary px-4 py-3 text-white shadow-sm font-medium"
                        : message.isError
                          ? "rounded-2xl rounded-tl-xs border border-red-200 bg-red-50 p-4 text-red-800"
                          : "rounded-2xl rounded-tl-xs border border-bv-ink/10 bg-white p-4 text-bv-ink shadow-xs",
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed sm:text-[15px]">
                      {message.content}
                    </p>

                    {/* Validated Book Recommendations */}
                    {message.response?.validatedBooks?.length ? (
                      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                        {message.response.validatedBooks.map((book) => (
                          <div key={book.id} className="overflow-hidden rounded-2xl border border-bv-ink/10 bg-[#FAF8F2] shadow-xs transition hover:border-bv-primary/40 hover:shadow-sm">
                            <Link
                              className="group/card flex gap-3 p-3 transition hover:bg-[#EBF6F3]"
                              href={book.href}
                            >
                              <div className="aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-lg shadow-xs">
                                <BookCover
                                  alt={`Bìa sách ${book.title}`}
                                  author={book.author}
                                  bookId={book.id}
                                  className="h-full w-full object-cover transition duration-200 group-hover/card:scale-105"
                                  loading="lazy"
                                  src={null}
                                  title={book.title}
                                  useBookVerseArtwork
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="line-clamp-2 text-xs font-black leading-snug text-bv-heading transition group-hover/card:text-bv-primary">
                                  {book.title}
                                </h4>
                                <p className="mt-0.5 truncate text-[11px] text-bv-text-muted">
                                  {book.author}
                                </p>
                                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  <ShieldCheck className="h-3 w-3" />
                                  Có trong kho sách
                                </span>
                              </div>
                            </Link>
                            <button
                              type="button"
                              disabled={isSending}
                              className="flex min-h-10 w-full items-center justify-center border-t border-bv-ink/10 px-3 py-2 text-xs font-bold text-bv-primary transition hover:bg-bv-mint disabled:opacity-50"
                              onClick={() => void sendMessage(`Tóm tắt nội dung chính của chương đầu cuốn “${book.title}”.`, book.id)}
                            >
                              Hỏi Nova về nội dung
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Nguồn tham khảo và phản hồi cho câu trả lời */}
                    {!isUser && message.response ? (
                      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-bv-ink/10 pt-2.5 text-[11px] text-bv-text-muted">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-bv-accent" />
                          <span>
                            {message.response.provider === "local"
                              ? "Thông tin từ BookVerse"
                              : message.response.provider === "mock" ? "Dữ liệu thử nghiệm" : "Thông tin từ BookVerse"}
                          </span>
                        </div>

                        {/* Thumbs Up / Down Feedback */}
                        <div className="flex items-center gap-1">
                          <button
                            aria-label="Câu trả lời hữu ích"
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-emerald-50 hover:text-emerald-700",
                              message.feedback === "HELPFUL" && "bg-emerald-50 text-emerald-700",
                            )}
                            onClick={() => handleFeedback(message, "HELPFUL")}
                            type="button"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            aria-label="Câu trả lời chưa hữu ích"
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-red-50 hover:text-red-700",
                              message.feedback === "NOT_HELPFUL" && "bg-red-50 text-red-700",
                            )}
                            onClick={() => handleFeedback(message, "NOT_HELPFUL")}
                            type="button"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {/* Thinking State */}
            {isSending ? (
              <div className="flex items-center gap-3 animate-in fade-in duration-200">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bv-primary text-white shadow-xs">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-bv-ink/10 bg-white px-4 py-3 text-xs font-bold text-bv-text-muted shadow-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-bv-primary" />
                  Nova đang tìm thông tin để trả lời bạn...
                </div>
              </div>
            ) : null}

            {feedbackError ? (
              <p className="rounded-xl bg-red-50 p-3 text-center text-xs font-bold text-red-700" role="alert">
                {feedbackError}
              </p>
            ) : null}
          </div>
        </div>

        {/* FIXED BOTTOM INPUT BOX (Khung gõ câu hỏi cố định đáy màn hình) */}
        <div className="shrink-0 border-t border-bv-ink/10 bg-white/90 p-3 backdrop-blur-md sm:p-4">
          <div className="mx-auto max-w-3xl">
            <form className="relative flex items-center" onSubmit={handleSubmit}>
              <Input
                aria-describedby="assistant-character-count"
                aria-label="Câu hỏi cho trợ lý BookVerse"
                className="h-12 w-full rounded-2xl border border-bv-ink/20 bg-white pr-14 pl-4 text-sm font-medium text-bv-ink shadow-xs transition placeholder:text-bv-text-muted focus-visible:border-bv-primary focus-visible:ring-2 focus-visible:ring-bv-primary/20"
                disabled={isSending}
                maxLength={MAX_ASSISTANT_MESSAGE_LENGTH}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Ví dụ: Tìm sách nhập môn công nghệ hoặc kiểm tra đơn hàng..."
                type="text"
                value={inputValue}
              />

              <button
                aria-label="Gửi câu hỏi"
                className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-bv-primary text-white shadow-xs transition hover:bg-bv-primary-dark active:scale-95 disabled:cursor-not-allowed disabled:bg-bv-ink/20 disabled:opacity-50"
                disabled={isSending || !inputValue.trim()}
                type="submit"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-bv-text-muted">
              <span>Nova có thể tra cứu sách, giỏ hàng và gói hội viên trong tài khoản của bạn.</span>
              <span id="assistant-character-count">
                {inputValue.length}/{MAX_ASSISTANT_MESSAGE_LENGTH}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

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
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  History,
  LibraryBig,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  Save,
  Search,
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
import { BookCover } from "@/components/shared/BookCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AI_DISCOVERY_PROMPTS } from "@/lib/ai-discovery-prompts";
import { ASSISTANT_STORE_QUICK_QUESTIONS } from "@/lib/assistant-knowledge";
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
    "Xin chào! Mình có thể tìm sách và giải đáp về hội viên, thanh toán Sandbox, đọc Ebook, đơn hàng, chợ sách, tài khoản hoặc chính sách BookVerse. Khi bạn đăng nhập, mình chỉ tra cứu dữ liệu thuộc chính tài khoản của bạn.",
};

interface AssistantPageClientProps {
  initialQuery: string;
  history: AssistantHistorySession[];
}

export function AssistantPageClient({
  initialQuery,
  history,
}: AssistantPageClientProps) {
  const [messages, setMessages] = useState<UiMessage[]>([welcomeMessage]);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState(history);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [isHistoryPending, startHistoryTransition] = useTransition();
  const initialSentRef = useRef(false);

  function startNewConversation() {
    setMessages([welcomeMessage]);
    setSessionId(null);
    setInputValue("");
    setFeedbackError(null);
  }

  function openHistorySession(session: AssistantHistorySession) {
    setMessages(
      session.messages.length > 0
        ? session.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
          }))
        : [welcomeMessage],
    );
    setSessionId(session.id);
    setInputValue("");
    setFeedbackError(null);
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
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-end lg:px-8 lg:py-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
              <BrainCircuit className="h-4 w-4 text-[#F2C14E]" aria-hidden="true" />
              AI Book Discovery
            </div>
            <h1 className="bv-editorial mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Tìm đúng sách bằng một cuộc trò chuyện
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#EAF5F1]">
              Hỏi về sách, quyền hội viên, tiến độ đọc, đơn hàng hoặc cách sử dụng
              nhà sách. Trợ lý đối chiếu kho tri thức và dữ liệu BookVerse trước khi trả lời.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              { icon: BrainCircuit, label: "1. Hiểu ý định", text: "Sách, hội viên, đơn hay hỗ trợ" },
              { icon: LibraryBig, label: "2. Truy xuất dữ liệu", text: "Tri thức nhà sách + catalog RAG" },
              { icon: ShieldCheck, label: "3. Trả lời có căn cứ", text: "Không đoán quyền, đơn hoặc sách" },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <article
                  className="rounded-xl border border-white/18 bg-white/10 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur"
                  key={step.label}
                >
                  <Icon className="h-5 w-5 text-[#F5D98B]" aria-hidden="true" />
                  <h2 className="mt-3 text-sm font-black text-white">{step.label}</h2>
                  <p className="mt-1 text-xs leading-5 text-[#D9EEEA]">{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="bv-card h-fit rounded-lg p-5 lg:sticky lg:top-24">
          <h2 className="text-xl font-black text-[#17202A]">Hỏi trợ lý</h2>
          <button
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#176B62]/20 bg-white px-3 text-sm font-black text-[#176B62] transition hover:bg-[#EDF8F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
            onClick={startNewConversation}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Cuộc trò chuyện mới
          </button>
          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66706B]"
              />
              <Input
                aria-describedby="assistant-character-count"
                aria-label="Câu hỏi cho trợ lý BookVerse"
                className="pl-10"
                disabled={isSending}
                maxLength={MAX_ASSISTANT_MESSAGE_LENGTH}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Ví dụ: Gói hội viên của tôi còn hạn không?"
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

          {historyItems.length > 0 ? (
            <div className="mt-6 border-t border-[#1D2433]/10 pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="inline-flex items-center gap-2 text-sm font-black text-[#17202A]">
                  <History className="h-4 w-4 text-[#C65D43]" aria-hidden="true" />
                  Lịch sử gần đây
                </h3>
                <span className="text-xs font-bold text-[#66706B]">
                  {historyItems.length} phiên
                </span>
              </div>
              {historyMessage ? (
                <p className="mt-3 rounded-lg bg-[#EDF8F5] px-3 py-2 text-xs font-bold text-[#176B62]" role="status">
                  {historyMessage}
                </p>
              ) : null}
              <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1">
                {historyItems.map((session) => (
                  <div
                    className="rounded-xl border border-[#1D2433]/10 bg-[#F8F6F0] p-2"
                    key={session.id}
                  >
                    {editingSessionId === session.id ? (
                      <div className="grid gap-2">
                        <label className="sr-only" htmlFor={`history-title-${session.id}`}>
                          Tên cuộc trò chuyện
                        </label>
                        <input
                          autoFocus
                          className="h-11 min-w-0 rounded-lg border border-[#D8D0C2] bg-white px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                          disabled={isHistoryPending}
                          id={`history-title-${session.id}`}
                          maxLength={80}
                          minLength={3}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveHistoryTitle(session.id);
                            if (event.key === "Escape") setEditingSessionId(null);
                          }}
                          value={editingTitle}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            aria-label="Lưu tên cuộc trò chuyện"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#176B62] px-3 text-xs font-black text-white transition hover:bg-[#104C47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                            disabled={isHistoryPending}
                            onClick={() => saveHistoryTitle(session.id)}
                            type="button"
                          >
                            {isHistoryPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Save className="h-4 w-4" aria-hidden="true" />
                            )}
                            Lưu
                          </button>
                          <button
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#D8D0C2] bg-white px-3 text-xs font-black text-[#17202A] transition hover:bg-[#F1EDE4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                            disabled={isHistoryPending}
                            onClick={() => setEditingSessionId(null)}
                            type="button"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-[1fr_44px_44px] gap-1">
                        <button
                          aria-label={`Mở cuộc trò chuyện: ${session.title}`}
                          className="min-h-11 min-w-0 rounded-lg px-2 py-1 text-left transition hover:bg-[#EAF5F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                          onClick={() => openHistorySession(session)}
                          type="button"
                        >
                          <span className="flex items-start gap-2">
                            <MessageSquareText
                              className="mt-0.5 h-4 w-4 shrink-0 text-[#176B62]"
                              aria-hidden="true"
                            />
                            <span className="min-w-0">
                              <span className="line-clamp-2 block text-sm font-black leading-5 text-[#17202A]">
                                {session.title}
                              </span>
                              <span className="mt-1 block text-xs text-[#66706B]">
                                {new Intl.DateTimeFormat("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                }).format(new Date(session.updatedAt))}
                              </span>
                            </span>
                          </span>
                        </button>
                        <button
                          aria-label={`Đổi tên cuộc trò chuyện: ${session.title}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#176B62] transition hover:bg-[#EAF5F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                          disabled={isHistoryPending}
                          onClick={() => beginRename(session)}
                          title="Đổi tên"
                          type="button"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          aria-label={`Xóa cuộc trò chuyện: ${session.title}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                          disabled={isHistoryPending}
                          onClick={() => deleteHistorySession(session)}
                          title="Xóa"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-[#1D2433]/10 pt-5">
            <h3 className="inline-flex items-center gap-2 text-sm font-black text-[#17202A]">
              <Sparkles className="h-4 w-4 text-[#C65D43]" aria-hidden="true" />
              Chọn nhanh một kiểu đọc
            </h3>
            <div className="mt-3 grid gap-2">
              {ASSISTANT_STORE_QUICK_QUESTIONS.map((question) => (
                <button
                  className="min-h-11 rounded-xl border border-[#176B62]/15 bg-[#EDF8F5] px-3 py-2 text-left transition duration-200 hover:border-[#176B62]/40 hover:bg-[#DFF2ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSending}
                  key={question.id}
                  onClick={() => void sendMessage(question.query)}
                  type="button"
                >
                  <span className="block text-sm font-black text-[#176B62]">{question.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-[#1D2433]/10 pt-5">
            <h3 className="inline-flex items-center gap-2 text-sm font-black text-[#17202A]">
              <Sparkles className="h-4 w-4 text-[#C65D43]" aria-hidden="true" />
              Gợi ý sách theo nhu cầu
            </h3>
            <div className="mt-3 grid gap-2">
              {AI_DISCOVERY_PROMPTS.map((prompt) => (
                <button
                  className="min-h-11 rounded-xl border border-[#1D2433]/10 bg-[#F8F6F0] px-3 py-2 text-left transition duration-200 hover:border-[#176B62]/30 hover:bg-[#EAF5F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSending}
                  key={prompt.id}
                  onClick={() => void sendMessage(prompt.query)}
                  type="button"
                >
                  <span className="block text-sm font-black text-[#1D2433]">{prompt.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-[#687083]">
                    {prompt.description}
                  </span>
                </button>
              ))}
            </div>
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
                      : "Chế độ dự phòng từ dữ liệu BookVerse đã xác minh; không phải phản hồi giả."
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
                      className="group grid min-h-36 grid-cols-[72px_1fr] gap-3 rounded-xl border border-[#17191F]/10 bg-[#FFFDF8] p-3 transition duration-200 hover:border-[#0F766E]/40 hover:bg-[#F8FCFB] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                      href={book.href}
                      key={book.id}
                    >
                      <BookCover
                        alt={`Bìa sách ${book.title}`}
                        author={book.author}
                        bookId={book.id}
                        className="aspect-[2/3] w-[72px] rounded-lg object-cover shadow-sm"
                        loading="lazy"
                        src={null}
                        title={book.title}
                        useBookVerseArtwork
                      />
                      <span className="min-w-0">
                        <span className="line-clamp-2 font-black leading-5 text-[#17202A] group-hover:text-[#176B62]">
                          {book.title}
                        </span>
                        <span className="mt-1 block truncate text-sm text-[#66706B]">
                          {book.author}
                        </span>
                        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#EAF5F1] px-2 py-1 text-xs font-semibold text-[#0F766E]">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Đã xác minh · {book.score.toFixed(3)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {message.response ? (
                <div className="mt-4 border-t border-[#17191F]/10 pt-3">
                  <p className="inline-flex flex-wrap items-center gap-1.5 text-xs text-[#66706B]">
                    <Bot className="h-3.5 w-3.5 text-[#176B62]" aria-hidden="true" />
                    Nội dung do AI hỗ trợ · {message.response.provider} ·{" "}
                    {message.response.source === "vector" ? "Vector RAG" : "Tri thức + Keyword RAG"}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-[#66706B]">Phản hồi này hữu ích?</span>
                    <button
                      aria-label="Câu trả lời hữu ích"
                      className={cn(
                        "inline-flex h-11 w-11 items-center justify-center rounded-full border text-[#66706B] transition duration-200 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]",
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
                        "inline-flex h-11 w-11 items-center justify-center rounded-full border text-[#66706B] transition duration-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]",
                        message.feedback === "NOT_HELPFUL" && "border-red-300 bg-red-50 text-red-700",
                      )}
                      onClick={() => handleFeedback(message, "NOT_HELPFUL")}
                      type="button"
                    >
                      <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
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

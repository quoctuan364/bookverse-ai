import {
  isAssistantApiResponse,
  type AssistantFeedbackValue,
  type AssistantFailureCode,
  type AssistantSuccessResponse,
} from "@/lib/assistant-contract";

export class AssistantClientError extends Error {
  constructor(
    message: string,
    public readonly code: AssistantFailureCode = "SERVICE_UNAVAILABLE",
    public readonly retryable = true,
  ) {
    super(message);
    this.name = "AssistantClientError";
  }
}

export function selectAssistantContextQuery(
  messages: Array<{ role: string; content: string }>,
): string | undefined {
  return [...messages].reverse().find((item) => {
    if (item.role !== "user") return false;
    const text = item.content.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
    return !/\b(cuon nay|sach nay|cuon do|sach do|cuon thu|cuon so|cuon [1-5]|sach [1-5]|tac gia la ai|noi dung the nao|gia bao nhieu|bao nhieu tien|bao nhieu trang|xuat ban nam nao|ngon ngu gi|the loai gi|danh gia bao nhieu|so sanh|re hon|ngan hon|moi hon|hay hon|con cuon nao khac|con sach nao khac|cuon khac|sach khac|goi y them|them cuon|them sach|khac di|loai khac|khong hop|khong thich)\b/.test(text);
  })?.content;
}

export function createAssistantRequestPayload(message: string, sessionId: string | null, contextBookIds: string[] = [], focusedBookId?: string, contextQuery?: string) {
  return { message, ...(sessionId ? { sessionId } : {}), ...(contextBookIds.length ? { contextBookIds: contextBookIds.slice(0, 5) } : {}), ...(focusedBookId ? { focusedBookId } : {}), ...(contextQuery?.trim() ? { contextQuery: contextQuery.trim() } : {}) };
}

export async function requestAssistant(
  message: string,
  sessionId: string | null,
  contextBookIds: string[] = [],
  focusedBookId?: string,
  contextQuery?: string,
): Promise<AssistantSuccessResponse> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createAssistantRequestPayload(message, sessionId, contextBookIds, focusedBookId, contextQuery)),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new AssistantClientError("Không kết nối được với trợ lý. Vui lòng thử lại sau.");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!isAssistantApiResponse(payload)) {
    throw new AssistantClientError("API trợ lý trả dữ liệu không hợp lệ.");
  }
  if (!payload.success) {
    throw new AssistantClientError(payload.message, payload.errorCode, payload.retryable);
  }
  if (!response.ok) {
    throw new AssistantClientError("Trợ lý chưa sẵn sàng. Vui lòng thử lại sau.");
  }
  return payload;
}

export async function submitAssistantFeedback(input: {
  sessionId: string;
  messageId: string;
  value: AssistantFeedbackValue;
}): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new AssistantClientError("Không kết nối được dịch vụ feedback.");
  }
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; message?: string }
    | null;
  if (!response.ok || payload?.success !== true) {
    throw new AssistantClientError(payload?.message ?? "Không thể lưu feedback lúc này.");
  }
}

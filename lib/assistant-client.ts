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

export function createAssistantRequestPayload(message: string, sessionId: string | null) {
  return sessionId ? { message, sessionId } : { message };
}

export async function requestAssistant(
  message: string,
  sessionId: string | null,
): Promise<AssistantSuccessResponse> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createAssistantRequestPayload(message, sessionId)),
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

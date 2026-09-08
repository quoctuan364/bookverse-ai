export const ASSISTANT_CONTRACT_VERSION = "d1";
export const MAX_ASSISTANT_MESSAGE_LENGTH = 1_000;
export const MAX_ASSISTANT_SESSION_ID_LENGTH = 191;
export const MAX_ASSISTANT_FEEDBACK_NOTE_LENGTH = 500;

export type AssistantProvider = "openai" | "gemini" | "local" | "mock";
export type AssistantSource = "vector" | "keyword";

export type AssistantDegradedCode =
  | "AI_PROVIDER_UNAVAILABLE"
  | "EMBEDDING_UNAVAILABLE"
  | "VECTOR_CONTEXT_UNAVAILABLE"
  | "MOCK_ENABLED";

export type AssistantFailureCode =
  | "INVALID_REQUEST"
  | "ACCOUNT_LOCKED"
  | "SESSION_NOT_FOUND"
  | "SESSION_FORBIDDEN"
  | "FEEDBACK_UNAUTHORIZED"
  | "FEEDBACK_FORBIDDEN"
  | "MESSAGE_NOT_FOUND"
  | "SERVICE_UNAVAILABLE";

export interface AssistantValidatedBook {
  id: string;
  title: string;
  author: string;
  description: string | null;
  score: number;
  href: string;
}

export interface AssistantSuccessResponse {
  success: true;
  contractVersion: typeof ASSISTANT_CONTRACT_VERSION;
  answer: string;
  validatedBooks: AssistantValidatedBook[];
  provider: AssistantProvider;
  model: string;
  source: AssistantSource;
  mocked: boolean;
  degraded: boolean;
  sessionId: string;
  assistantMessageId: string;
  errorCode: AssistantDegradedCode | null;
}

export interface AssistantErrorResponse {
  success: false;
  contractVersion: typeof ASSISTANT_CONTRACT_VERSION;
  errorCode: AssistantFailureCode;
  message: string;
  retryable: boolean;
}

export type AssistantApiResponse = AssistantSuccessResponse | AssistantErrorResponse;

const ASSISTANT_DEGRADED_CODES: AssistantDegradedCode[] = [
  "AI_PROVIDER_UNAVAILABLE",
  "EMBEDDING_UNAVAILABLE",
  "VECTOR_CONTEXT_UNAVAILABLE",
  "MOCK_ENABLED",
];

const ASSISTANT_FAILURE_CODES: AssistantFailureCode[] = [
  "INVALID_REQUEST",
  "ACCOUNT_LOCKED",
  "SESSION_NOT_FOUND",
  "SESSION_FORBIDDEN",
  "FEEDBACK_UNAUTHORIZED",
  "FEEDBACK_FORBIDDEN",
  "MESSAGE_NOT_FOUND",
  "SERVICE_UNAVAILABLE",
];

export interface AssistantRequest {
  message: string;
  sessionId?: string;
}

export type AssistantRequestParseResult =
  | { ok: true; value: AssistantRequest }
  | { ok: false; error: AssistantErrorResponse };

export type AssistantFeedbackValue = "HELPFUL" | "NOT_HELPFUL" | "IRRELEVANT";

export interface AssistantFeedbackRequest {
  sessionId: string;
  messageId: string;
  value: AssistantFeedbackValue;
  note: string | null;
}

export type AssistantFeedbackParseResult =
  | { ok: true; value: AssistantFeedbackRequest }
  | { ok: false; error: AssistantErrorResponse };

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function createAssistantError(
  errorCode: AssistantFailureCode,
  message: string,
  retryable = false,
): AssistantErrorResponse {
  return {
    success: false,
    contractVersion: ASSISTANT_CONTRACT_VERSION,
    errorCode,
    message,
    retryable,
  };
}

export function parseAssistantRequestPayload(value: unknown): AssistantRequestParseResult {
  if (!isObject(value) || typeof value.message !== "string") {
    return {
      ok: false,
      error: createAssistantError("INVALID_REQUEST", "Payload chatbot không hợp lệ."),
    };
  }

  const message = value.message.trim();
  if (!message) {
    return {
      ok: false,
      error: createAssistantError("INVALID_REQUEST", "Vui lòng nhập nội dung cần tư vấn."),
    };
  }
  if (message.length > MAX_ASSISTANT_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: createAssistantError(
        "INVALID_REQUEST",
        `Nội dung tối đa ${MAX_ASSISTANT_MESSAGE_LENGTH} ký tự.`,
      ),
    };
  }

  if (value.sessionId !== undefined && typeof value.sessionId !== "string") {
    return {
      ok: false,
      error: createAssistantError("INVALID_REQUEST", "sessionId không hợp lệ."),
    };
  }
  const sessionId = typeof value.sessionId === "string" ? value.sessionId.trim() : "";
  if (sessionId.length > MAX_ASSISTANT_SESSION_ID_LENGTH) {
    return {
      ok: false,
      error: createAssistantError("INVALID_REQUEST", "sessionId vượt quá độ dài cho phép."),
    };
  }

  return {
    ok: true,
    value: {
      message,
      ...(sessionId ? { sessionId } : {}),
    },
  };
}

function parseFeedbackValue(value: unknown): AssistantFeedbackValue | null {
  if (typeof value !== "string") return null;
  switch (value.toUpperCase()) {
    case "HELPFUL":
      return "HELPFUL";
    case "NOT_HELPFUL":
      return "NOT_HELPFUL";
    case "IRRELEVANT":
      return "IRRELEVANT";
    default:
      return null;
  }
}

export function parseAssistantFeedbackPayload(value: unknown): AssistantFeedbackParseResult {
  if (!isObject(value)) {
    return {
      ok: false,
      error: createAssistantError("INVALID_REQUEST", "Payload feedback không hợp lệ."),
    };
  }

  const sessionId = typeof value.sessionId === "string" ? value.sessionId.trim() : "";
  const messageId = typeof value.messageId === "string" ? value.messageId.trim() : "";
  const feedbackValue = parseFeedbackValue(value.value);
  const note = typeof value.note === "string" ? value.note.trim() : "";

  if (!sessionId || !messageId || !feedbackValue) {
    return {
      ok: false,
      error: createAssistantError(
        "INVALID_REQUEST",
        "Thiếu sessionId, messageId hoặc giá trị feedback hợp lệ.",
      ),
    };
  }
  if (
    sessionId.length > MAX_ASSISTANT_SESSION_ID_LENGTH ||
    messageId.length > MAX_ASSISTANT_SESSION_ID_LENGTH ||
    note.length > MAX_ASSISTANT_FEEDBACK_NOTE_LENGTH
  ) {
    return {
      ok: false,
      error: createAssistantError("INVALID_REQUEST", "Feedback vượt quá độ dài cho phép."),
    };
  }

  return {
    ok: true,
    value: {
      sessionId,
      messageId,
      value: feedbackValue,
      note: note || null,
    },
  };
}

function isValidatedBook(value: unknown): value is AssistantValidatedBook {
  if (!isObject(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.author) &&
    (typeof value.description === "string" || value.description === null) &&
    typeof value.score === "number" &&
    Number.isFinite(value.score) &&
    value.href === `/book/${value.id}`
  );
}

export function isAssistantApiResponse(value: unknown): value is AssistantApiResponse {
  if (!isObject(value) || value.contractVersion !== ASSISTANT_CONTRACT_VERSION) return false;

  if (value.success === false) {
    return (
      ASSISTANT_FAILURE_CODES.includes(value.errorCode as AssistantFailureCode) &&
      isNonEmptyString(value.message) &&
      typeof value.retryable === "boolean"
    );
  }

  if (value.success !== true || !Array.isArray(value.validatedBooks)) return false;
  const providerValues: AssistantProvider[] = ["openai", "gemini", "local", "mock"];
  const sourceValues: AssistantSource[] = ["vector", "keyword"];

  return (
    isNonEmptyString(value.answer) &&
    value.validatedBooks.every(isValidatedBook) &&
    providerValues.includes(value.provider as AssistantProvider) &&
    isNonEmptyString(value.model) &&
    sourceValues.includes(value.source as AssistantSource) &&
    typeof value.mocked === "boolean" &&
    typeof value.degraded === "boolean" &&
    isNonEmptyString(value.sessionId) &&
    isNonEmptyString(value.assistantMessageId) &&
    (value.errorCode === null ||
      ASSISTANT_DEGRADED_CODES.includes(value.errorCode as AssistantDegradedCode)) &&
    value.mocked === (value.provider === "mock")
  );
}

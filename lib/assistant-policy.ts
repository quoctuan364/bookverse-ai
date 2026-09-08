import type { AssistantFailureCode } from "@/lib/assistant-contract";

interface SessionAccessInput {
  currentUserId: string | null;
  currentUserLocked: boolean;
  requestedSessionId?: string;
  sessionExists?: boolean;
  sessionUserId?: string | null;
}

interface FeedbackAccessInput {
  currentUserId: string | null;
  currentUserLocked: boolean;
  sessionExists: boolean;
  sessionUserId: string | null;
  messageExists: boolean;
  messageSessionId: string | null;
  requestedSessionId: string;
  messageRole: string | null;
}

export function selectRequestedSessionId(
  currentUserId: string | null,
  requestedSessionId?: string,
): string | undefined {
  // Phiên ẩn danh luôn mới; client không được chiếm lại session bằng ID tự gửi.
  return currentUserId ? requestedSessionId?.trim() || undefined : undefined;
}

export function evaluateSessionAccess(input: SessionAccessInput): AssistantFailureCode | null {
  if (input.currentUserLocked) return "ACCOUNT_LOCKED";
  if (!input.currentUserId || !input.requestedSessionId) return null;
  if (!input.sessionExists) return "SESSION_NOT_FOUND";
  if (input.sessionUserId !== input.currentUserId) return "SESSION_FORBIDDEN";
  return null;
}

export function evaluateFeedbackAccess(input: FeedbackAccessInput): AssistantFailureCode | null {
  if (!input.currentUserId) return "FEEDBACK_UNAUTHORIZED";
  if (input.currentUserLocked) return "ACCOUNT_LOCKED";
  if (!input.sessionExists) return "SESSION_NOT_FOUND";
  if (input.sessionUserId !== input.currentUserId) return "FEEDBACK_FORBIDDEN";
  if (
    !input.messageExists ||
    input.messageSessionId !== input.requestedSessionId ||
    input.messageRole !== "ASSISTANT"
  ) {
    return "MESSAGE_NOT_FOUND";
  }
  return null;
}

export function isDevelopmentMockEnabled(
  nodeEnv: string | undefined,
  configuredValue: string | undefined,
): boolean {
  return nodeEnv !== "production" && configuredValue?.toLowerCase() === "true";
}

export function getAssistantTimeoutMs(configuredValue: string | undefined): number {
  const parsed = Number(configuredValue ?? "8000");
  if (!Number.isFinite(parsed)) return 8_000;
  return Math.min(30_000, Math.max(1_000, Math.round(parsed)));
}

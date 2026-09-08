import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSISTANT_CONTRACT_VERSION,
  MAX_ASSISTANT_MESSAGE_LENGTH,
  isAssistantApiResponse,
  parseAssistantFeedbackPayload,
  parseAssistantRequestPayload,
  type AssistantSuccessResponse,
  type AssistantValidatedBook,
} from "@/lib/assistant-contract";
import { createAssistantRequestPayload } from "@/lib/assistant-client";
import {
  evaluateFeedbackAccess,
  evaluateSessionAccess,
  getAssistantTimeoutMs,
  isDevelopmentMockEnabled,
  selectRequestedSessionId,
} from "@/lib/assistant-policy";
import {
  buildDevelopmentMockAnswer,
  buildGroundedLocalAnswer,
  runWithAssistantFallback,
  sanitizeAssistantLog,
} from "@/lib/assistant-runtime";

const validatedBook: AssistantValidatedBook = {
  id: "B001",
  title: "Nhập môn AI",
  author: "BookVerse Test",
  description: "Sách nhập môn.",
  score: 0.9,
  href: "/book/B001",
};

test("client lược bỏ sessionId khi bắt đầu hội thoại mới", () => {
  assert.deepEqual(createAssistantRequestPayload("sách AI", null), { message: "sách AI" });
  assert.deepEqual(createAssistantRequestPayload("sách AI", "S1"), {
    message: "sách AI",
    sessionId: "S1",
  });
});

function successResponse(): AssistantSuccessResponse {
  return {
    success: true,
    contractVersion: ASSISTANT_CONTRACT_VERSION,
    answer: "Bạn có thể xem Nhập môn AI.",
    validatedBooks: [validatedBook],
    provider: "local",
    model: "local-catalog-v1",
    source: "keyword",
    mocked: false,
    degraded: true,
    sessionId: "session-1",
    assistantMessageId: "message-1",
    errorCode: "AI_PROVIDER_UNAVAILABLE",
  };
}

test("request parser trim dữ liệu và giới hạn độ dài", () => {
  const parsed = parseAssistantRequestPayload({ message: "  sách AI  ", sessionId: "  s1  " });
  assert.deepEqual(parsed, { ok: true, value: { message: "sách AI", sessionId: "s1" } });

  const tooLong = parseAssistantRequestPayload({
    message: "x".repeat(MAX_ASSISTANT_MESSAGE_LENGTH + 1),
  });
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) assert.equal(tooLong.error.errorCode, "INVALID_REQUEST");
});

test("request parser từ chối payload rỗng hoặc sai kiểu", () => {
  for (const payload of [null, {}, { message: "" }, { message: 123 }, { message: "ok", sessionId: 1 }]) {
    const parsed = parseAssistantRequestPayload(payload);
    assert.equal(parsed.ok, false);
  }
});

test("feedback parser yêu cầu session, assistant message và note hữu hạn", () => {
  const parsed = parseAssistantFeedbackPayload({
    sessionId: "s1",
    messageId: "m1",
    value: "helpful",
    note: "  đúng nhu cầu  ",
  });
  assert.deepEqual(parsed, {
    ok: true,
    value: { sessionId: "s1", messageId: "m1", value: "HELPFUL", note: "đúng nhu cầu" },
  });
  assert.equal(parseAssistantFeedbackPayload({ sessionId: "s1", value: "HELPFUL" }).ok, false);
});

test("contract success chỉ nhận Book đã xác minh với href khớp ID", () => {
  const response = successResponse();
  assert.equal(isAssistantApiResponse(response), true);
  assert.equal(
    isAssistantApiResponse({
      ...response,
      validatedBooks: [{ ...validatedBook, href: "/book/ID-KHAC" }],
    }),
    false,
  );
  assert.equal(isAssistantApiResponse({ ...response, mocked: true, provider: "local" }), false);
});

test("contract error không làm lộ detail nội bộ", () => {
  const payload = {
    success: false,
    contractVersion: ASSISTANT_CONTRACT_VERSION,
    errorCode: "SERVICE_UNAVAILABLE",
    message: "Vui lòng thử lại sau.",
    retryable: true,
  };
  assert.equal(isAssistantApiResponse(payload), true);
  assert.equal("detail" in payload, false);
  assert.equal(isAssistantApiResponse({ ...payload, errorCode: "UNKNOWN_INTERNAL_ERROR" }), false);
});

test("anonymous không được tái sử dụng sessionId do client gửi", () => {
  assert.equal(selectRequestedSessionId(null, "session-cua-user"), undefined);
  assert.equal(selectRequestedSessionId("U001", " session-1 "), "session-1");
});

test("session policy phân biệt locked, missing, owner và non-owner", () => {
  assert.equal(
    evaluateSessionAccess({ currentUserId: "U1", currentUserLocked: true }),
    "ACCOUNT_LOCKED",
  );
  assert.equal(
    evaluateSessionAccess({
      currentUserId: "U1",
      currentUserLocked: false,
      requestedSessionId: "S1",
      sessionExists: false,
    }),
    "SESSION_NOT_FOUND",
  );
  assert.equal(
    evaluateSessionAccess({
      currentUserId: "U1",
      currentUserLocked: false,
      requestedSessionId: "S1",
      sessionExists: true,
      sessionUserId: "U2",
    }),
    "SESSION_FORBIDDEN",
  );
  assert.equal(
    evaluateSessionAccess({
      currentUserId: "U1",
      currentUserLocked: false,
      requestedSessionId: "S1",
      sessionExists: true,
      sessionUserId: "U1",
    }),
    null,
  );
});

test("feedback policy chỉ cho owner đánh giá assistant message đúng session", () => {
  const base = {
    currentUserId: "U1",
    currentUserLocked: false,
    sessionExists: true,
    sessionUserId: "U1",
    messageExists: true,
    messageSessionId: "S1",
    requestedSessionId: "S1",
    messageRole: "ASSISTANT",
  };
  assert.equal(evaluateFeedbackAccess(base), null);
  assert.equal(evaluateFeedbackAccess({ ...base, currentUserId: null }), "FEEDBACK_UNAUTHORIZED");
  assert.equal(evaluateFeedbackAccess({ ...base, sessionUserId: "U2" }), "FEEDBACK_FORBIDDEN");
  assert.equal(evaluateFeedbackAccess({ ...base, messageRole: "USER" }), "MESSAGE_NOT_FOUND");
  assert.equal(evaluateFeedbackAccess({ ...base, messageSessionId: "S2" }), "MESSAGE_NOT_FOUND");
});

test("mock bị vô hiệu tuyệt đối ở production và chỉ bật bằng flag", () => {
  assert.equal(isDevelopmentMockEnabled("production", "true"), false);
  assert.equal(isDevelopmentMockEnabled("development", "true"), true);
  assert.equal(isDevelopmentMockEnabled("test", "false"), false);
  assert.equal(isDevelopmentMockEnabled(undefined, undefined), false);
});

test("timeout provider được clamp trong khoảng an toàn", () => {
  assert.equal(getAssistantTimeoutMs("50"), 1_000);
  assert.equal(getAssistantTimeoutMs("9000"), 9_000);
  assert.equal(getAssistantTimeoutMs("999999"), 30_000);
  assert.equal(getAssistantTimeoutMs("invalid"), 8_000);
});

test("local fallback chỉ nêu Book đã xác minh và ghi rõ không phải mock", () => {
  const answer = buildGroundedLocalAnswer("sách AI", [validatedBook]);
  assert.match(answer, /Nhập môn AI/);
  assert.match(answer, /không phải phản hồi AI giả/);
  assert.doesNotMatch(answer, /B999/);
});

test("development mock có nhãn rõ và log sanitizer che connection string", () => {
  assert.match(buildDevelopmentMockAnswer("AI", [validatedBook]), /^\[DEV MOCK\]/);
  const sanitized = sanitizeAssistantLog(
    new Error(
      "connect postgresql://user:secret@localhost:5432/db?key=abc token=token-value Bearer bearer-value",
    ),
  );
  assert.doesNotMatch(sanitized, /secret@|user:|abc|token-value|bearer-value/);
  assert.match(sanitized, /REDACTED/);
});

test("provider timeout chuyển sang fallback thay vì làm văng request", async () => {
  const result = await runWithAssistantFallback(
    async () => {
      throw new DOMException("Provider timeout", "TimeoutError");
    },
    () => Promise.resolve("local-fallback"),
  );
  assert.equal(result, "local-fallback");
});

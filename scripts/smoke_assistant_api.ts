import assert from "node:assert/strict";

import { isAssistantApiResponse } from "@/lib/assistant-contract";
import { assertSafeDatabase } from "@/lib/database-safety";
import prisma from "@/lib/prisma";

async function main(): Promise<void> {
  const target = assertSafeDatabase({
    operation: "destructive",
    databaseUrl: process.env.DATABASE_URL,
    allowedDatabases: process.env.ALLOWED_DESTRUCTIVE_DATABASES,
  });
  assert.equal(target.databaseName, "bookverse_ai_test");
  const apiBaseUrl = process.env.ASSISTANT_API_URL ?? "http://127.0.0.1:3100";
  const marker = `D-API-SMOKE-${Date.now()}-${process.pid}`;
  let sessionId: string | null = null;

  try {
    const response = await fetch(`${apiBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `${marker} sách AI`, sessionId: "client-anonymous-id" }),
    });
    const payload: unknown = await response.json();
    assert.equal(response.status, 200);
    assert.ok(isAssistantApiResponse(payload) && payload.success);
    sessionId = payload.sessionId;
    assert.equal(payload.mocked, false);
    assert.equal(payload.provider, "local");
    assert.equal(payload.degraded, true);
    assert.ok(payload.validatedBooks.length > 0);

    const invalidResponse = await fetch(`${apiBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });
    const invalidPayload: unknown = await invalidResponse.json();
    assert.equal(invalidResponse.status, 400);
    assert.ok(isAssistantApiResponse(invalidPayload) && !invalidPayload.success);
    if (isAssistantApiResponse(invalidPayload) && !invalidPayload.success) {
      assert.equal(invalidPayload.errorCode, "INVALID_REQUEST");
    }

    const feedbackResponse = await fetch(`${apiBaseUrl}/api/chat/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: payload.sessionId,
        messageId: payload.assistantMessageId,
        value: "HELPFUL",
      }),
    });
    const feedbackPayload: unknown = await feedbackResponse.json();
    assert.equal(feedbackResponse.status, 401);
    assert.ok(isAssistantApiResponse(feedbackPayload) && !feedbackPayload.success);
    if (isAssistantApiResponse(feedbackPayload) && !feedbackPayload.success) {
      assert.equal(feedbackPayload.errorCode, "FEEDBACK_UNAUTHORIZED");
    }

    const stored = await prisma.chatbotSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, messages: { select: { role: true } } },
    });
    assert.equal(stored?.userId, null);
    assert.equal(stored?.messages.length, 2);
    console.log(
      JSON.stringify(
        {
          status: "PASS",
          httpStatus: response.status,
          contractVersion: payload.contractVersion,
          provider: payload.provider,
          source: payload.source,
          mocked: payload.mocked,
          degraded: payload.degraded,
          validatedBookCount: payload.validatedBooks.length,
          invalidPayloadStatus: invalidResponse.status,
          anonymousFeedbackStatus: feedbackResponse.status,
          persistedMessageCount: stored?.messages.length,
        },
        null,
        2,
      ),
    );
  } finally {
    if (sessionId) await prisma.chatbotSession.deleteMany({ where: { id: sessionId } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Assistant API smoke thất bại.";
  console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
  process.exitCode = 1;
});

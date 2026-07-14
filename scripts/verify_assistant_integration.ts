import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertSafeDatabase } from "@/lib/database-safety";
import type { CurrentUserSession } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { AssistantServiceError, runAssistantMessage } from "@/lib/assistant-service";

interface Counts {
  sessions: number;
  messages: number;
  feedback: number;
}

async function getCounts(): Promise<Counts> {
  const [sessions, messages, feedback] = await Promise.all([
    prisma.chatbotSession.count(),
    prisma.chatbotMessage.count(),
    prisma.chatbotFeedback.count(),
  ]);
  return { sessions, messages, feedback };
}

async function writeReport(report: Record<string, unknown>): Promise<string> {
  const directory = path.resolve(process.cwd(), "outputs", "assistant");
  await mkdir(directory, { recursive: true });
  const stem = new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
  const reportPath = path.join(directory, `${stem}-assistant-integration.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  return reportPath;
}

async function expectServiceError(
  action: () => Promise<unknown>,
  expectedCode: string,
): Promise<void> {
  try {
    await action();
    assert.fail(`Phải trả lỗi ${expectedCode}.`);
  } catch (error: unknown) {
    assert.ok(error instanceof AssistantServiceError);
    assert.equal(error.code, expectedCode);
  }
}

async function main(): Promise<void> {
  const target = assertSafeDatabase({
    operation: "destructive",
    databaseUrl: process.env.DATABASE_URL,
    allowedDatabases: process.env.ALLOWED_DESTRUCTIVE_DATABASES,
  });
  assert.equal(
    target.databaseName,
    "bookverse_ai_test",
    "Assistant integration chỉ được chạy trên bookverse_ai_test.",
  );

  const users = await prisma.user.findMany({
    where: { isLocked: false },
    orderBy: { id: "asc" },
    take: 2,
    select: { id: true, role: true, name: true, email: true, isLocked: true },
  });
  assert.equal(users.length, 2, "Test database cần tối thiểu hai user không bị khóa.");
  const owner: CurrentUserSession = users[0];
  const otherUser: CurrentUserSession = users[1];
  const lockedUser: CurrentUserSession = { ...users[0], isLocked: true };
  const before = await getCounts();
  const createdSessionIds: string[] = [];
  const previousEnvironment = {
    llmProvider: process.env.BOOKVERSE_LLM_PROVIDER,
    embeddingProvider: process.env.BOOKVERSE_EMBEDDING_PROVIDER,
    mockEnabled: process.env.BOOKVERSE_CHAT_MOCK_ENABLED,
    openAiKey: process.env.OPENAI_API_KEY,
    geminiKey: process.env.GEMINI_API_KEY,
  };

  try {
    process.env.BOOKVERSE_LLM_PROVIDER = "local";
    process.env.BOOKVERSE_EMBEDDING_PROVIDER = "openai";
    process.env.BOOKVERSE_CHAT_MOCK_ENABLED = "false";
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const first = await runAssistantMessage({
      message: "Gợi ý sách AI cho người mới",
      currentUser: owner,
    });
    createdSessionIds.push(first.sessionId);
    assert.equal(first.provider, "local");
    assert.equal(first.source, "keyword");
    assert.equal(first.mocked, false);
    assert.equal(first.degraded, true);
    assert.equal(first.errorCode, "AI_PROVIDER_UNAVAILABLE");
    assert.ok(first.validatedBooks.length > 0);

    const returnedBookIds = first.validatedBooks.map((book) => book.id);
    const existingBookCount = await prisma.book.count({ where: { id: { in: returnedBookIds } } });
    assert.equal(existingBookCount, returnedBookIds.length, "Response có Book ID không tồn tại.");

    const continued = await runAssistantMessage({
      message: "Ưu tiên sách dễ đọc",
      sessionId: first.sessionId,
      currentUser: owner,
    });
    assert.equal(continued.sessionId, first.sessionId, "Owner phải tiếp tục đúng session.");

    await expectServiceError(
      () =>
        runAssistantMessage({
          message: "Thử chiếm session",
          sessionId: first.sessionId,
          currentUser: otherUser,
        }),
      "SESSION_FORBIDDEN",
    );
    await expectServiceError(
      () => runAssistantMessage({ message: "Tài khoản khóa", currentUser: lockedUser }),
      "ACCOUNT_LOCKED",
    );

    const anonymous = await runAssistantMessage({
      message: "Sách kinh doanh",
      sessionId: first.sessionId,
      currentUser: null,
    });
    createdSessionIds.push(anonymous.sessionId);
    assert.notEqual(anonymous.sessionId, first.sessionId, "Anonymous không được reuse session client gửi.");
    const anonymousSession = await prisma.chatbotSession.findUnique({
      where: { id: anonymous.sessionId },
      select: { userId: true },
    });
    assert.equal(anonymousSession?.userId, null);

    const during = await getCounts();
    assert.equal(during.sessions, before.sessions + 2);
    assert.equal(during.messages, before.messages + 6);
    assert.equal(during.feedback, before.feedback);

    await prisma.chatbotSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    createdSessionIds.length = 0;
    const after = await getCounts();
    assert.deepEqual(after, before, "Cleanup phải đưa count chatbot về baseline.");

    const report = {
      status: "PASS",
      databaseName: target.databaseName,
      contractVersion: first.contractVersion,
      provider: first.provider,
      source: first.source,
      mocked: first.mocked,
      degraded: first.degraded,
      validatedBookCount: first.validatedBooks.length,
      ownerContinuation: true,
      nonOwnerBlocked: true,
      lockedUserBlocked: true,
      anonymousSessionIsolated: true,
      before,
      during,
      after,
      countsRestored: JSON.stringify(before) === JSON.stringify(after),
    };
    const reportPath = await writeReport(report);
    console.log("[PASS] Assistant integration trên bookverse_ai_test");
    console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (createdSessionIds.length > 0) {
      await prisma.chatbotSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    }
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore("BOOKVERSE_LLM_PROVIDER", previousEnvironment.llmProvider);
    restore("BOOKVERSE_EMBEDDING_PROVIDER", previousEnvironment.embeddingProvider);
    restore("BOOKVERSE_CHAT_MOCK_ENABLED", previousEnvironment.mockEnabled);
    restore("OPENAI_API_KEY", previousEnvironment.openAiKey);
    restore("GEMINI_API_KEY", previousEnvironment.geminiKey);
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Lỗi assistant integration không xác định.";
  console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
  process.exitCode = 1;
});

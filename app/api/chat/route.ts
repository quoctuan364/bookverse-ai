import { NextResponse } from "next/server";

import {
  createAssistantError,
  parseAssistantRequestPayload,
  type AssistantSuccessResponse,
} from "@/lib/assistant-contract";
import { sanitizeAssistantLog } from "@/lib/assistant-runtime";
import { AssistantServiceError, runAssistantMessage } from "@/lib/assistant-service";
import { getCurrentUser } from "@/lib/permissions";

function buildStreamResponse(payload: AssistantSuccessResponse): Response {
  const encoder = new TextEncoder();
  const chunks = payload.answer.match(/.{1,42}(\s|$)/g) ?? [payload.answer];
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `event: meta\ndata: ${JSON.stringify({
            contractVersion: payload.contractVersion,
            sessionId: payload.sessionId,
            assistantMessageId: payload.assistantMessageId,
            provider: payload.provider,
            model: payload.model,
            source: payload.source,
            mocked: payload.mocked,
            degraded: payload.degraded,
            errorCode: payload.errorCode,
            validatedBooks: payload.validatedBooks,
          })}\n\n`,
        ),
      );
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ token: chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  try {
    const rawPayload: unknown = await request.json().catch(() => null);
    const parsed = parseAssistantRequestPayload(rawPayload);
    if (!parsed.ok) return NextResponse.json(parsed.error, { status: 400 });

    const currentUser = await getCurrentUser();
    const response = await runAssistantMessage({
      ...parsed.value,
      currentUser,
    });
    const requestUrl = new URL(request.url);
    const wantsStream =
      requestUrl.searchParams.get("stream") === "1" ||
      request.headers.get("accept")?.includes("text/event-stream");
    return wantsStream
      ? buildStreamResponse(response)
      : NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AssistantServiceError) {
      return NextResponse.json(
        createAssistantError(error.code, error.message, error.retryable),
        { status: error.status },
      );
    }

    console.error(`[api/chat] ${sanitizeAssistantLog(error)}`);
    return NextResponse.json(
      createAssistantError(
        "SERVICE_UNAVAILABLE",
        "Trợ lý chưa kết nối được dữ liệu lúc này. Vui lòng thử lại sau.",
        true,
      ),
      { status: 503 },
    );
  }
}

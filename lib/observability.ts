import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, boolean | number | string | null | undefined>;

const SENSITIVE_FIELD_PATTERN = /authorization|cookie|email|password|secret|token/i;

function cleanText(value: string, maxLength = 240): string {
  return value.replace(/[\r\n\t]+/gu, " ").trim().slice(0, maxLength);
}

export function sanitizeLogFields(fields: LogFields = {}): Record<string, boolean | number | string | null> {
  const safeFields: Record<string, boolean | number | string | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || SENSITIVE_FIELD_PATTERN.test(key)) continue;
    safeFields[key] = typeof value === "string" ? cleanText(value) : value;
  }
  return safeFields;
}

export function errorMessageForLog(error: unknown): string {
  if (error instanceof Error) return cleanText(error.message || error.name);
  return cleanText(String(error));
}

export function writeServerLog(level: LogLevel, event: string, fields: LogFields = {}): void {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event: cleanText(event, 80),
    ...sanitizeLogFields(fields),
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

function readRequestId(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && /^[a-zA-Z0-9._-]{8,80}$/u.test(supplied) ? supplied : randomUUID();
}

export async function observeApiRoute(
  request: Request,
  route: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const requestId = readRequestId(request);
  const startedAt = performance.now();

  try {
    const response = await handler();
    const durationMs = Math.round(performance.now() - startedAt);
    response.headers.set("x-request-id", requestId);
    response.headers.set("server-timing", `app;dur=${durationMs}`);

    if (response.status >= 500 || durationMs >= 2_000) {
      writeServerLog(response.status >= 500 ? "error" : "warn", "api.request.completed", {
        requestId,
        route,
        method: request.method,
        status: response.status,
        durationMs,
      });
    }

    return response;
  } catch (error: unknown) {
    writeServerLog("error", "api.request.unhandled", {
      requestId,
      route,
      method: request.method,
      durationMs: Math.round(performance.now() - startedAt),
      error: errorMessageForLog(error),
    });
    throw error;
  }
}

export type IntegrationReadinessStatus = "READY" | "PARTIAL" | "MISSING";

export interface IntegrationReadinessItem {
  id: string;
  name: string;
  status: IntegrationReadinessStatus;
  summary: string;
  envKeys: string[];
}

type IntegrationEnvironment = Readonly<Record<string, string | undefined>>;

function hasValue(environment: IntegrationEnvironment, key: string): boolean {
  return Boolean(environment[key]?.trim());
}

function pairStatus(
  environment: IntegrationEnvironment,
  first: string,
  second: string,
): IntegrationReadinessStatus {
  const count = Number(hasValue(environment, first)) + Number(hasValue(environment, second));
  if (count === 2) return "READY";
  if (count === 1) return "PARTIAL";
  return "MISSING";
}

export function buildIntegrationReadiness(
  environment: IntegrationEnvironment,
  databaseReachable: boolean,
): IntegrationReadinessItem[] {
  const emailStatus = pairStatus(
    environment,
    "BOOKVERSE_PASSWORD_RESET_WEBHOOK_URL",
    "BOOKVERSE_PASSWORD_RESET_WEBHOOK_TOKEN",
  );
  const aiServiceStatus = pairStatus(
    environment,
    "AI_SERVICE_URL",
    "BOOKVERSE_AI_SERVICE_TOKEN",
  );
  const provider = environment.BOOKVERSE_LLM_PROVIDER?.trim().toLowerCase() || "local";
  const openAiReady = hasValue(environment, "OPENAI_API_KEY");
  const geminiReady = hasValue(environment, "GEMINI_API_KEY");
  const selectedProviderReady =
    provider === "openai"
      ? openAiReady
      : provider === "gemini"
        ? geminiReady
        : true;
  const externalProviderReady = openAiReady || geminiReady;
  const llmStatus: IntegrationReadinessStatus = selectedProviderReady
    ? externalProviderReady
      ? "READY"
      : "PARTIAL"
    : "MISSING";
  const appUrl = environment.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  const appUrlReady = appUrl.startsWith("https://");

  return [
    {
      id: "database",
      name: "PostgreSQL + pgvector",
      status: databaseReachable ? "READY" : "MISSING",
      summary: databaseReachable
        ? "Ứng dụng kết nối được database hiện tại."
        : "Không thể thực hiện truy vấn kiểm tra database.",
      envKeys: ["DATABASE_URL"],
    },
    {
      id: "email",
      name: "Email đặt lại mật khẩu",
      status: emailStatus,
      summary:
        emailStatus === "READY"
          ? "Webhook HTTPS và token giao email đã được cấu hình."
          : "Production cần webhook HTTPS và token bí mật để gửi link đặt lại mật khẩu.",
      envKeys: [
        "BOOKVERSE_PASSWORD_RESET_WEBHOOK_URL",
        "BOOKVERSE_PASSWORD_RESET_WEBHOOK_TOKEN",
      ],
    },
    {
      id: "llm",
      name: "LLM cho chatbot",
      status: llmStatus,
      summary:
        llmStatus === "READY"
          ? `Provider ${provider} đã có khóa; fallback nội bộ vẫn sẵn sàng.`
          : llmStatus === "PARTIAL"
            ? "Local grounded RAG đang hoạt động; chưa có khóa OpenAI/Gemini."
            : `Provider ${provider} được chọn nhưng chưa có API key tương ứng.`,
      envKeys: [
        "BOOKVERSE_LLM_PROVIDER",
        "OPENAI_API_KEY",
        "GEMINI_API_KEY",
      ],
    },
    {
      id: "ai-service",
      name: "Recommendation AI Service",
      status: aiServiceStatus,
      summary:
        aiServiceStatus === "READY"
          ? "Đã có URL và service token cho FastAPI."
          : "Cần URL FastAPI và service token đủ mạnh để chạy production.",
      envKeys: ["AI_SERVICE_URL", "BOOKVERSE_AI_SERVICE_TOKEN"],
    },
    {
      id: "app-origin",
      name: "Domain ứng dụng",
      status: appUrlReady ? "READY" : appUrl ? "PARTIAL" : "MISSING",
      summary: appUrlReady
        ? "Origin HTTPS đã được cấu hình."
        : "Local HTTP dùng được khi phát triển; production bắt buộc domain HTTPS.",
      envKeys: ["NEXT_PUBLIC_APP_URL"],
    },
  ];
}

import { pathToFileURL } from "node:url";

const PLACEHOLDER_PATTERN = /(?:change[-_ ]?me|replace[-_ ]?me|your[_-]|example|default|bookverse[-_ ]?secret)/iu;

function requireValue(environment, name) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required in production.`);
  }
  return value;
}

function rejectPlaceholder(name, value) {
  if (PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(`${name} must not use a placeholder or default value.`);
  }
}

function requireHttpsUrl(environment, name) {
  const value = requireValue(environment, name);
  rejectPlaceholder(name, value);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(`${name} must use HTTPS and must not contain URL credentials.`);
  }
  return parsed;
}

export function validateProductionEnvironment(environment = process.env) {
  if (environment.NODE_ENV !== "production") {
    return { skipped: true };
  }

  const authSecret = requireValue(environment, "AUTH_SECRET");
  rejectPlaceholder("AUTH_SECRET", authSecret);
  if (authSecret.length < 32 || new Set(authSecret).size < 12) {
    throw new Error("AUTH_SECRET must be at least 32 characters and must not be low-entropy.");
  }

  const databaseUrl = requireValue(environment, "DATABASE_URL");
  rejectPlaceholder("DATABASE_URL", databaseUrl);
  let parsedDatabaseUrl;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }
  if (!parsedDatabaseUrl.username || !parsedDatabaseUrl.password) {
    throw new Error("DATABASE_URL must include a username and password in production.");
  }
  rejectPlaceholder("DATABASE_URL password", parsedDatabaseUrl.password);
  if (parsedDatabaseUrl.password.length < 16) {
    throw new Error("DATABASE_URL password must be at least 16 characters in production.");
  }

  if (environment.BOOKVERSE_CHAT_MOCK_ENABLED?.trim().toLowerCase() === "true") {
    throw new Error("BOOKVERSE_CHAT_MOCK_ENABLED must be false in production.");
  }

  requireHttpsUrl(environment, "NEXT_PUBLIC_APP_URL");
  requireHttpsUrl(environment, "BOOKVERSE_PASSWORD_RESET_WEBHOOK_URL");
  const resetWebhookToken = requireValue(environment, "BOOKVERSE_PASSWORD_RESET_WEBHOOK_TOKEN");
  rejectPlaceholder("BOOKVERSE_PASSWORD_RESET_WEBHOOK_TOKEN", resetWebhookToken);
  if (resetWebhookToken.length < 32 || new Set(resetWebhookToken).size < 12) {
    throw new Error("BOOKVERSE_PASSWORD_RESET_WEBHOOK_TOKEN must be at least 32 characters and must not be low-entropy.");
  }

  if (environment.BOOKVERSE_SHOW_RESET_LINK?.trim().toLowerCase() === "true") {
    throw new Error("BOOKVERSE_SHOW_RESET_LINK must not be enabled in production.");
  }

  const aiServiceToken = requireValue(environment, "BOOKVERSE_AI_SERVICE_TOKEN");
  rejectPlaceholder("BOOKVERSE_AI_SERVICE_TOKEN", aiServiceToken);
  if (aiServiceToken.length < 32 || new Set(aiServiceToken).size < 12) {
    throw new Error("BOOKVERSE_AI_SERVICE_TOKEN must be at least 32 characters and must not be low-entropy.");
  }

  const aiAllowedOrigins = requireValue(environment, "BOOKVERSE_AI_ALLOWED_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (aiAllowedOrigins.length === 0) {
    throw new Error("BOOKVERSE_AI_ALLOWED_ORIGINS must contain at least one HTTPS origin.");
  }
  for (const origin of aiAllowedOrigins) {
    requireHttpsUrl({ ORIGIN: origin }, "ORIGIN");
  }

  return { skipped: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    validateProductionEnvironment();
    console.log("[production-env] VERIFIED: required production secrets passed policy checks.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Production environment validation failed.";
    console.error(`[production-env] FAILED: ${message}`);
    process.exitCode = 1;
  }
}

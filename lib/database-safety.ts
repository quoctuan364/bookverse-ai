export type DatabaseOperation = "read-only" | "destructive";

export interface DatabaseSafetyOptions {
  operation: DatabaseOperation;
  databaseUrl?: string;
  allowedDatabases?: string;
}

export interface SafeDatabaseTarget {
  databaseName: string;
  maskedUrl: string;
  operation: DatabaseOperation;
}

function parseAllowedDatabases(value?: string): string[] {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      value
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function parseDatabaseUrl(databaseUrl?: string): { databaseName: string; maskedUrl: string } {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database safety checks.");
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is invalid and could not be parsed safely.");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, "").split("/")[0] ?? "").trim();
  if (!databaseName) {
    throw new Error("DATABASE_URL does not contain a database name.");
  }

  return {
    databaseName,
    maskedUrl: parsed.protocol + "//***:***@***:***/" + databaseName,
  };
}

export function assertSafeDatabase(options: DatabaseSafetyOptions): SafeDatabaseTarget {
  const target = parseDatabaseUrl(options.databaseUrl);

  if (options.operation === "read-only") {
    return { ...target, operation: options.operation };
  }

  const allowedDatabases = parseAllowedDatabases(
    options.allowedDatabases ?? process.env.ALLOWED_DESTRUCTIVE_DATABASES,
  );

  if (!allowedDatabases.includes(target.databaseName)) {
    const allowedLabel = allowedDatabases.length > 0 ? allowedDatabases.join(", ") : "(none)";
    throw new Error(
      'Refusing destructive operation on database "' +
        target.databaseName +
        '". Allowed databases: ' +
        allowedLabel +
        ".",
    );
  }

  return { ...target, operation: options.operation };
}

export function getAllowedDestructiveDatabases(value?: string): string[] {
  return parseAllowedDatabases(value ?? process.env.ALLOWED_DESTRUCTIVE_DATABASES);
}

export type MigrationClassification =
  | "APPLIED_VALID"
  | "APPLIED_HISTORY_MISSING"
  | "APPLIED_SCHEMA_INCOMPLETE"
  | "PENDING"
  | "FAILED"
  | "CHECKSUM_MISMATCH"
  | "UNKNOWN";

export type ExpectedSchemaObjectKind =
  | "extension"
  | "enum"
  | "enum-value"
  | "table"
  | "column"
  | "column-nullability"
  | "column-default"
  | "index"
  | "constraint";

export interface ExpectedSchemaObject {
  kind: ExpectedSchemaObjectKind;
  name: string;
  table?: string;
  detail?: string;
}

export interface MigrationClassificationInput {
  expectedObjectCount: number;
  validObjectCount: number;
  hasSuccessfulHistory: boolean;
  hasActiveFailure: boolean;
  checksumMatches: boolean;
}

function uniqueObjects(objects: ExpectedSchemaObject[]): ExpectedSchemaObject[] {
  const seen = new Set<string>();
  return objects.filter((object) => {
    const key = [object.kind, object.table ?? "", object.name, object.detail ?? ""].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Parser có chủ đích cho SQL migration hiện tại; không thực thi hoặc sửa SQL. */
export function extractExpectedSchemaObjects(sql: string): ExpectedSchemaObject[] {
  const objects: ExpectedSchemaObject[] = [];
  for (const match of sql.matchAll(/CREATE EXTENSION(?: IF NOT EXISTS)?\s+"?([\w-]+)"?/gi)) {
    objects.push({ kind: "extension", name: match[1] });
  }

  for (const match of sql.matchAll(/CREATE TYPE\s+"([^"]+)"\s+AS ENUM\s*\(([\s\S]+?)\);/gi)) {
    objects.push({ kind: "enum", name: match[1] });
    for (const value of match[2].matchAll(/'((?:''|[^'])*)'/g)) {
      objects.push({ kind: "enum-value", name: value[1].replace(/''/g, "'"), table: match[1] });
    }
  }
  for (const match of sql.matchAll(/ALTER TYPE\s+"([^"]+)"\s+ADD VALUE(?: IF NOT EXISTS)?\s+'([^']+)'/gi)) {
    objects.push({ kind: "enum-value", name: match[2], table: match[1] });
  }

  for (const match of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+"([^"]+)"\s*\(([\s\S]*?)\n\s*\);/gi)) {
    const table = match[1];
    objects.push({ kind: "table", name: table });
    for (const rawLine of match[2].split(/\r?\n/)) {
      const line = rawLine.trim().replace(/,$/, "");
      const column = line.match(/^"([^"]+)"\s+(.+)$/);
      if (column) {
        const type = column[2].split(/\s+(?:NOT NULL|DEFAULT)\b/i)[0].trim();
        objects.push({ kind: "column", table, name: column[1], detail: type });
      }
      const constraint = line.match(/^CONSTRAINT\s+"([^"]+)"\s+(.+)$/i);
      if (constraint) {
        objects.push({ kind: "constraint", table, name: constraint[1], detail: constraint[2] });
      }
    }
  }

  for (const statement of sql.matchAll(/ALTER TABLE\s+"([^"]+)"([\s\S]*?);/gi)) {
    const table = statement[1];
    const body = statement[2];
    for (const column of body.matchAll(/ADD COLUMN(?: IF NOT EXISTS)?\s+"([^"]+)"\s+([\s\S]*?)(?=,\s*(?:ADD|ALTER)|$)/gi)) {
      const type = column[2].split(/\s+(?:NOT NULL|DEFAULT)\b/i)[0].trim();
      objects.push({ kind: "column", table, name: column[1], detail: type });
    }
    for (const constraint of body.matchAll(/ADD CONSTRAINT\s+"([^"]+)"\s+([\s\S]*?)(?=,\s*(?:ADD|ALTER)|$)/gi)) {
      objects.push({
        kind: "constraint",
        table,
        name: constraint[1],
        detail: constraint[2].trim(),
      });
    }
    for (const nullable of body.matchAll(/ALTER COLUMN\s+"([^"]+)"\s+(SET|DROP) NOT NULL/gi)) {
      objects.push({
        kind: "column-nullability",
        table,
        name: nullable[1],
        detail: nullable[2].toUpperCase() === "SET" ? "NOT NULL" : "NULL",
      });
    }
    for (const defaultValue of body.matchAll(/ALTER COLUMN\s+"([^"]+)"\s+SET DEFAULT\s+([^,]+?)(?=,|$)/gi)) {
      objects.push({
        kind: "column-default",
        table,
        name: defaultValue[1],
        detail: defaultValue[2].trim(),
      });
    }
  }

  for (const index of sql.matchAll(
    /CREATE\s+(?:UNIQUE\s+)?INDEX(?: IF NOT EXISTS)?\s+"([^"]+)"\s+ON\s+"([^"]+)"/gi,
  )) {
    objects.push({ kind: "index", name: index[1], table: index[2] });
  }

  return uniqueObjects(objects);
}

export function classifyMigration(input: MigrationClassificationInput): MigrationClassification {
  if (input.expectedObjectCount === 0) return "UNKNOWN";
  if (!input.checksumMatches && input.hasSuccessfulHistory) return "CHECKSUM_MISMATCH";
  if (input.hasActiveFailure && !input.hasSuccessfulHistory) return "FAILED";

  const complete = input.validObjectCount === input.expectedObjectCount;
  const partiallyPresent = input.validObjectCount > 0;
  if (input.hasSuccessfulHistory) {
    return complete ? "APPLIED_VALID" : "APPLIED_SCHEMA_INCOMPLETE";
  }
  if (complete) return "APPLIED_HISTORY_MISSING";
  if (partiallyPresent) return "APPLIED_SCHEMA_INCOMPLETE";
  return "PENDING";
}

export function normalizeSqlDefinition(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/"/g, "")
    .replace(/::[a-z_\s\[\]"]+/g, "")
    .replace(/[()\s]/g, "")
    .replace(/;$/, "");
}

export function expectedTypeMatches(expectedType: string, actualType: string): boolean {
  const expected = expectedType.trim();
  const upper = expected.toUpperCase();
  const typeMap: Array<[RegExp, string]> = [
    [/^TEXT\[\]$/, "text[]"],
    [/^TEXT$/, "text"],
    [/^INTEGER$/, "integer"],
    [/^BOOLEAN$/, "boolean"],
    [/^DOUBLE PRECISION$/, "double precision"],
    [/^JSONB$/, "jsonb"],
    [/^TIMESTAMP\((\d+)\)$/, "timestamp($1) without time zone"],
    [/^(?:DECIMAL|NUMERIC)\((\d+),(\d+)\)$/, "numeric($1,$2)"],
    [/^VECTOR(?:\((\d+)\))?$/, "vector$1"],
  ];
  for (const [pattern, replacement] of typeMap) {
    if (pattern.test(upper)) {
      const normalizedExpected = upper.replace(pattern, replacement).toLowerCase();
      return normalizedExpected === actualType.toLowerCase();
    }
  }
  if (/^"[^"]+"$/.test(expected)) {
    return expected.replace(/"/g, "").toLowerCase() === actualType.replace(/"/g, "").toLowerCase();
  }
  return expected.toLowerCase() === actualType.toLowerCase();
}

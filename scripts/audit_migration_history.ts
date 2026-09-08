import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { assertSafeDatabase, type SafeDatabaseTarget } from "@/lib/database-safety";
import {
  classifyMigration,
  expectedTypeMatches,
  extractExpectedSchemaObjects,
  normalizeSqlDefinition,
  type ExpectedSchemaObject,
  type MigrationClassification,
} from "@/lib/migration-audit";

interface Options {
  execute: boolean;
  requireClean: boolean;
}

interface MigrationFile {
  name: string;
  path: string;
  checksum: string;
  expectedObjects: ExpectedSchemaObject[];
}

interface HistoryRow {
  id: string;
  checksum: string;
  migrationName: string;
  startedAt: Date;
  finishedAt: Date | null;
  rolledBackAt: Date | null;
  appliedStepsCount: number;
  logs: string | null;
}

interface TableRow {
  tableName: string;
}

interface ColumnRow {
  tableName: string;
  columnName: string;
  columnType: string;
  isNotNull: boolean;
  defaultValue: string | null;
}

interface EnumRow {
  enumName: string;
  enumValue: string;
}

interface IndexRow {
  tableName: string;
  indexName: string;
  definition: string;
}

interface ConstraintRow {
  tableName: string;
  constraintName: string;
  constraintType: string;
  definition: string;
}

interface ExtensionRow {
  extensionName: string;
  extensionVersion: string;
}

interface MigrationAuditRow {
  migrationName: string;
  fileChecksum: string;
  historyChecksums: string[];
  successfulAttempts: number;
  failedAttempts: number;
  expectedObjectCount: number;
  validObjectCount: number;
  problems: string[];
  classification: MigrationClassification;
}

const EXECUTE_DATABASES = new Set([
  "bookverse_ai_test",
  "bookverse_ai_full_deploy_rehearsal",
]);

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseOptions(args: string[]): Options {
  const unknown = args.filter(
    (argument) => argument.startsWith("--") && !["--execute", "--require-clean"].includes(argument),
  );
  if (unknown.length > 0) throw new Error("Flag không hỗ trợ: " + unknown.join(", "));
  return { execute: args.includes("--execute"), requireClean: args.includes("--require-clean") };
}

function assertExecuteTarget(target: SafeDatabaseTarget): void {
  if (target.databaseName === "bookverse_ai") {
    throw new Error("Migration audit execute bị cấm trên database demo bookverse_ai.");
  }
  if (!EXECUTE_DATABASES.has(target.databaseName)) {
    throw new Error(`Migration audit execute không cho phép target ${target.databaseName}.`);
  }
}

function redact(value: string): string {
  return value.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]");
}

function runPrisma(args: string[]): { exitCode: number; output: string } {
  const runner = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npx";
  const runnerArgs = process.platform === "win32" ? ["/d", "/s", "/c", "npx", ...args] : args;
  const result = spawnSync(runner, runnerArgs, {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: process.env,
    windowsHide: true,
  });
  return {
    exitCode: result.status ?? 1,
    output: redact([result.stdout ?? "", result.stderr ?? "", result.error?.message ?? ""].join("\n").trim()),
  };
}

async function loadMigrationFiles(): Promise<MigrationFile[]> {
  const root = path.resolve(process.cwd(), "prisma", "migrations");
  const entries = await readdir(root, { withFileTypes: true });
  const files: MigrationFile[] = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const migrationPath = path.join(root, entry.name, "migration.sql");
    const buffer = await readFile(migrationPath);
    const sql = buffer.toString("utf-8");
    files.push({
      name: entry.name,
      path: migrationPath,
      checksum: sha256(buffer),
      expectedObjects: extractExpectedSchemaObjects(sql),
    });
  }
  return files;
}

function parseForeignKey(value: string) {
  const normalized = value.replace(/"/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const match = normalized.match(
    /foreign key\s*\(([^)]+)\)\s*references\s+([^\s(]+)\s*\(([^)]+)\)([\s\S]*)/,
  );
  if (!match) return null;
  const tail = match[4];
  return {
    localColumns: match[1].replace(/\s/g, ""),
    foreignTable: match[2],
    foreignColumns: match[3].replace(/\s/g, ""),
    onDelete: tail.match(/on delete\s+(cascade|restrict|set null|set default|no action)/)?.[1] ?? "no action",
    onUpdate: tail.match(/on update\s+(cascade|restrict|set null|set default|no action)/)?.[1] ?? "no action",
  };
}

function constraintMatches(expected: string, actual: ConstraintRow): boolean {
  const expectedForeignKey = parseForeignKey(expected);
  const actualForeignKey = parseForeignKey(actual.definition);
  if (expectedForeignKey || actualForeignKey) {
    return JSON.stringify(expectedForeignKey) === JSON.stringify(actualForeignKey);
  }
  return normalizeSqlDefinition(expected) === normalizeSqlDefinition(actual.definition);
}

function validateObject(
  object: ExpectedSchemaObject,
  catalog: {
    tables: Map<string, TableRow>;
    columns: Map<string, ColumnRow>;
    enums: Map<string, Set<string>>;
    indexes: Map<string, IndexRow>;
    constraints: Map<string, ConstraintRow>;
    extensions: Map<string, ExtensionRow>;
  },
): string | null {
  if (object.kind === "extension") {
    return catalog.extensions.has(object.name) ? null : `missing extension ${object.name}`;
  }
  if (object.kind === "enum") {
    return catalog.enums.has(object.name) ? null : `missing enum ${object.name}`;
  }
  if (object.kind === "enum-value") {
    return catalog.enums.get(object.table ?? "")?.has(object.name)
      ? null
      : `missing enum value ${object.table}.${object.name}`;
  }
  if (object.kind === "table") {
    return catalog.tables.has(object.name) ? null : `missing table ${object.name}`;
  }
  if (object.kind === "column") {
    const key = `${object.table}.${object.name}`;
    const column = catalog.columns.get(key);
    if (!column) return `missing column ${key}`;
    return object.detail && !expectedTypeMatches(object.detail, column.columnType)
      ? `wrong type ${key}: expected=${object.detail}, actual=${column.columnType}`
      : null;
  }
  if (object.kind === "column-nullability") {
    const key = `${object.table}.${object.name}`;
    const column = catalog.columns.get(key);
    if (!column) return `missing column ${key}`;
    const expectedNotNull = object.detail === "NOT NULL";
    return column.isNotNull === expectedNotNull
      ? null
      : `wrong nullability ${key}: expected=${object.detail}`;
  }
  if (object.kind === "column-default") {
    const key = `${object.table}.${object.name}`;
    const column = catalog.columns.get(key);
    if (!column) return `missing column ${key}`;
    return column.defaultValue ? null : `missing default ${key}`;
  }
  if (object.kind === "index") {
    const index = catalog.indexes.get(object.name);
    return index && index.tableName === object.table ? null : `missing index ${object.name}`;
  }
  if (object.kind === "constraint") {
    const constraint = catalog.constraints.get(object.name);
    if (!constraint || constraint.tableName !== object.table) {
      return `missing constraint ${object.name}`;
    }
    return object.detail && !constraintMatches(object.detail, constraint)
      ? `wrong constraint ${object.name}: ${constraint.definition}`
      : null;
  }
  return `unknown object ${object.kind}:${object.name}`;
}

async function loadCatalog(client: PrismaClient) {
  const [tables, columns, enums, indexes, constraints, extensions] = await Promise.all([
    client.$queryRawUnsafe<TableRow[]>(`
      SELECT c.relname AS "tableName"
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') ORDER BY c.relname
    `),
    client.$queryRawUnsafe<ColumnRow[]>(`
      SELECT
        c.relname AS "tableName",
        a.attname AS "columnName",
        format_type(a.atttypid, a.atttypmod) AS "columnType",
        a.attnotnull AS "isNotNull",
        pg_get_expr(d.adbin, d.adrelid) AS "defaultValue"
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY c.relname, a.attnum
    `),
    client.$queryRawUnsafe<EnumRow[]>(`
      SELECT t.typname AS "enumName", e.enumlabel AS "enumValue"
      FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' ORDER BY t.typname, e.enumsortorder
    `),
    client.$queryRawUnsafe<IndexRow[]>(`
      SELECT tablename AS "tableName", indexname AS "indexName", indexdef AS definition
      FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname
    `),
    client.$queryRawUnsafe<ConstraintRow[]>(`
      SELECT
        c.relname AS "tableName",
        con.conname AS "constraintName",
        con.contype::text AS "constraintType",
        pg_get_constraintdef(con.oid, true) AS definition
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' ORDER BY con.conname
    `),
    client.$queryRawUnsafe<ExtensionRow[]>(`
      SELECT extname AS "extensionName", extversion AS "extensionVersion"
      FROM pg_extension ORDER BY extname
    `),
  ]);
  const enumMap = new Map<string, Set<string>>();
  for (const value of enums) {
    const values = enumMap.get(value.enumName) ?? new Set<string>();
    values.add(value.enumValue);
    enumMap.set(value.enumName, values);
  }
  return {
    raw: { tables, columns, enums, indexes, constraints, extensions },
    maps: {
      tables: new Map(tables.map((row) => [row.tableName, row])),
      columns: new Map(columns.map((row) => [`${row.tableName}.${row.columnName}`, row])),
      enums: enumMap,
      indexes: new Map(indexes.map((row) => [row.indexName, row])),
      constraints: new Map(constraints.map((row) => [row.constraintName, row])),
      extensions: new Map(extensions.map((row) => [row.extensionName, row])),
    },
  };
}

function auditMigrations(
  files: MigrationFile[],
  history: HistoryRow[],
  catalog: Awaited<ReturnType<typeof loadCatalog>>,
): MigrationAuditRow[] {
  return files.map((file) => {
    const attempts = history.filter((row) => row.migrationName === file.name);
    const successful = attempts.filter((row) => row.finishedAt && !row.rolledBackAt);
    const failed = attempts.filter((row) => !row.finishedAt && !row.rolledBackAt);
    const problems = file.expectedObjects
      .map((object) => validateObject(object, catalog.maps))
      .filter((problem): problem is string => Boolean(problem));
    const checksumMatches = successful.every((row) => row.checksum === file.checksum);
    const validObjectCount = file.expectedObjects.length - problems.length;
    return {
      migrationName: file.name,
      fileChecksum: file.checksum,
      historyChecksums: [...new Set(attempts.map((row) => row.checksum))],
      successfulAttempts: successful.length,
      failedAttempts: failed.length,
      expectedObjectCount: file.expectedObjects.length,
      validObjectCount,
      problems,
      classification: classifyMigration({
        expectedObjectCount: file.expectedObjects.length,
        validObjectCount,
        hasSuccessfulHistory: successful.length > 0,
        hasActiveFailure: failed.length > 0,
        checksumMatches,
      }),
    };
  });
}

async function loadHistory(client: PrismaClient): Promise<HistoryRow[]> {
  return client.$queryRawUnsafe<HistoryRow[]>(`
    SELECT
      id,
      checksum,
      migration_name AS "migrationName",
      started_at AS "startedAt",
      finished_at AS "finishedAt",
      rolled_back_at AS "rolledBackAt",
      applied_steps_count AS "appliedStepsCount",
      logs
    FROM "_prisma_migrations"
    ORDER BY started_at, id
  `);
}

async function writeReport(report: Record<string, unknown>): Promise<string> {
  const directory = path.resolve(process.cwd(), "outputs", "deployment");
  await mkdir(directory, { recursive: true });
  const stem = new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
  const reportPath = path.join(directory, `${stem}-migration-audit.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  return reportPath;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const target = assertSafeDatabase({
    operation: options.execute ? "destructive" : "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  if (options.execute) assertExecuteTarget(target);
  const client = new PrismaClient();
  try {
    const files = await loadMigrationFiles();
    let [history, catalog] = await Promise.all([loadHistory(client), loadCatalog(client)]);
    let audits = auditMigrations(files, history, catalog);
    const resolved: string[] = [];

    if (options.execute) {
      const eligible = audits.filter((audit) => audit.classification === "APPLIED_HISTORY_MISSING");
      for (const audit of eligible) {
        assertSafeDatabase({ operation: "destructive", databaseUrl: process.env.DATABASE_URL });
        assertExecuteTarget(target);
        const result = runPrisma(["prisma", "migrate", "resolve", "--applied", audit.migrationName]);
        if (result.exitCode !== 0) {
          throw new Error(`migrate resolve thất bại cho ${audit.migrationName}: ${result.output}`);
        }
        resolved.push(audit.migrationName);
      }
      history = await loadHistory(client);
      catalog = await loadCatalog(client);
      audits = auditMigrations(files, history, catalog);
    }

    const prismaStatus = runPrisma(["prisma", "migrate", "status"]);
    const clean =
      prismaStatus.exitCode === 0 && audits.every((audit) => audit.classification === "APPLIED_VALID");
    const catalogChecksum = sha256(JSON.stringify(catalog.raw));
    const report = {
      status: options.requireClean ? (clean ? "PASS" : "FAIL") : "AUDIT_COMPLETE",
      mode: options.execute ? "execute" : "read-only",
      databaseName: target.databaseName,
      generatedAt: new Date().toISOString(),
      migrationFileCount: files.length,
      migrationHistoryRowCount: history.length,
      schemaCatalogChecksum: catalogChecksum,
      schemaObjectCounts: {
        tables: catalog.raw.tables.length,
        columns: catalog.raw.columns.length,
        enums: new Set(catalog.raw.enums.map((row) => row.enumName)).size,
        indexes: catalog.raw.indexes.length,
        constraints: catalog.raw.constraints.length,
        extensions: catalog.raw.extensions.length,
      },
      classifications: Object.fromEntries(
        [...new Set(audits.map((audit) => audit.classification))]
          .sort()
          .map((classification) => [
            classification,
            audits.filter((audit) => audit.classification === classification).length,
          ]),
      ),
      migrations: audits,
      history: history.map((row) => ({
        id: row.id,
        migrationName: row.migrationName,
        checksum: row.checksum,
        startedAt: row.startedAt.toISOString(),
        finishedAt: row.finishedAt?.toISOString() ?? null,
        rolledBackAt: row.rolledBackAt?.toISOString() ?? null,
        appliedStepsCount: row.appliedStepsCount,
        hasLogs: Boolean(row.logs),
      })),
      prismaMigrateStatus: prismaStatus,
      resolved,
      clean,
    };
    const reportPath = await writeReport(report);
    console.log("[DATABASE] " + target.maskedUrl);
    console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
    console.log(JSON.stringify(report, null, 2));
    if (options.requireClean && !clean) {
      throw new Error("Migration audit chưa clean; xem report để biết classification/problematics.");
    }
  } finally {
    await client.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Lỗi migration audit không xác định.";
  console.error("[FAIL] " + redact(message));
  process.exitCode = 1;
});
